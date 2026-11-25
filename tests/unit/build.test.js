// @ts-check
/** @module build.test Unit tests for scripts/build.mjs (PKG-001, NFR-001 CSP part). */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { buildPage, versionText } from "../../scripts/build.mjs";

const srcDir = fileURLToPath(new URL("../../src", import.meta.url));
const dataDir = fileURLToPath(new URL("../../data", import.meta.url));
const holidayServiceBaseUrl = "https://holidays.example.test/api/v4";
const builtAt = new Date(Date.UTC(2026, 10, 18, 14, 32));
const mapOutlineFile = fileURLToPath(new URL("../../data/map-outline.svg", import.meta.url));

/**
 * Builds the page into a scratch folder and returns its text.
 * @param {string} [outlineText] Text of a map outline file to build with; the real one by default.
 */
async function buildToText(outlineText) {
  const scratch = await mkdtemp(path.join(tmpdir(), "zuno-build-"));
  try {
    const outFile = path.join(scratch, "zuno.html");
    let outlineFile = mapOutlineFile;
    if (outlineText !== undefined) {
      outlineFile = path.join(scratch, "outline.svg");
      await writeFile(outlineFile, outlineText);
    }
    await buildPage({
      srcDir,
      outFile,
      holidayServiceBaseUrl,
      mapOutlineFile: outlineFile,
      builtAt,
    });
    return await readFile(outFile, "utf8");
  } finally {
    await rm(scratch, { recursive: true });
  }
}

/** @param {string} text */
function sha256Source(text) {
  return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

/**
 * @param {string} html
 * @param {string} tag
 * @returns {string[]} The inner text of every `<tag>` element.
 */
function innerTexts(html, tag) {
  const pattern = new RegExp(String.raw`<${tag}(?:\s[^>]*)?>([\s\S]*?)</${tag}>`, "g");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

/** @param {string} html */
function cspDirectives(html) {
  const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.ok(meta, "the page has a Content-Security-Policy meta tag");
  return Object.fromEntries(
    meta[1]
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .map(([name, ...sources]) => [name, sources]),
  );
}

test("test_pkg_001_built_file_has_no_external_src_href_or_import", async () => {
  const html = await buildToText();
  assert.equal(innerTexts(html, "style").length, 1);
  assert.equal(innerTexts(html, "script").length, 1);
  assert.doesNotMatch(html, /\ssrc\s*=/i);
  // The tab icon (ICN-001) is the one href, and it is a data: URI.
  assert.doesNotMatch(html, /\shref\s*=\s*(?!["']data:)/i);
  assert.doesNotMatch(html, /\bimport\s*(\(|["'{*]|[\w$]+\s+from)/);
});

test("test_nfr_001_csp_allows_only_holiday_host_and_inline_hashes", async () => {
  const html = await buildToText();
  const csp = cspDirectives(html);
  assert.deepEqual(csp["default-src"], ["'none'"]);
  assert.deepEqual(csp["connect-src"], ["https://holidays.example.test"]);
  assert.deepEqual(csp["script-src"], [sha256Source(innerTexts(html, "script")[0])]);
  assert.deepEqual(csp["style-src"], [sha256Source(innerTexts(html, "style")[0])]);
});

test("test_pkg_001_icons_are_inlined_as_data_uris_and_csp_allows_data_images", async () => {
  const html = await buildToText();
  const style = innerTexts(html, "style")[0];
  assert.match(style, /url\(["']?data:image\/svg\+xml,/);
  assert.doesNotMatch(style, /url\((?!["']?data:)/);
  assert.deepEqual(cspDirectives(html)["img-src"], ["data:"]);
});

test("test_pkg_001_built_page_holds_the_outline_and_no_marker", async () => {
  const outline = '<path class="map-land" d="M1 2L3 4Z" />';
  const html = await buildToText(`${outline}
`);
  assert.ok(html.includes(outline), "the outline path is in the page");
  assert.doesNotMatch(html, /zuno:map-outline/);
  const real = await buildToText();
  assert.doesNotMatch(real, /zuno:map-outline/);
  assert.match(real, /<path class="map-land" d="M[^"]{20000,}"/);
});

test("test_ver_001_version_text_from_the_build_time_ex_026", () => {
  assert.equal(versionText(builtAt), "2026.11.18.1432");
  assert.equal(versionText(new Date(Date.UTC(2027, 0, 5, 3, 7))), "2027.01.05.0307");
});

test("test_ver_001_built_page_holds_the_version_and_no_marker", async () => {
  const html = await buildToText();
  assert.match(html, /Version\s+<span>2026\.11\.18\.1432<\/span>/);
  assert.doesNotMatch(html, /zuno:version/);
});

/** @param {string} html @returns {string[]} The `href` of every `<link rel="icon">`. */
function iconHrefs(html) {
  return [...html.matchAll(/<link rel="icon" type="image\/svg\+xml" href="([^"]*)">/g)].map(
    (match) => match[1],
  );
}

/**
 * Builds with a copy of the source folder whose theme.css is changed by `edit`.
 * @param {(css: string) => string} edit
 */
async function buildWithTheme(edit) {
  const scratch = await mkdtemp(path.join(tmpdir(), "zuno-icon-"));
  try {
    const copy = path.join(scratch, "src");
    await cp(srcDir, copy, { recursive: true });
    await cp(dataDir, path.join(scratch, "data"), { recursive: true });
    const themeFile = path.join(copy, "theme.css");
    await writeFile(themeFile, edit(await readFile(themeFile, "utf8")));
    await buildPage({
      srcDir: copy,
      outFile: path.join(scratch, "zuno.html"),
      holidayServiceBaseUrl,
      mapOutlineFile,
      builtAt,
    });
  } finally {
    await rm(scratch, { recursive: true });
  }
}

test("test_icn_001_build_writes_a_link_rel_icon_with_a_data_uri_after_the_title", async () => {
  const html = await buildToText();
  const hrefs = iconHrefs(html);
  assert.equal(hrefs.length, 1);
  assert.match(hrefs[0], /^data:image\/svg\+xml,/);
  assert.doesNotMatch(html, /zuno:icon/);
  assert.match(html, /<\/title>\s*<link rel="icon"/);
});

test("test_icn_001_the_icon_carries_the_two_colours_of_the_theme_tokens", async () => {
  const [href] = iconHrefs(await buildToText());
  const svg = decodeURIComponent(href.slice("data:image/svg+xml,".length));
  assert.ok(svg.includes("#00bcd4"), "the background colour is in the icon");
  assert.ok(svg.includes("#000000"), "the letter colour is in the icon");
  assert.doesNotMatch(svg, /\{\{/);
});

test("test_icn_001_build_fails_when_an_icon_token_is_missing_and_names_the_token", async () => {
  await assert.rejects(
    buildWithTheme((css) => css.replace(/--color-icon-letter:[^;]*;/, "")),
    /--color-icon-letter/,
  );
});

test("test_icn_001_build_fails_when_an_icon_token_is_not_a_six_digit_hex_colour", async () => {
  await assert.rejects(
    buildWithTheme((css) => css.replace(/(--color-icon-background:)[^;]*;/, "$1 red;")),
    /--color-icon-background/,
  );
});
