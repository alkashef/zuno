// @ts-check
/** @module import-rules.test Walks the imports under src/ and fails on a broken rule of design.md section 2.1 (DEC-007). */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../..", import.meta.url));
const importPattern =
  /(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;

/**
 * @param {string} dir Absolute folder.
 * @returns {string[]} Every `.js` file below it, as paths relative to the repo root with `/`.
 */
function listJsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(full);
    return entry.name.endsWith(".js") ? [path.relative(root, full).split(path.sep).join("/")] : [];
  });
}

/**
 * @param {string} source Module text.
 * @returns {string[]} The specifiers it imports.
 */
function specifiersOf(source) {
  return [...source.matchAll(importPattern)].map((match) => match[1] ?? match[2]);
}

/**
 * @param {string} file Importing file, relative to the repo root.
 * @param {string} specifier As written in the import.
 * @returns {string} The target relative to the repo root, or the specifier if it is not relative.
 */
function resolveTarget(file, specifier) {
  if (!specifier.startsWith(".")) return specifier;
  return path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
}

/**
 * @param {string} file Importing file, relative to the repo root.
 * @param {string} target Imported file, relative to the repo root.
 * @returns {boolean} Whether design.md section 2.1 allows this import.
 */
function isAllowed(file, target) {
  const inDomain = (/** @type {string} */ p) => p.startsWith("src/domain/");
  const leaves = [
    "src/api.js",
    "src/storage.js",
    "src/files.js",
    "src/clock.js",
    "src/log.js",
    "src/config.js",
  ];
  if (file === "src/main.js") return true;
  if (inDomain(file)) return inDomain(target) || target.startsWith("data/");
  if (file === "src/controller.js") return inDomain(target);
  if (file.startsWith("src/views/")) return target === "src/domain/format.js";
  if (file === "src/log.js") return target === "src/config.js";
  if (leaves.includes(file)) return ["src/config.js", "src/log.js"].includes(target);
  return false;
}

/**
 * @param {Record<string, string>} sources Module text keyed by repo-relative path.
 * @returns {string[]} One line per import that breaks a rule.
 */
function findViolations(sources) {
  return Object.entries(sources).flatMap(([file, source]) =>
    specifiersOf(source)
      .map((specifier) => resolveTarget(file, specifier))
      .filter((target) => !isAllowed(file, target))
      .map((target) => `${file} must not import ${target}`),
  );
}

test("test_import_rules_domain_imports_only_domain_and_data", () => {
  const files = listJsFiles(path.join(root, "src"));
  const sources = Object.fromEntries(
    files.map((file) => [file, readFileSync(path.join(root, file), "utf8")]),
  );
  assert.ok(Object.keys(sources).includes("src/domain/zones.js"));
  assert.deepEqual(findViolations(sources), []);
});

test("test_import_rules_broken_rules_are_reported", () => {
  const sources = {
    "src/domain/zones.js": 'import { log } from "../log.js";',
    "src/controller.js": 'import { now } from "./clock.js";',
    "src/views/map.js": 'import { holidayOn } from "../domain/holidays.js";',
    "src/clock.js": 'import { x } from "./domain/zones.js";',
    "src/files.js": 'import { x } from "./controller.js";',
    "src/domain/format.js": 'import { y } from "./zones.js"; import "lodash";',
    "src/main.js": 'import { z } from "./domain/zones.js";',
  };
  assert.deepEqual(findViolations(sources), [
    "src/domain/zones.js must not import src/log.js",
    "src/controller.js must not import src/clock.js",
    "src/views/map.js must not import src/domain/holidays.js",
    "src/clock.js must not import src/domain/zones.js",
    "src/files.js must not import src/controller.js",
    "src/domain/format.js must not import lodash",
  ]);
});
