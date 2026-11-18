// @ts-check
/** @module build.test Unit tests for scripts/build.mjs (PKG-001, NFR-001 CSP part). */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { buildPage } from "../../scripts/build.mjs";

const srcDir = fileURLToPath(new URL("../../src", import.meta.url));
const holidayServiceBaseUrl = "https://holidays.example.test/api/v4";

/** Builds the page into a scratch folder and returns its text. */
async function buildToText() {
  const scratch = await mkdtemp(path.join(tmpdir(), "zuno-build-"));
  try {
    const outFile = path.join(scratch, "zuno.html");
    await buildPage({ srcDir, outFile, holidayServiceBaseUrl });
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
  assert.doesNotMatch(html, /\shref\s*=/i);
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
