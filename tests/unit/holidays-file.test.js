// @ts-check
/** @module holidays-file.test Unit tests for src/domain/holidays-file.js (HOL-010, HOL-012, HOL-016, HOL-017, EX-018, EX-031, EX-032, DEC-032). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createCustomPlace, createPlace } from "../../src/domain/places.js";
import { parse } from "../../src/domain/csv.js";
import { planImport, toCsv } from "../../src/domain/holidays-file.js";

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

/**
 * @param {...string} lines The data rows of a file.
 * @returns {string} A file with the header row and those rows.
 */
function fileOf(...lines) {
  return [header, ...lines, ""].join("\r\n");
}

/** @returns {import("../../src/domain/places.js").Place[]} Sara and London, the places of EX-032. */
function saraAndLondon() {
  return [sara(), createPlace("place-2", "london")];
}

test("test_hol_012_the_text_hello_is_refused_ex_018", () => {
  assert.deepEqual(planImport("hello", { places: [] }), { status: "refused" });
  assert.deepEqual(planImport("", { places: [] }), { status: "refused" });
  assert.deepEqual(planImport('a,"b', { places: [] }), { status: "refused" });
});

test("test_hol_012_a_file_without_the_header_row_is_refused", () => {
  assert.deepEqual(planImport("holiday,India,,08-Nov-26,,Diwali\r\n", { places: [] }), {
    status: "refused",
  });
  assert.deepEqual(planImport("Type,Country,Place,Start date,End date\r\n", { places: [] }), {
    status: "refused",
  });
  const shuffled = "Country,Type,Place,Start date,End date,Name\r\n";
  assert.deepEqual(planImport(shuffled, { places: [] }), { status: "refused" });
});

test("test_hol_012_an_old_json_file_is_refused", () => {
  const json = JSON.stringify({ version: 1, added: [diwali], hidden: [] });
  assert.deepEqual(planImport(json, { places: [] }), { status: "refused" });
});

test("test_hol_012_the_header_is_read_with_a_byte_order_mark_spaces_and_any_case", () => {
  const loose = `${bom}type, COUNTRY ,place,Start Date,end date,NAME\r\n`;
  const plan = planImport(loose, { places: [] });
  assert.equal(plan.status, "plan");
});

test("test_hol_017_the_plan_counts_importable_rows_out_of_the_total_and_names_the_missing_place_ex_032", () => {
  const text = fileOf(
    "holiday,India,,08-Nov-26,,Diwali",
    "vacation,,Sara,21-Dec-26,31-Dec-26,Winter break",
    "vacation,,Sara,01-Aug-26,15-Aug-26,Summer",
    "vacation,,Omar,01-Jan-27,05-Jan-27,Trip",
  );
  assert.deepEqual(planImport(text, { places: saraAndLondon() }), {
    status: "plan",
    total: 4,
    rows: [
      { type: "holiday", entry: diwali },
      {
        type: "vacation",
        placeId: "place-1",
        vacation: { start: "2026-12-21", end: "2026-12-31", label: "Winter break" },
      },
      {
        type: "vacation",
        placeId: "place-1",
        vacation: { start: "2026-08-01", end: "2026-08-15", label: "Summer" },
      },
    ],
    missingPlaces: ["Omar"],
    invalid: 0,
  });
});

test("test_hol_017_a_missing_place_is_named_once_and_a_place_matches_by_name_in_any_case", () => {
  const text = fileOf(
    "vacation,,omar,01-Jan-27,05-Jan-27,A",
    "vacation,,Omar,06-Jan-27,07-Jan-27,B",
    "vacation,,  LONDON ,06-Jan-27,07-Jan-27,B",
  );
  const plan = planImport(text, { places: saraAndLondon() });
  assert.equal(plan.status === "plan" && plan.missingPlaces.length, 1);
  assert.equal(plan.status === "plan" && plan.rows.length, 1);
  assert.equal(
    plan.status === "plan" && plan.rows[0].type === "vacation" && plan.rows[0].placeId,
    "place-2",
  );
});

test("test_hol_017_an_invalid_row_counts_apart", () => {
  const text = fileOf(
    "holiday,India,,08-Nov-26,,Diwali",
    "party,India,,08-Nov-26,,Diwali",
    "holiday,Atlantis,,08-Nov-26,,Lost",
    "holiday,India,,31-Feb-26,,Never",
    "holiday,India,,08-Nov-26,,   ",
    "hidden holiday,India,,not a date,,Diwali",
    "vacation,,Sara,31-Dec-26,21-Dec-26,Backwards",
    "vacation,,Sara,21-Dec-26,,No end",
    "holiday,India",
    "",
    "hidden holiday,United States,,25-Dec-26,,Christmas Day",
  );
  const plan = planImport(text, { places: saraAndLondon() });
  assert.equal(plan.status, "plan");
  assert.deepEqual(
    plan.status === "plan" && [plan.total, plan.rows.length, plan.invalid],
    [10, 2, 8],
  );
  assert.deepEqual(plan.status === "plan" && plan.rows[1], {
    type: "hiddenHoliday",
    entry: christmas,
  });
  assert.deepEqual(plan.status === "plan" && plan.missingPlaces, []);
});

test("test_hol_017_dates_are_read_as_d_mmm_yy_and_d_mmm_yyyy", () => {
  const text = fileOf(
    "holiday,India,,8-nov-26,,Short",
    "holiday,India,,08-NOV-2026,,Long",
    "holiday,India,,08-Sep-26,,September",
    "holiday,India,,08-Sept-26,,Not a month",
    "holiday,India,,2026-11-08,,Iso",
  );
  const plan = planImport(text, { places: [] });
  assert.deepEqual(
    plan.status === "plan" && plan.rows.map((row) => row.type === "holiday" && row.entry.date),
    ["2026-11-08", "2026-11-08", "2026-09-08"],
  );
  assert.equal(plan.status === "plan" && plan.invalid, 2);
});

test("test_hol_017_a_country_is_read_by_name_or_by_two_letter_code", () => {
  const text = fileOf(
    "holiday,india,,08-Nov-26,,By name in lower case",
    "holiday,IN,,09-Nov-26,,By code",
    "holiday,in,,10-Nov-26,,By code in lower case",
    "holiday,XX,,11-Nov-26,,Not a country",
  );
  const plan = planImport(text, { places: [] });
  assert.deepEqual(
    plan.status === "plan" &&
      plan.rows.map((row) => row.type === "holiday" && row.entry.countryCode),
    ["IN", "IN", "IN"],
  );
  assert.equal(plan.status === "plan" && plan.invalid, 1);
});

test("test_hol_017_the_plan_reads_what_to_csv_wrote", () => {
  const userHolidays = { version: /** @type {const} */ (1), added: [diwali], hidden: [christmas] };
  const places = [sara()];
  const plan = planImport(toCsv({ userHolidays, places }), { places });
  assert.deepEqual(
    plan.status === "plan" && [plan.total, plan.rows.length, plan.invalid],
    [3, 3, 0],
  );
});
