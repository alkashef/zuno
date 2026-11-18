// @ts-check
/** @module holiday-table.test Unit tests for src/domain/holiday-table.js (HOL-013, NFR-003, EX-022). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { isTableCountry, tableHolidays } from "../../src/domain/holiday-table.js";

const tableCountries = ["IN", "IL", "MY", "PK", "SA", "TW", "AE"];
const tableYears = [2026, 2027, 2028];

test("test_hol_013_table_covers_seven_countries_for_2026_to_2028", () => {
  for (const code of tableCountries) {
    assert.equal(isTableCountry(code), true, code);
    for (const year of tableYears) {
      const holidays = tableHolidays(code, year);
      assert.ok(holidays !== null && holidays.length > 0, `${code} ${year}`);
      assert.ok(holidays.every((holiday) => holiday.date.startsWith(`${year}-`)));
      assert.ok(holidays.every((holiday) => holiday.regions.length === 0));
    }
  }
  assert.equal(isTableCountry("DE"), false);
  assert.equal(isTableCountry("HK"), false);
});

test("test_hol_013_riyadh_and_new_delhi_dates_ex_022", () => {
  const saudi = tableHolidays("SA", 2026) ?? [];
  const india = tableHolidays("IN", 2026) ?? [];
  assert.deepEqual(
    saudi.find((holiday) => holiday.date === "2026-09-23"),
    { date: "2026-09-23", name: "National Day", regions: [] },
  );
  assert.deepEqual(
    india.find((holiday) => holiday.date === "2026-01-26"),
    { date: "2026-01-26", name: "Republic Day", regions: [] },
  );
});

test("test_hol_013_holidays_are_sorted_by_date", () => {
  const dates = (tableHolidays("SA", 2027) ?? []).map((holiday) => holiday.date);
  assert.deepEqual(dates, [...dates].sort());
});

test("test_hol_013_year_outside_the_table_gives_null", () => {
  assert.equal(tableHolidays("SA", 2025), null);
  assert.equal(tableHolidays("SA", 2029), null);
});

test("test_hol_013_country_outside_the_table_throws", () => {
  assert.throws(() => tableHolidays("DE", 2026), /DE/);
});

test("test_nfr_003_table_names_are_english", () => {
  const latinText = /^[\p{Script=Latin}\p{Lm}\d\s\p{P}]+$/u;
  for (const code of tableCountries) {
    for (const year of tableYears) {
      for (const holiday of tableHolidays(code, year) ?? []) {
        assert.match(holiday.name, latinText, `${code} ${holiday.date}`);
      }
    }
  }
});
