// @ts-check
/** @module holidays.test Unit tests for src/domain/holidays.js (HOL-003, HOL-004, SET-006, EX-004). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  holidayOn,
  listRegions,
  placesMissingRegionalData,
  toHolidays,
  unavailableCountries,
} from "../../src/domain/holidays.js";
import { serviceRecord, usRecords2026 } from "./holiday-fixtures.js";

test("test_hol_003_only_public_type_kept_and_region_added_when_chosen", () => {
  const holidays = toHolidays(usRecords2026());
  assert.deepEqual(
    holidays.map((holiday) => holiday.name),
    ["Christmas Day", "Good Friday"],
  );
  assert.equal(holidayOn(holidays, "US-NC", "2026-04-03")?.name, "Good Friday");
  assert.equal(holidayOn(holidays, "US-NY", "2026-04-03"), null);
  assert.equal(holidayOn(holidays, "US-NY", "2026-12-25")?.name, "Christmas Day");
});

test("test_hol_003_regions_are_listed_sorted_without_repeats", () => {
  const records = [
    serviceRecord("2026-04-03", "Good Friday", ["Public"], ["US-NC", "US-CT"]),
    serviceRecord("2026-07-01", "Founding Day", ["Public"], ["US-CT"]),
  ];
  assert.deepEqual(listRegions(toHolidays(records)), ["US-CT", "US-NC"]);
});

test("test_set_006_no_region_uses_national_holidays_only", () => {
  const holidays = toHolidays(usRecords2026());
  assert.equal(holidayOn(holidays, "", "2026-12-25")?.name, "Christmas Day");
  assert.equal(holidayOn(holidays, "", "2026-04-03"), null);
});

test("test_hol_004_missing_regional_data_reports_place_and_shows_national", () => {
  const nationalOnly = { status: /** @type {const} */ ("loaded"), holidays: [usRecords2026()[0]] };
  const withRegions = { status: /** @type {const} */ ("loaded"), holidays: usRecords2026() };
  const places = [
    { id: "a", countryCode: "US", region: "US-NC" },
    { id: "b", countryCode: "GB", region: "GB-SCT" },
    { id: "c", countryCode: "GB", region: "" },
  ];
  const missing = placesMissingRegionalData(places, { US: withRegions, GB: nationalOnly });
  assert.deepEqual(
    missing.map((place) => place.id),
    ["b"],
  );
  const holidays = toHolidays(nationalOnly.holidays);
  assert.equal(holidayOn(holidays, "GB-SCT", "2026-12-25")?.name, "Christmas Day");
});

test("test_ref_002_unavailable_countries_are_listed", () => {
  const unavailable = { status: /** @type {const} */ ("unavailable"), reason: "offline" };
  const loaded = { status: /** @type {const} */ ("loaded"), holidays: [] };
  assert.deepEqual(unavailableCountries({ US: loaded, SA: unavailable, JP: unavailable }), [
    "JP",
    "SA",
  ]);
});

test("test_ex_004_us_christmas_2026_is_public_holiday", () => {
  const holidays = toHolidays(usRecords2026());
  assert.equal(holidayOn(holidays, "", "2026-12-25")?.name, "Christmas Day");
});
