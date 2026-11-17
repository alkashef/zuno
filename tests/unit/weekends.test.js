// @ts-check
/** @module weekends.test Unit tests for src/domain/weekends.js (CAL-002, EX-002, DEC-003). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { isWeekend, weekendDays } from "../../src/domain/weekends.js";

test("test_cal_002_saudi_weekend_is_friday_and_saturday_ex_002", () => {
  assert.deepEqual(weekendDays("SA"), [5, 6]);
  assert.equal(isWeekend("SA", { year: 2026, month: 11, day: 20 }), true);
  assert.equal(isWeekend("SA", { year: 2026, month: 11, day: 21 }), true);
  assert.equal(isWeekend("SA", { year: 2026, month: 11, day: 22 }), false);
});

test("test_cal_002_weekend_differs_by_country", () => {
  assert.deepEqual(weekendDays("GB"), [6, 7]);
  assert.deepEqual(weekendDays("IN"), [7]);
  assert.equal(isWeekend("GB", { year: 2026, month: 11, day: 21 }), true);
  assert.equal(isWeekend("GB", { year: 2026, month: 11, day: 20 }), false);
  assert.equal(isWeekend("IN", { year: 2026, month: 11, day: 21 }), false);
  assert.equal(isWeekend("IN", { year: 2026, month: 11, day: 22 }), true);
});
