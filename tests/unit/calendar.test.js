// @ts-check
/** @module calendar.test Unit tests for src/domain/calendar.js (CAL-001 to CAL-004, CAL-007, HIJ-001, EX-002, EX-004, EX-007). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildMonth } from "../../src/domain/calendar.js";
import { createPlace, editPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";

const noon = Date.UTC(2026, 10, 10, 12, 0);

/**
 * @param {import("../../src/domain/places.js").Place[]} places
 * @param {boolean} showHijri
 * @returns {import("../../src/domain/settings.js").Settings} Settings with these places.
 */
function settingsWith(places, showHijri = false) {
  return { ...defaultSettings(540, 1020), places, showHijri };
}

/**
 * @param {string} date `YYYY-MM-DD`.
 * @param {string} name
 * @param {string[]} regions
 * @returns {import("../../src/domain/holidays.js").Holiday} An invented holiday.
 */
function holiday(date, name, regions = []) {
  return { date, name, regions };
}

test("test_cal_001_one_row_per_place_one_cell_per_day", () => {
  const settings = settingsWith([createPlace("a", "SA"), createPlace("b", "US")]);
  const november = buildMonth(settings, { year: 2026, month: 11 }, {}, noon);
  assert.equal(november.length, 2);
  assert.equal(november[0].length, 30);
  assert.equal(november[0][0].date, "2026-11-01");
  assert.equal(november[1][29].date, "2026-11-30");
  assert.equal(buildMonth(settings, { year: 2028, month: 2 }, {}, noon)[0].length, 29);
  assert.equal(buildMonth(settings, { year: 2026, month: 12 }, {}, noon)[1].length, 31);
  assert.deepEqual(buildMonth(settingsWith([]), { year: 2026, month: 11 }, {}, noon), []);
});

test("test_cal_002_weekend_cells_by_country", () => {
  const settings = settingsWith([createPlace("a", "SA"), createPlace("b", "GB")]);
  const [saudi, britain] = buildMonth(settings, { year: 2026, month: 11 }, {}, noon);
  const marked = (/** @type {import("../../src/domain/calendar.js").DayFacts[]} */ row) =>
    row.filter((cell) => cell.isWeekend).map((cell) => cell.date);
  assert.deepEqual(marked(saudi).slice(2, 5), ["2026-11-13", "2026-11-14", "2026-11-20"]);
  assert.equal(saudi[20].isWeekend, true);
  assert.equal(saudi[21].isWeekend, false);
  assert.equal(britain[19].isWeekend, false);
  assert.equal(britain[20].isWeekend, true);
  assert.equal(britain[21].isWeekend, true);
});

test("test_cal_003_holiday_cell_has_holiday_kind", () => {
  const settings = settingsWith([createPlace("a", "US"), createPlace("b", "GB")]);
  const holidays = { US: [holiday("2026-12-25", "Christmas Day")] };
  const [american, british] = buildMonth(settings, { year: 2026, month: 12 }, holidays, noon);
  assert.equal(american[24].holidayName, "Christmas Day");
  assert.equal(american[23].holidayName, null);
  assert.equal(american[24].isWeekend, false);
  assert.equal(british[24].holidayName, null);
});

test("test_cal_003_holiday_follows_the_place_region", () => {
  const place = editPlace([createPlace("a", "US")], "a", { region: "US-CA" })[0];
  const holidays = { US: [holiday("2026-12-01", "Local Day", ["US-CA"])] };
  const withRegion = buildMonth(settingsWith([place]), { year: 2026, month: 12 }, holidays, noon);
  const national = buildMonth(
    settingsWith([createPlace("a", "US")]),
    { year: 2026, month: 12 },
    holidays,
    noon,
  );
  assert.equal(withRegion[0][0].holidayName, "Local Day");
  assert.equal(national[0][0].holidayName, null);
});

test("test_cal_004_today_uses_place_local_date", () => {
  const settings = settingsWith([
    { ...createPlace("a", "NZ"), zone: "Pacific/Auckland" },
    { ...createPlace("b", "US"), zone: "America/Los_Angeles" },
  ]);
  const instant = Date.UTC(2026, 10, 10, 20, 0);
  const [auckland, losAngeles] = buildMonth(settings, { year: 2026, month: 11 }, {}, instant);
  assert.deepEqual(
    auckland.filter((cell) => cell.isToday).map((cell) => cell.date),
    ["2026-11-11"],
  );
  assert.deepEqual(
    losAngeles.filter((cell) => cell.isToday).map((cell) => cell.date),
    ["2026-11-10"],
  );
  const december = buildMonth(settings, { year: 2026, month: 12 }, {}, instant);
  assert.equal(
    december[0].some((cell) => cell.isToday),
    false,
  );
});

test("test_cal_007_holiday_on_weekend_is_split_ex_007", () => {
  const settings = settingsWith([createPlace("a", "GB")]);
  const holidays = { GB: [holiday("2026-11-21", "Invented Day")] };
  const cell = buildMonth(settings, { year: 2026, month: 11 }, holidays, noon)[0][20];
  assert.equal(cell.isWeekend, true);
  assert.equal(cell.holidayName, "Invented Day");
});

test("test_hij_001_hijri_data_only_when_on_with_variant_and_adjustment", () => {
  const place = createPlace("a", "SA");
  const adjusted = editPlace([place], "a", { hijriAdjust: 1 })[0];
  const off = buildMonth(settingsWith([place], false), { year: 2026, month: 11 }, {}, noon);
  const on = buildMonth(
    settingsWith([place, { ...adjusted, id: "b" }], true),
    { year: 2026, month: 11 },
    {},
    noon,
  );
  assert.equal(off[0][15].hijri, null);
  assert.deepEqual(on[0][15].hijri, { day: 6, month: "Jumada II", year: 1448 });
  assert.deepEqual(on[1][15].hijri, { day: 7, month: "Jumada II", year: 1448 });
});
