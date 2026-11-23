// @ts-check
/** @module calendar.test Unit tests for src/domain/calendar.js (CAL-001 to CAL-004, CAL-007, HIJ-001, PCK-007, EX-002, EX-004, EX-007). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildMonth,
  dayMenuChoices,
  markAddedHolidays,
  monthWeeks,
} from "../../src/domain/calendar.js";
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
  const settings = settingsWith([createPlace("a", "riyadh"), createPlace("b", "washington-dc")]);
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
  const settings = settingsWith([createPlace("a", "riyadh"), createPlace("b", "london")]);
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
  const settings = settingsWith([createPlace("a", "washington-dc"), createPlace("b", "london")]);
  const holidays = { US: [holiday("2026-12-25", "Christmas Day")] };
  const [american, british] = buildMonth(settings, { year: 2026, month: 12 }, holidays, noon);
  assert.equal(american[24].holidayName, "Christmas Day");
  assert.equal(american[23].holidayName, null);
  assert.equal(american[24].isWeekend, false);
  assert.equal(british[24].holidayName, null);
});

test("test_cal_003_holiday_follows_the_place_region", () => {
  const place = editPlace([createPlace("a", "washington-dc")], "a", { region: "US-CA" })[0];
  const holidays = { US: [holiday("2026-12-01", "Local Day", ["US-CA"])] };
  const withRegion = buildMonth(settingsWith([place]), { year: 2026, month: 12 }, holidays, noon);
  const national = buildMonth(
    settingsWith([createPlace("a", "washington-dc")]),
    { year: 2026, month: 12 },
    holidays,
    noon,
  );
  assert.equal(withRegion[0][0].holidayName, "Local Day");
  assert.equal(national[0][0].holidayName, null);
});

test("test_cal_004_today_uses_place_local_date", () => {
  const settings = settingsWith([createPlace("a", "sydney"), createPlace("b", "los-angeles")]);
  const instant = Date.UTC(2026, 10, 10, 20, 0);
  const [sydney, losAngeles] = buildMonth(settings, { year: 2026, month: 11 }, {}, instant);
  assert.deepEqual(
    sydney.filter((cell) => cell.isToday).map((cell) => cell.date),
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
  const settings = settingsWith([createPlace("a", "london")]);
  const holidays = { GB: [holiday("2026-11-21", "Invented Day")] };
  const cell = buildMonth(settings, { year: 2026, month: 11 }, holidays, noon)[0][20];
  assert.equal(cell.isWeekend, true);
  assert.equal(cell.holidayName, "Invented Day");
});

test("test_hij_001_hijri_data_only_when_on_with_variant_and_adjustment", () => {
  const place = createPlace("a", "riyadh");
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

test("test_pck_007_month_weeks_start_on_sunday_and_pad_with_null", () => {
  const weeks = monthWeeks({ year: 2026, month: 12 });
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0], [null, null, 1, 2, 3, 4, 5]);
  assert.deepEqual(weeks[2], [13, 14, 15, 16, 17, 18, 19]);
  assert.deepEqual(weeks[4], [27, 28, 29, 30, 31, null, null]);
});

test("test_pck_007_month_weeks_hold_every_day_once_in_a_leap_february", () => {
  const days = monthWeeks({ year: 2028, month: 2 })
    .flat()
    .filter((day) => day !== null);
  assert.deepEqual(
    days,
    Array.from({ length: 29 }, (_, index) => index + 1),
  );
});

test("test_cal_002_month_grid_marks_the_places_own_weekend_days", () => {
  const delhi = editPlace([createPlace("a", "new-delhi")], "a", { weekendDays: [6, 7] });
  const settings = settingsWith([...delhi, createPlace("b", "riyadh")]);
  const [india, saudi] = buildMonth(settings, { year: 2026, month: 11 }, {}, noon);
  const marked = (/** @type {import("../../src/domain/calendar.js").DayFacts[]} */ row) =>
    row.filter((cell) => cell.isWeekend).map((cell) => cell.date);
  assert.deepEqual(marked(india).slice(1, 5), [
    "2026-11-07",
    "2026-11-08",
    "2026-11-14",
    "2026-11-15",
  ]);
  assert.equal(india[20].isWeekend, true);
  assert.equal(india[21].isWeekend, true);
  assert.equal(saudi[19].isWeekend, true);
  assert.equal(saudi[20].isWeekend, true);
  assert.equal(saudi[21].isWeekend, false);
});

/**
 * @param {string} cityId
 * @param {import("../../src/domain/vacations.js").Vacation[]} vacations
 * @returns {import("../../src/domain/places.js").Place} A place with these vacations.
 */
function placeWithVacations(cityId, vacations) {
  return editPlace([createPlace("a", cityId)], "a", { vacations })[0];
}

const winterBreak = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };

test("test_vac_004_a_vacation_day_has_the_vacation_fill_ex_029", () => {
  const settings = settingsWith([placeWithVacations("london", [winterBreak])]);
  const [london] = buildMonth(settings, { year: 2026, month: 12 }, {}, noon);
  assert.deepEqual(london[17].vacations, []);
  assert.deepEqual(london[17].fill, { first: null, second: null });
  assert.deepEqual(london[20].vacations, [winterBreak]);
  assert.deepEqual(london[20].fill, { first: "vacation", second: null });
  assert.deepEqual(london[30].fill, { first: "vacation", second: null });
  const other = settingsWith([createPlace("b", "washington-dc")]);
  assert.deepEqual(buildMonth(other, { year: 2026, month: 12 }, {}, noon)[0][20].vacations, []);
});

test("test_vac_004_a_vacation_on_a_weekend_or_holiday_splits_the_fill", () => {
  const settings = settingsWith([placeWithVacations("london", [winterBreak])]);
  const holidays = {
    GB: [holiday("2026-12-25", "Christmas Day"), holiday("2026-12-26", "Boxing")],
  };
  const [london] = buildMonth(settings, { year: 2026, month: 12 }, holidays, noon);
  assert.deepEqual(london[24].fill, { first: "vacation", second: "holiday" });
  assert.deepEqual(london[25].fill, { first: "vacation", second: "holiday" });
  assert.deepEqual(london[26].fill, { first: "vacation", second: "weekend" });
  const plain = buildMonth(
    settingsWith([createPlace("a", "london")]),
    { year: 2026, month: 12 },
    holidays,
    noon,
  )[0];
  assert.deepEqual(plain[24].fill, { first: "holiday", second: null });
  assert.deepEqual(plain[25].fill, { first: "weekend", second: "holiday" });
  assert.deepEqual(plain[26].fill, { first: "weekend", second: null });
  assert.deepEqual(plain[27].fill, { first: null, second: null });
});

/**
 * @param {import("../../src/domain/user-holidays.js").HolidayEntry[]} added
 * @returns {import("../../src/domain/user-holidays.js").UserHolidays} A record with these added holidays.
 */
function recordWith(added) {
  return { version: 1, added, hidden: [] };
}

/**
 * @param {import("../../src/domain/calendar.js").DayFacts} cell
 * @returns {string[]} The kinds of the choices the day menu gives for the cell.
 */
function menuKinds(cell) {
  return dayMenuChoices(cell).map((choice) => choice.kind);
}

test("test_hol_019_day_menu_of_a_service_holiday_offers_hide_and_of_an_added_one_remove", () => {
  const settings = settingsWith([createPlace("a", "london")]);
  const holidays = {
    GB: [holiday("2026-11-12", "Service Day"), holiday("2026-11-13", "Team Day")],
  };
  const added = [{ countryCode: "GB", date: "2026-11-13", name: "Team Day" }];
  const grid = buildMonth(settings, { year: 2026, month: 11 }, holidays, noon);
  const [row] = markAddedHolidays(grid, settings, recordWith(added));
  assert.equal(row[11].holidayName, "Service Day");
  assert.equal(row[11].holidayAdded, false);
  assert.deepEqual(menuKinds(row[11]), ["addHoliday", "addVacation", "hideHoliday"]);
  assert.equal(row[12].holidayAdded, true);
  assert.deepEqual(menuKinds(row[12]), ["addHoliday", "addVacation", "removeHoliday"]);
});

test("test_hol_015_day_menu_of_any_day_offers_add_public_holiday", () => {
  const settings = settingsWith([createPlace("a", "london")]);
  const [row] = buildMonth(settings, { year: 2026, month: 11 }, {}, noon);
  assert.equal(
    row.every((cell) => cell.holidayAdded === false),
    true,
  );
  assert.deepEqual(menuKinds(row[0]).slice(0, 1), ["addHoliday"]);
  assert.deepEqual(menuKinds(row[20]).slice(0, 1), ["addHoliday"]);
});

test("test_vac_001_day_menu_offers_add_public_holiday_and_add_vacation", () => {
  const settings = settingsWith([createPlace("a", "london")]);
  const [row] = buildMonth(settings, { year: 2026, month: 11 }, {}, noon);
  assert.deepEqual(menuKinds(row[0]), ["addHoliday", "addVacation"]);
  assert.deepEqual(menuKinds(row[20]), ["addHoliday", "addVacation"]);
});

test("test_vac_005_day_menu_of_a_vacation_day_offers_edit_and_remove_vacation", () => {
  const trip = { start: "2026-12-22", end: "2026-12-23", label: "Trip" };
  const settings = settingsWith([placeWithVacations("london", [winterBreak, trip])]);
  const [row] = buildMonth(settings, { year: 2026, month: 12 }, {}, noon);
  assert.deepEqual(menuKinds(row[0]), ["addHoliday", "addVacation"]);
  assert.deepEqual(dayMenuChoices(row[20]), [
    { kind: "addHoliday" },
    { kind: "addVacation" },
    { kind: "editVacation", vacation: winterBreak },
    { kind: "removeVacation", vacation: winterBreak },
  ]);
  assert.deepEqual(dayMenuChoices(row[21]).slice(2), [
    { kind: "editVacation", vacation: winterBreak },
    { kind: "removeVacation", vacation: winterBreak },
    { kind: "editVacation", vacation: trip },
    { kind: "removeVacation", vacation: trip },
  ]);
});
