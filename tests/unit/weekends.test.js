// @ts-check
/** @module weekends.test Unit tests for src/domain/weekends.js (CAL-002, SET-016, EX-002, DEC-003). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createPlace, editPlace } from "../../src/domain/places.js";
import {
  countryWeekendDays,
  isWeekend,
  isWeekendChoice,
  placeWeekendDays,
} from "../../src/domain/weekends.js";

test("test_cal_002_saudi_weekend_is_friday_and_saturday_ex_002", () => {
  const riyadh = createPlace("a", "riyadh");
  assert.deepEqual(countryWeekendDays("SA"), [5, 6]);
  assert.equal(isWeekend(riyadh, { year: 2026, month: 11, day: 20 }), true);
  assert.equal(isWeekend(riyadh, { year: 2026, month: 11, day: 21 }), true);
  assert.equal(isWeekend(riyadh, { year: 2026, month: 11, day: 22 }), false);
});

test("test_cal_002_weekend_differs_by_country", () => {
  const london = createPlace("a", "london");
  const delhi = createPlace("b", "new-delhi");
  assert.deepEqual(countryWeekendDays("GB"), [6, 7]);
  assert.deepEqual(countryWeekendDays("IN"), [7]);
  assert.equal(isWeekend(london, { year: 2026, month: 11, day: 21 }), true);
  assert.equal(isWeekend(london, { year: 2026, month: 11, day: 20 }), false);
  assert.equal(isWeekend(delhi, { year: 2026, month: 11, day: 21 }), false);
  assert.equal(isWeekend(delhi, { year: 2026, month: 11, day: 22 }), true);
});

test("test_set_016_weekend_days_default_to_the_countrys", () => {
  const riyadh = createPlace("a", "riyadh");
  assert.equal(riyadh.weekendDays, null);
  assert.deepEqual(placeWeekendDays(riyadh), [5, 6]);
  const own = editPlace([riyadh], "a", { weekendDays: [6, 7] })[0];
  assert.deepEqual(placeWeekendDays(own), [6, 7]);
  assert.equal(isWeekend(own, { year: 2026, month: 11, day: 20 }), false);
  assert.equal(isWeekend(own, { year: 2026, month: 11, day: 22 }), true);
});

test("test_set_016_a_weekend_choice_is_null_or_a_list_of_distinct_days_1_to_7", () => {
  assert.equal(isWeekendChoice(null), true);
  assert.equal(isWeekendChoice([7]), true);
  assert.equal(isWeekendChoice([1, 2, 3, 4, 5, 6, 7]), true);
  assert.equal(isWeekendChoice([]), false);
  assert.equal(isWeekendChoice([0]), false);
  assert.equal(isWeekendChoice([8]), false);
  assert.equal(isWeekendChoice([6, 6]), false);
  assert.equal(isWeekendChoice([1.5]), false);
  assert.equal(isWeekendChoice(["6"]), false);
  assert.equal(isWeekendChoice(6), false);
  assert.equal(isWeekendChoice(undefined), false);
});
