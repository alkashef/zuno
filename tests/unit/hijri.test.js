// @ts-check
/** @module hijri.test Unit tests for src/domain/hijri.js (HIJ-001 to HIJ-003, EX-010). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { hijriDate } from "../../src/domain/hijri.js";

test("test_hij_001_hijri_date_of_local_date", () => {
  const date = hijriDate({ year: 2026, month: 11, day: 16 }, "umalqura", 0);
  assert.deepEqual(date, { day: 6, month: "Jumada II", year: 1448 });
});

test("test_hij_002_umalqura_and_tabular_differ_on_a_chosen_date", () => {
  // 2026-06-16: Umm al-Qura has begun Muharram 1448; the tabular calendar is still in 1447.
  const gregorian = { year: 2026, month: 6, day: 16 };
  assert.deepEqual(hijriDate(gregorian, "umalqura", 0), { day: 1, month: "Muharram", year: 1448 });
  const tabular = hijriDate(gregorian, "tabular", 0);
  assert.equal(tabular.year, 1447);
  assert.equal(tabular.day, 30);
});

test("test_hij_003_adjustment_minus_one_to_plus_one_ex_010", () => {
  const gregorian = { year: 2026, month: 11, day: 16 };
  assert.equal(hijriDate(gregorian, "umalqura", 0).day, 6);
  assert.equal(hijriDate(gregorian, "umalqura", 1).day, 7);
  assert.equal(hijriDate(gregorian, "umalqura", -1).day, 5);
});

test("test_hij_003_adjustment_crosses_a_month_boundary", () => {
  const gregorian = { year: 2026, month: 6, day: 16 };
  assert.deepEqual(hijriDate(gregorian, "umalqura", -1), {
    day: 29,
    month: "Dhuʻl-Hijjah",
    year: 1447,
  });
});
