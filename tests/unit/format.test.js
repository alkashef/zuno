// @ts-check
/** @module format.test Unit tests for src/domain/format.js (DSP-001 to DSP-003, EX-005, EX-006). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { formatDate, formatHijri, formatTime } from "../../src/domain/format.js";

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
