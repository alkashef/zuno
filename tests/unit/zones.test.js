// @ts-check
/** @module zones.test Unit tests for src/domain/zones.js (CLK-001, CLK-002, PCK-006, PCK-007, EX-001). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { instantAtLocal, localDateTime, offsetChange, zoneOffset } from "../../src/domain/zones.js";

/**
 * @param {number} year
 * @param {number} month 1 to 12.
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @returns {number} UTC milliseconds.
 */
function utc(year, month, day, hour, minute) {
  return Date.UTC(year, month - 1, day, hour, minute);
}

test("test_clk_001_local_date_and_time_for_zone", () => {
  assert.deepEqual(localDateTime(utc(2026, 11, 16, 20, 0), "Asia/Tokyo"), {
    year: 2026,
    month: 11,
    day: 17,
    hour: 5,
    minute: 0,
  });
  assert.deepEqual(localDateTime(utc(2026, 7, 1, 12, 30), "Asia/Riyadh"), {
    year: 2026,
    month: 7,
    day: 1,
    hour: 15,
    minute: 30,
  });
});

test("test_clk_001_midnight_is_hour_zero_not_24", () => {
  const local = localDateTime(utc(2026, 11, 16, 0, 0), "UTC");
  assert.equal(local.hour, 0);
  assert.equal(local.day, 16);
});

test("test_clk_002_london_dst_offsets_ex_001", () => {
  const summer = localDateTime(utc(2026, 7, 1, 12, 0), "Europe/London");
  const winter = localDateTime(utc(2026, 12, 1, 12, 0), "Europe/London");
  assert.deepEqual([summer.day, summer.hour, summer.minute], [1, 13, 0]);
  assert.deepEqual([winter.day, winter.hour, winter.minute], [1, 12, 0]);
});

test("test_clk_002_london_spring_forward_day_skips_one_hour", () => {
  const before = localDateTime(utc(2026, 3, 29, 0, 59), "Europe/London");
  const after = localDateTime(utc(2026, 3, 29, 1, 0), "Europe/London");
  assert.deepEqual([before.hour, before.minute], [0, 59]);
  assert.deepEqual([after.hour, after.minute], [2, 0]);
});

test("test_clk_002_london_fall_back_day_repeats_one_hour", () => {
  const before = localDateTime(utc(2026, 10, 25, 0, 59), "Europe/London");
  const after = localDateTime(utc(2026, 10, 25, 1, 0), "Europe/London");
  assert.deepEqual([before.hour, before.minute], [1, 59]);
  assert.deepEqual([after.hour, after.minute], [1, 0]);
});

test("test_clk_002_new_york_spring_forward_day", () => {
  const before = localDateTime(utc(2026, 3, 8, 6, 59), "America/New_York");
  const after = localDateTime(utc(2026, 3, 8, 7, 0), "America/New_York");
  assert.deepEqual([before.day, before.hour, before.minute], [8, 1, 59]);
  assert.deepEqual([after.day, after.hour, after.minute], [8, 3, 0]);
});

test("test_clk_002_sydney_fall_back_day_in_southern_hemisphere", () => {
  const before = localDateTime(utc(2026, 4, 4, 15, 59), "Australia/Sydney");
  const after = localDateTime(utc(2026, 4, 4, 16, 0), "Australia/Sydney");
  assert.deepEqual([before.day, before.hour, before.minute], [5, 2, 59]);
  assert.deepEqual([after.day, after.hour, after.minute], [5, 2, 0]);
});

test("test_clk_002_offsets_follow_the_rules_for_any_date", () => {
  assert.equal(localDateTime(utc(2035, 7, 1, 12, 0), "Europe/London").hour, 13);
  assert.equal(localDateTime(utc(2035, 12, 1, 12, 0), "Europe/London").hour, 12);
  assert.equal(localDateTime(utc(1999, 7, 1, 12, 0), "Europe/London").hour, 13);
});

test("test_pck_006_instant_at_local_time_with_and_without_clock_change", () => {
  const midnight = { year: 2026, month: 11, day: 17, hour: 0, minute: 0 };
  assert.equal(instantAtLocal("Asia/Tokyo", midnight), utc(2026, 11, 16, 15, 0));
  assert.equal(instantAtLocal("Europe/London", midnight), utc(2026, 11, 17, 0, 0));
  const summer = { year: 2026, month: 7, day: 1, hour: 9, minute: 30 };
  assert.equal(instantAtLocal("America/New_York", summer), utc(2026, 7, 1, 13, 30));
});

test("test_pck_007_missing_local_time_gives_first_instant_after_the_gap", () => {
  const inGap = { year: 2026, month: 3, day: 29, hour: 1, minute: 30 };
  assert.equal(instantAtLocal("Europe/London", inGap), utc(2026, 3, 29, 1, 0));
  const afterGap = { year: 2026, month: 3, day: 29, hour: 2, minute: 30 };
  assert.equal(instantAtLocal("Europe/London", afterGap), utc(2026, 3, 29, 1, 30));
});

test("test_pck_007_repeated_local_time_gives_first_occurrence", () => {
  const repeated = { year: 2026, month: 10, day: 25, hour: 1, minute: 30 };
  assert.equal(instantAtLocal("Europe/London", repeated), utc(2026, 10, 25, 0, 30));
  const afterRepeat = { year: 2026, month: 10, day: 25, hour: 2, minute: 0 };
  assert.equal(instantAtLocal("Europe/London", afterRepeat), utc(2026, 10, 25, 2, 0));
});

test("test_pck_006_offset_change_found_between_two_instants", () => {
  const from = utc(2026, 3, 28, 12, 0);
  const to = utc(2026, 3, 29, 12, 0);
  assert.equal(offsetChange("Europe/London", from, to), utc(2026, 3, 29, 1, 0));
  assert.equal(offsetChange("Asia/Tokyo", from, to), null);
});

test("test_clk_002_zone_offset_follows_daylight_saving", () => {
  const hour = 60 * 60 * 1000;
  assert.equal(zoneOffset(Date.UTC(2026, 6, 1, 12), "Europe/London"), hour);
  assert.equal(zoneOffset(Date.UTC(2026, 11, 1, 12), "Europe/London"), 0);
  assert.equal(zoneOffset(Date.UTC(2026, 10, 16), "Asia/Kolkata"), 5.5 * hour);
  assert.equal(zoneOffset(Date.UTC(2026, 10, 16), "America/Chicago"), -6 * hour);
});
