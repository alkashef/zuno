// @ts-check
/** @module controller-page.test Page workflows through src/controller.js with fake api, storage and clock (PCK-004, PCK-006, PCK-007, PCK-009, EX-019, EX-020, CAL-005, CAL-006, CLK-003, REF-001, REF-002, HOL-001, HOL-004, SET-007). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createController } from "../../src/controller.js";
import { createPlace, editPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";
import { emptyHolidayTable, serviceRecord } from "../unit/holiday-fixtures.js";

/** @typedef {import("../../src/domain/holidays.js").HolidayResult} HolidayResult */
/** @typedef {import("../../src/domain/places.js").Place} Place */
/** @typedef {import("../../src/domain/settings.js").Settings} Settings */
/** @typedef {(countryCode: string, year: number, call: number) => HolidayResult} Answer */

const minute = 60 * 1000;
const hour = 60 * minute;

/**
 * @param {number} year
 * @param {number} month 1 to 12.
 * @param {number} day
 * @param {number} hours
 * @returns {number} UTC milliseconds.
 */
function utc(year, month, day, hours) {
  return Date.UTC(year, month - 1, day, hours);
}

/**
 * @param {Place[]} places
 * @returns {Settings} Settings with default working hours.
 */
function settingsWith(places) {
  return { ...defaultSettings(540, 1020), places };
}

/** @type {Answer} */
function invented(countryCode, year) {
  const records = {
    US: [serviceRecord(`${year}-12-25`, "Christmas Day", ["Public"])],
    GB: [serviceRecord(`${year}-12-26`, "Boxing Day", ["Public"])],
  };
  return { status: "loaded", holidays: records[/** @type {"US" | "GB"} */ (countryCode)] ?? [] };
}

/**
 * @param {Settings | null} saved What the fake storage holds.
 * @param {number} start The fake clock's first instant.
 * @param {Answer} [answer] How the fake holiday service answers.
 * @returns {{ controller: ReturnType<typeof createController>, calls: string[], clock: { time: number } }}
 */
function setup(saved, start, answer = invented) {
  /** @type {string[]} */
  const calls = [];
  const clock = { time: start };
  const controller = createController({
    holidayTable: emptyHolidayTable,
    api: {
      getHolidays: async (countryCode, year) => {
        calls.push(`${countryCode}-${year}`);
        return answer(countryCode, year, calls.length);
      },
    },
    storage: { load: () => saved, save: () => {} },
    holidayStorage: { load: () => null, save: () => {} },
    files: { saveJson: () => {}, readJson: async () => ({ status: "unreadable" }) },
    holidaysFileName: "zuno-holidays.json",
    clock: { now: () => clock.time },
    defaultHours: { start: 540, end: 1020 },
    pickerLimits: { defaultHours: 24, minHours: 24, maxHours: 48 },
    mapLimits: { minHeight: 240, maxHeight: 900 },
    defaultCityIds: [],
  });
  return { controller, calls, clock };
}

/**
 * @param {ReturnType<typeof createController>} controller
 * @param {number} row
 * @returns {string[]} The holiday names in one row of the grid, with their dates.
 */
function holidaysInRow(controller, row) {
  return controller
    .getState()
    .grid[row].filter((cell) => cell.holidayName !== null)
    .map((cell) => `${cell.date} ${cell.holidayName}`);
}

test("test_pck_004_open_puts_marker_at_now", async () => {
  const start = utc(2026, 11, 17, 10);
  const { controller } = setup(settingsWith([createPlace("a", "london")]), start);
  await controller.dispatch({ type: "open" });
  const state = controller.getState();
  assert.equal(state.marker.instant, start);
  assert.equal(state.now, start);
  assert.deepEqual(state.month, { year: 2026, month: 11 });
});

test("test_set_007_open_with_no_places_shows_empty_state", async () => {
  const { controller, calls } = setup(settingsWith([]), utc(2026, 11, 17, 10));
  await controller.dispatch({ type: "open" });
  const state = controller.getState();
  assert.equal(state.isEmpty, true);
  assert.deepEqual(state.picker, []);
  assert.deepEqual(state.grid, []);
  assert.deepEqual(calls, []);
});

test("test_set_007_saved_settings_with_no_places_show_empty_state", async () => {
  const { controller, calls } = setup(settingsWith([]), utc(2026, 11, 17, 10));
  await controller.dispatch({ type: "open" });
  assert.equal(controller.getState().isEmpty, true);
  assert.deepEqual(calls, []);
});

test("test_hol_001_open_requests_each_country_year_once", async () => {
  const places = [
    createPlace("a", "washington-dc"),
    createPlace("b", "washington-dc"),
    createPlace("c", "london"),
  ];
  const { controller, calls } = setup(settingsWith(places), utc(2026, 11, 17, 10));
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setMarker", instant: utc(2026, 11, 18, 10) });
  assert.deepEqual([...calls].sort(), ["GB-2026", "US-2026"]);
  assert.equal(controller.getState().isEmpty, false);
});

test("test_hol_001_marker_window_in_new_year_requests_that_year", async () => {
  const { controller, calls } = setup(
    settingsWith([createPlace("a", "tokyo")]),
    utc(2026, 12, 31, 3),
  );
  await controller.dispatch({ type: "open" });
  assert.deepEqual(calls, ["JP-2026"]);
  await controller.dispatch({ type: "shiftMarkerDay", days: 1 });
  assert.deepEqual(calls, ["JP-2026", "JP-2027"]);
});

test("test_clk_003_tick_updates_time_but_not_marker", async () => {
  const start = utc(2026, 11, 17, 10);
  const { controller, clock } = setup(settingsWith([createPlace("a", "london")]), start);
  await controller.dispatch({ type: "open" });
  clock.time = start + minute;
  await controller.dispatch({ type: "tick" });
  const state = controller.getState();
  assert.equal(state.now, start + minute);
  assert.equal(state.marker.instant, start);
});

test("test_ref_001_refresh_clears_and_refetches_holidays", async () => {
  const start = utc(2026, 12, 10, 12);
  /** @type {Answer} */
  const answer = (countryCode, year, call) => ({
    status: "loaded",
    holidays: [
      call === 1
        ? serviceRecord(`${year}-12-25`, "Christmas Day", ["Public"])
        : serviceRecord(`${year}-12-24`, "Christmas Eve", ["Public"]),
    ],
  });
  const { controller, calls, clock } = setup(
    settingsWith([createPlace("a", "washington-dc")]),
    start,
    answer,
  );
  await controller.dispatch({ type: "open" });
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-12-25 Christmas Day"]);
  clock.time = start + hour;
  await controller.dispatch({ type: "refresh" });
  assert.deepEqual(calls, ["US-2026", "US-2026"]);
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-12-24 Christmas Eve"]);
  assert.equal(controller.getState().now, start + hour);
});

test("test_ref_002_failed_country_listed_and_times_still_shown", async () => {
  /** @type {Answer} */
  const answer = (countryCode, year, call) =>
    countryCode === "GB"
      ? { status: "unavailable", reason: "offline" }
      : invented(countryCode, year, call);
  const places = [createPlace("a", "washington-dc"), createPlace("b", "london")];
  const { controller } = setup(settingsWith(places), utc(2026, 12, 10, 12), answer);
  await controller.dispatch({ type: "open" });
  const state = controller.getState();
  assert.deepEqual(state.notices.countries, ["GB"]);
  assert.deepEqual(
    state.picker.map((row) => [row.placeId, row.localDateTime.hour]),
    [
      ["a", 7],
      ["b", 12],
    ],
  );
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-12-25 Christmas Day"]);
});

test("test_ref_002_failed_refresh_keeps_loaded_holidays", async () => {
  /** @type {Answer} */
  const answer = (countryCode, year, call) =>
    call === 1 ? invented(countryCode, year, call) : { status: "unavailable", reason: "offline" };
  const { controller } = setup(
    settingsWith([createPlace("a", "washington-dc")]),
    utc(2026, 12, 10, 12),
    answer,
  );
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "refresh" });
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-12-25 Christmas Day"]);
  assert.deepEqual(controller.getState().notices.countries, []);
});

test("test_hol_004_missing_region_listed_in_notices", async () => {
  const places = editPlace([createPlace("a", "washington-dc"), createPlace("b", "london")], "a", {
    region: "US-CA",
  });
  const { controller } = setup(settingsWith(places), utc(2026, 12, 10, 12));
  await controller.dispatch({ type: "open" });
  const state = controller.getState();
  assert.deepEqual(state.notices.placeIds, ["a"]);
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-12-25 Christmas Day"]);
});

test("test_pck_007_shift_day_and_pick_day", async () => {
  const { controller } = setup(settingsWith([createPlace("a", "london")]), utc(2026, 11, 16, 15));
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "shiftMarkerDay", days: 1 });
  assert.equal(controller.getState().marker.instant, utc(2026, 11, 17, 15));
  await controller.dispatch({ type: "shiftMarkerDay", days: -2 });
  assert.equal(controller.getState().marker.instant, utc(2026, 11, 15, 15));
  await controller.dispatch({ type: "setMarker", date: { year: 2026, month: 12, day: 1 } });
  assert.equal(controller.getState().marker.instant, utc(2026, 12, 1, 15));
});

test("test_cal_005_show_previous_and_next_month", async () => {
  const { controller } = setup(settingsWith([createPlace("a", "london")]), utc(2026, 11, 17, 10));
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "showMonth", offset: -1 });
  assert.deepEqual(controller.getState().month, { year: 2026, month: 10 });
  assert.equal(controller.getState().grid[0].length, 31);
  await controller.dispatch({ type: "showMonth", offset: 1 });
  await controller.dispatch({ type: "showMonth", offset: 1 });
  assert.deepEqual(controller.getState().month, { year: 2026, month: 12 });
  assert.equal(controller.getState().grid[0][0].date, "2026-12-01");
});

test("test_cal_005_next_month_in_new_year_requests_that_year", async () => {
  const { controller, calls } = setup(
    settingsWith([createPlace("a", "washington-dc")]),
    utc(2026, 12, 10, 12),
  );
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "showMonth", offset: 1 });
  assert.deepEqual(controller.getState().month, { year: 2027, month: 1 });
  assert.deepEqual(calls, ["US-2026", "US-2027"]);
});

test("test_cal_006_select_and_close_holiday_cell", async () => {
  const { controller } = setup(
    settingsWith([createPlace("a", "washington-dc")]),
    utc(2026, 12, 10, 12),
  );
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "selectHoliday", cell: { placeId: "a", date: "2026-12-25" } });
  assert.deepEqual(controller.getState().selectedHoliday, {
    placeId: "a",
    date: "2026-12-25",
    name: "Christmas Day",
  });
  await controller.dispatch({ type: "selectHoliday", cell: null });
  assert.equal(controller.getState().selectedHoliday, null);
});

test("test_cal_006_non_holiday_cell_opens_no_card", async () => {
  const { controller } = setup(
    settingsWith([createPlace("a", "washington-dc")]),
    utc(2026, 12, 10, 12),
  );
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "selectHoliday", cell: { placeId: "a", date: "2026-12-24" } });
  assert.equal(controller.getState().selectedHoliday, null);
});

test("test_controller_toggles_notices_and_settings_panel", async () => {
  const { controller } = setup(settingsWith([createPlace("a", "london")]), utc(2026, 11, 17, 10));
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "toggleNotices" });
  assert.equal(controller.getState().noticesOpen, true);
  await controller.dispatch({ type: "toggleNotices" });
  assert.equal(controller.getState().noticesOpen, false);
  await controller.dispatch({ type: "openSettings" });
  assert.equal(controller.getState().settingsOpen, true);
  await controller.dispatch({ type: "closeSettings" });
  assert.equal(controller.getState().settingsOpen, false);
});

test("test_controller_subscribers_hear_each_change_until_unsubscribed", async () => {
  const start = utc(2026, 11, 17, 10);
  const { controller, clock } = setup(settingsWith([createPlace("a", "london")]), start);
  /** @type {number[]} */
  const heard = [];
  const unsubscribe = controller.subscribe((state) => heard.push(state.now));
  await controller.dispatch({ type: "open" });
  clock.time = start + minute;
  await controller.dispatch({ type: "tick" });
  unsubscribe();
  await controller.dispatch({ type: "tick" });
  assert.deepEqual(heard, [start, start, start + minute]);
});

/**
 * @param {number} hours
 * @returns {Settings} Tokyo first, then London, with the picker at that many hour slots.
 */
function tokyoFirst(hours) {
  return {
    ...settingsWith([createPlace("a", "tokyo"), createPlace("b", "london")]),
    pickerHours: hours,
  };
}

test("test_pck_004_page_opens_with_today_selected_in_the_first_place", async () => {
  const start = utc(2026, 11, 19, 20);
  const { controller } = setup(tokyoFirst(24), start);
  await controller.dispatch({ type: "open" });
  const state = controller.getState();
  assert.deepEqual(state.selectedDay, { year: 2026, month: 11, day: 20 });
  assert.equal(state.marker.instant, start);
  assert.deepEqual(state.pickerWindow, { from: utc(2026, 11, 19, 15), to: utc(2026, 11, 20, 15) });
  assert.deepEqual(state.windowDates, {
    first: { year: 2026, month: 11, day: 20 },
    last: { year: 2026, month: 11, day: 20 },
  });
});

test("test_pck_006_moving_the_marker_does_not_move_the_window", async () => {
  const { controller } = setup(tokyoFirst(30), utc(2026, 11, 19, 20));
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setMarker", instant: utc(2026, 11, 20, 17) });
  const state = controller.getState();
  assert.equal(state.marker.instant, utc(2026, 11, 20, 17));
  assert.deepEqual(state.selectedDay, { year: 2026, month: 11, day: 20 });
  assert.deepEqual(state.pickerWindow, { from: utc(2026, 11, 19, 15), to: utc(2026, 11, 20, 21) });
  assert.deepEqual(state.windowDates?.last, { year: 2026, month: 11, day: 21 });
  assert.deepEqual(state.picker[0].localDateTime, {
    year: 2026,
    month: 11,
    day: 21,
    hour: 2,
    minute: 0,
  });
  await controller.dispatch({ type: "setMarker", instant: utc(2026, 11, 25, 0) });
  assert.equal(controller.getState().marker.instant, utc(2026, 11, 20, 20) + 59 * minute);
  await controller.dispatch({ type: "setMarker", instant: utc(2026, 11, 1, 0) });
  assert.equal(controller.getState().marker.instant, utc(2026, 11, 19, 15));
  assert.deepEqual(controller.getState().pickerWindow?.from, utc(2026, 11, 19, 15));
});

test("test_pck_007_choosing_a_day_sets_the_selected_day_and_moves_the_marker", async () => {
  const { controller } = setup(tokyoFirst(30), utc(2026, 11, 19, 20));
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setMarker", instant: utc(2026, 11, 20, 17) });
  await controller.dispatch({ type: "shiftMarkerDay", days: 1 });
  let state = controller.getState();
  assert.deepEqual(state.selectedDay, { year: 2026, month: 11, day: 21 });
  assert.equal(state.marker.instant, utc(2026, 11, 20, 17));
  assert.deepEqual(state.pickerWindow, { from: utc(2026, 11, 20, 15), to: utc(2026, 11, 21, 21) });
  await controller.dispatch({ type: "shiftMarkerDay", days: -1 });
  assert.equal(controller.getState().marker.instant, utc(2026, 11, 19, 17));
  await controller.dispatch({ type: "setMarker", date: { year: 2026, month: 12, day: 3 } });
  state = controller.getState();
  assert.deepEqual(state.selectedDay, { year: 2026, month: 12, day: 3 });
  assert.equal(state.marker.instant, utc(2026, 12, 2, 17));
  assert.deepEqual(state.pickerWindow?.from, utc(2026, 12, 2, 15));
});

test("test_pck_006_a_new_first_place_or_fewer_hours_keep_the_marker_in_the_window", async () => {
  const { controller } = setup(tokyoFirst(30), utc(2026, 11, 19, 20));
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setMarker", instant: utc(2026, 11, 20, 17) });
  await controller.dispatch({ type: "setPickerHours", hours: 24 });
  assert.equal(controller.getState().settings?.pickerHours, 24);
  assert.equal(controller.getState().marker.instant, utc(2026, 11, 19, 17));
  await controller.dispatch({ type: "movePlace", placeId: "b", offset: -1 });
  const state = controller.getState();
  assert.deepEqual(state.selectedDay, { year: 2026, month: 11, day: 20 });
  assert.deepEqual(state.pickerWindow, { from: utc(2026, 11, 20, 0), to: utc(2026, 11, 21, 0) });
  assert.equal(state.marker.instant, utc(2026, 11, 20, 17));
});
