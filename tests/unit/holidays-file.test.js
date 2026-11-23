// @ts-check
/** @module holidays-file.test Unit tests for src/domain/holidays-file.js (HOL-010, HOL-016, EX-031, DEC-032). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createCustomPlace, createPlace } from "../../src/domain/places.js";
import { parse } from "../../src/domain/csv.js";
import { toCsv } from "../../src/domain/holidays-file.js";

/** The text of the page's example, found in the markup the build reads. */
const pageSource = readFileSync(new URL("../../src/index.html", import.meta.url), "utf8");

const bom = String.fromCharCode(0xfeff);
const header = "Type,Country,Place,Start date,End date,Name";
const diwali = { countryCode: "IN", date: "2026-11-08", name: "Diwali" };
const christmas = { countryCode: "US", date: "2026-12-25", name: "Christmas Day" };

/** @returns {import("../../src/domain/places.js").Place} Sara of EX-031, with her winter break. */
function sara() {
  const place = createCustomPlace("place-1", {
    name: "Sara",
    zone: "Europe/Lisbon",
    countryCode: "PT",
  });
  const winter = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };
  return { ...place, vacations: [winter] };
}

/**
 * @param {string} text A file as `toCsv` writes it.
 * @returns {string[][]} Its rows, after checking the byte-order mark.
 */
function rowsOf(text) {
  assert.ok(text.startsWith(bom), "the file starts with a byte-order mark");
  const rows = parse(text);
  assert.notEqual(rows, null);
  return /** @type {string[][]} */ (rows);
}

test("test_hol_010_to_csv_writes_one_row_per_entry_ex_031", () => {
  const userHolidays = { version: /** @type {const} */ (1), added: [diwali], hidden: [christmas] };
  const text = toCsv({ userHolidays, places: [sara()] });
  assert.equal(
    text,
    [
      `${bom}${header}`,
      "holiday,India,,08-Nov-26,,Diwali",
      "hidden holiday,United States,,25-Dec-26,,Christmas Day",
      "vacation,,Sara,21-Dec-26,31-Dec-26,Winter break",
      "",
    ].join("\r\n"),
  );
});

test("test_hol_010_a_hidden_holiday_row_keeps_its_name", () => {
  const userHolidays = { version: /** @type {const} */ (1), added: [], hidden: [christmas] };
  const rows = rowsOf(toCsv({ userHolidays, places: [] }));
  assert.deepEqual(rows[1], [
    "hidden holiday",
    "United States",
    "",
    "25-Dec-26",
    "",
    "Christmas Day",
  ]);
});

test("test_hol_010_dates_are_dd_mmm_yy_and_countries_are_english_names", () => {
  const later = { countryCode: "PK", date: "2026-03-23", name: "Pakistan Day" };
  const earlier = { countryCode: "PK", date: "2026-02-05", name: "Kashmir Day, shared" };
  const userHolidays = {
    version: /** @type {const} */ (1),
    added: [diwali, later, earlier],
    hidden: [],
  };
  const places = [createPlace("place-1", "mumbai"), sara()];
  const rows = rowsOf(toCsv({ userHolidays, places }));
  assert.deepEqual(
    rows.map((row) => row.slice(1, 4)),
    [
      ["Country", "Place", "Start date"],
      ["India", "", "08-Nov-26"],
      ["Pakistan", "", "05-Feb-26"],
      ["Pakistan", "", "23-Mar-26"],
      ["", "Sara", "21-Dec-26"],
    ],
  );
  assert.equal(rows[2][5], "Kashmir Day, shared");
});

test("test_hol_016_the_example_on_the_page_equals_the_to_csv_output_of_ex_031", () => {
  const found = pageSource.match(/<pre[^>]*data-role="file-example"[^>]*>([\s\S]*?)<\/pre>/);
  assert.notEqual(found, null, "the page has an example in a <pre data-role=file-example>");
  const example = /** @type {RegExpMatchArray} */ (found)[1].trim().split(/\r?\n/);
  const userHolidays = { version: /** @type {const} */ (1), added: [diwali], hidden: [christmas] };
  const written = toCsv({ userHolidays, places: [sara()] });
  assert.deepEqual(example, written.slice(1).trim().split("\r\n"));
});
