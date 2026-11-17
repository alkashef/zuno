// @ts-check
/** @module zones.test Unit tests for src/domain/zones.js (CLK-001, CLK-002, EX-001). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { localDateTime } from "../../src/domain/zones.js";

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
