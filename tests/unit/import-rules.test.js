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
  /** @type {Record<string, string>} Data files that one domain module alone may read. */
  const dataOwners = {
    "data/cities.js": "src/domain/cities.js",
    "data/holiday-table.js": "src/domain/holiday-table.js",
    "data/zone-table.js": "src/domain/zone-table.js",
  };
  if (target in dataOwners) return file === dataOwners[target];
  const subControllers = ["src/controller-holidays.js", "src/controller-places.js"];
  if (subControllers.includes(target)) return file === "src/controller.js";
  if (file === "src/main.js") return true;
  if (inDomain(file)) return inDomain(target) || target.startsWith("data/");
  if (file === "src/controller.js") return inDomain(target);
  if (subControllers.includes(file)) return inDomain(target);
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
    "src/controller-holidays.js":
      'import { c } from "./clock.js"; import { h } from "./controller.js";',
    "src/views/notices.js": 'import { n } from "../controller-holidays.js";',
  };
  assert.deepEqual(findViolations(sources), [
    "src/domain/zones.js must not import src/log.js",
    "src/controller.js must not import src/clock.js",
    "src/views/map.js must not import src/domain/holidays.js",
    "src/clock.js must not import src/domain/zones.js",
    "src/files.js must not import src/controller.js",
    "src/domain/format.js must not import lodash",
    "src/controller-holidays.js must not import src/clock.js",
    "src/controller-holidays.js must not import src/controller.js",
    "src/views/notices.js must not import src/controller-holidays.js",
  ]);
});

test("test_import_rules_only_the_holiday_table_module_imports_the_holiday_table", () => {
  const sources = {
    "src/domain/holiday-table.js": 'import { holidayTable } from "../../data/holiday-table.js";',
    "src/domain/holidays.js": 'import { holidayTable } from "../../data/holiday-table.js";',
    "src/controller.js": 'import { holidayTable } from "../data/holiday-table.js";',
  };
  assert.deepEqual(findViolations(sources), [
    "src/domain/holidays.js must not import data/holiday-table.js",
    "src/controller.js must not import data/holiday-table.js",
  ]);
});

test("test_import_rules_only_the_controller_imports_the_holiday_controller_and_it_imports_domain_only", () => {
  const sources = {
    "src/controller.js": 'import { holidayAt } from "./controller-holidays.js";',
    "src/controller-holidays.js": 'import { toHolidays } from "./domain/holidays.js";',
  };
  assert.deepEqual(findViolations(sources), []);
});

test("test_import_rules_only_the_zone_table_module_imports_the_zone_table", () => {
  const sources = {
    "src/domain/zone-table.js": 'import { zones } from "../../data/zone-table.js";',
    "src/domain/places.js": 'import { zones } from "../../data/zone-table.js";',
    "src/main.js": 'import { zones } from "../data/zone-table.js";',
  };
  assert.deepEqual(findViolations(sources), [
    "src/domain/places.js must not import data/zone-table.js",
    "src/main.js must not import data/zone-table.js",
  ]);
});

test("test_import_rules_only_the_controller_imports_the_place_controller_and_it_imports_domain_only", () => {
  const sources = {
    "src/controller.js": 'import { placeHandlers } from "./controller-places.js";',
    "src/controller-places.js":
      'import { addPlace } from "./domain/places.js"; import { s } from "./storage.js";',
    "src/main.js": 'import { placeHandlers } from "./controller-places.js";',
  };
  assert.deepEqual(findViolations(sources), [
    "src/controller-places.js must not import src/storage.js",
    "src/main.js must not import src/controller-places.js",
  ]);
});
