// @ts-check
/**
 * @module build
 * Builds the one-file page dist/zuno.html (PKG-001, DEC-002, DEC-012). Bundles src/main.js and
 * src/styles.css with esbuild (the logo becomes a data URI inside the CSS), inlines both into
 * src/index.html, and adds a Content-Security-Policy tag
 * that allows only the inline script and style, data-URI images and the holiday host. It does not run the page or
 * read any setting except through the command-line entry at the bottom.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

/**
 * @typedef {object} BuildOptions
 * @property {string} srcDir Folder with index.html, main.js and styles.css.
 * @property {string} outFile Path of the built HTML file.
 * @property {string} holidayServiceBaseUrl Base URL of the holiday service.
 */

/**
 * @param {string} srcDir
 * @returns {Promise<{ script: string, style: string }>} The bundled JavaScript and CSS text
 *   (styles.css and any CSS it imports).
 */
async function bundle(srcDir) {
  const result = await build({
    entryPoints: [path.join(srcDir, "main.js"), path.join(srcDir, "styles.css")],
    bundle: true,
    format: "iife",
    write: false,
    loader: { ".jpg": "dataurl" },
    outdir: path.join(srcDir, "out"),
    logLevel: "silent",
  });
  /** @param {string} extension */
  const textOf = (extension) =>
    result.outputFiles.find((file) => file.path.endsWith(extension))?.text ?? "";
  return { script: textOf(".js"), style: textOf(".css") };
}

/** @param {string} text */
function sha256Source(text) {
  return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

/**
 * @param {string} script
 * @param {string} style
 * @param {string} holidayServiceBaseUrl
 * @returns {string} The Content-Security-Policy meta tag.
 */
function cspTag(script, style, holidayServiceBaseUrl) {
  const directives = [
    "default-src 'none'",
    `connect-src ${new URL(holidayServiceBaseUrl).origin}`,
    "img-src data:",
    `script-src ${sha256Source(script)}`,
    `style-src ${sha256Source(style)}`,
  ];
  return `<meta http-equiv="Content-Security-Policy" content="${directives.join("; ")}">`;
}

/**
 * Writes the one-file page.
 * @param {BuildOptions} options
 */
export async function buildPage({ srcDir, outFile, holidayServiceBaseUrl }) {
  const { script: rawScript, style } = await bundle(srcDir);
  // A literal "</script" inside the bundle would end the element early.
  const script = rawScript.replaceAll("</script", "<\\/script");
  const template = await readFile(path.join(srcDir, "index.html"), "utf8");
  const html = template
    .replace("<!--zuno:csp-->", () => cspTag(script, style, holidayServiceBaseUrl))
    .replace("<!--zuno:style-->", () => `<style>${style}</style>`)
    .replace("<!--zuno:script-->", () => `<script>${script}</script>`);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, html);
}

/** Runs the build for the repository when this file is started from the command line. */
async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { config } = await import(pathToFileURL(path.join(root, "src", "config.js")).href);
  await buildPage({
    srcDir: path.join(root, "src"),
    outFile: path.join(root, "dist", "zuno.html"),
    holidayServiceBaseUrl: config.holidayServiceBaseUrl,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
