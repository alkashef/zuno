// @ts-check
/** @module format.test Unit tests for src/domain/format.js (DSP-001 to DSP-003, PCK-007, PCK-009, SET-016, EX-005, EX-006). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatClock,
  formatDate,
  formatDateRange,
  formatDayNames,
  formatHijri,
  formatIsoDate,
  formatMonth,
  formatOffset,
  formatTime,
  formatWeekday,
} from "../../src/domain/format.js";

/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @returns {import("../../src/domain/zones.js").LocalDateTime}
 */
function local(year, month, day, hour, minute) {
  return { year, month, day, hour, minute };
}

test("test_dsp_001_date_is_dd_mmm_yy_ex_005", () => {
  assert.equal(formatDate(local(2026, 11, 16, 0, 0)), "16-Nov-26");
});

test("test_dsp_001_day_and_year_have_two_digits_and_month_is_three_letters", () => {
  assert.equal(formatDate(local(2005, 9, 5, 0, 0)), "05-Sep-05");
  assert.equal(formatDate(local(2026, 1, 31, 0, 0)), "31-Jan-26");
  assert.equal(formatDate(local(2030, 12, 1, 0, 0)), "01-Dec-30");
});

test("test_dsp_002_time_is_12_hour_uppercase_ex_006", () => {
  assert.equal(formatTime(local(2026, 11, 16, 9, 25)), "9:25 AM");
  assert.equal(formatTime(local(2026, 11, 16, 15, 0)), "3:00 PM");
});

test("test_dsp_002_midnight_and_noon_show_12", () => {
  assert.equal(formatTime(local(2026, 11, 16, 0, 0)), "12:00 AM");
  assert.equal(formatTime(local(2026, 11, 16, 0, 5)), "12:05 AM");
  assert.equal(formatTime(local(2026, 11, 16, 12, 0)), "12:00 PM");
  assert.equal(formatTime(local(2026, 11, 16, 23, 59)), "11:59 PM");
});

test("test_dsp_003_hijri_date_format_dd_month_yyyy", () => {
  assert.equal(formatHijri({ day: 6, month: "Jumada II", year: 1448 }), "06-Jumada II-1448");
  assert.equal(formatHijri({ day: 21, month: "Rajab", year: 1448 }), "21-Rajab-1448");
});

test("test_dsp_002_clock_shows_the_instant_in_the_browsers_zone_with_its_date", () => {
  // Built from local-time parts, so the result does not depend on the machine's zone.
  assert.equal(formatClock(new Date(2026, 10, 16, 9, 25).getTime()), "9:25 AM · 16-Nov-26");
  assert.equal(formatClock(new Date(2026, 10, 16, 23, 5).getTime()), "11:05 PM · 16-Nov-26");
});

test("test_pck_007_month_title_is_full_english_month_and_year", () => {
  assert.equal(formatMonth({ year: 2026, month: 11 }), "November 2026");
  assert.equal(formatMonth({ year: 2027, month: 1 }), "January 2027");
});

test("test_dsp_003_hijri_month_band_text", async () => {
  const { formatHijriMonth } = await import("../../src/domain/format.js");
  assert.equal(formatHijriMonth({ day: 6, month: "Jumada II", year: 1448 }), "Jumada II-1448");
});

test("test_nfr_003_weekday_is_two_english_letters", () => {
  assert.equal(formatWeekday({ year: 2026, month: 11, day: 16 }), "Mo");
  assert.equal(formatWeekday({ year: 2026, month: 11, day: 22 }), "Su");
});

test("test_pck_002_offset_from_utc_with_sign_hours_and_minutes", () => {
  const hour = 60 * 60 * 1000;
  assert.equal(formatOffset(0), "UTC+0");
  assert.equal(formatOffset(3 * hour), "UTC+3");
  assert.equal(formatOffset(5.5 * hour), "UTC+5:30");
  assert.equal(formatOffset(-5 * hour), "UTC−5");
  assert.equal(formatOffset(-3.5 * hour), "UTC−3:30");
});

test("test_set_016_day_numbers_are_spelled_as_english_names", () => {
  assert.equal(formatDayNames([6, 7]), "Saturday and Sunday");
  assert.equal(formatDayNames([5, 6]), "Friday and Saturday");
  assert.equal(formatDayNames([7]), "Sunday");
  assert.equal(formatDayNames([1, 2, 7]), "Monday, Tuesday, and Sunday");
});

test("test_pck_009_date_range_is_one_date_or_first_and_last_with_an_en_dash", () => {
  const nov20 = { year: 2026, month: 11, day: 20 };
  assert.equal(formatDateRange(nov20, nov20), "20-Nov-26");
  assert.equal(formatDateRange(nov20, { year: 2026, month: 11, day: 21 }), "20–21-Nov-26");
  assert.equal(
    formatDateRange({ year: 2026, month: 11, day: 30 }, { year: 2026, month: 12, day: 1 }),
    "30-Nov-26 – 01-Dec-26",
  );
  assert.equal(
    formatDateRange({ year: 2026, month: 12, day: 31 }, { year: 2027, month: 1, day: 1 }),
    "31-Dec-26 – 01-Jan-27",
  );
  assert.equal(
    formatDateRange({ year: 2025, month: 11, day: 30 }, { year: 2026, month: 11, day: 1 }),
    "30-Nov-25 – 01-Nov-26",
  );
});

test("test_dsp_001_format_iso_date_gives_dd_mmm_yy", () => {
  assert.equal(formatIsoDate("2026-12-21"), "21-Dec-26");
  assert.equal(formatIsoDate("2005-09-05"), "05-Sep-05");
});
