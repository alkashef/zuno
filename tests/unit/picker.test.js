// @ts-check
/** @module picker.test Unit tests for src/domain/picker.js (PCK-001 to PCK-003, PCK-005 to PCK-007, PCK-009, PCK-012, SET-005, EX-003, EX-008, EX-009, EX-019, EX-020, EX-035). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { formatDateRange } from "../../src/domain/format.js";
import {
  DayKind,
  buildPicker,
  chooseDay,
  followClock,
  keepMarkerInWindow,
  markerInWindow,
  markerOnDate,
  pickerWindow,
  shiftDay,
  windowDates,
} from "../../src/domain/picker.js";
import { createPlace, editPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";

/** @typedef {import("../../src/domain/picker.js").PickerRow} PickerRow */
/** @typedef {import("../../src/domain/picker.js").PickerWindow} PickerWindow */

const hour = 60 * 60 * 1000;

/**
 * @param {number} year
 * @param {number} month 1 to 12.
 * @param {number} day
 * @param {number} hours
 * @param {number} minutes
 * @returns {number} UTC milliseconds.
 */
function utc(year, month, day, hours, minutes = 0) {
  return Date.UTC(year, month - 1, day, hours, minutes);
}

/**
 * @param {import("../../src/domain/places.js").Place[]} places
 * @returns {import("../../src/domain/settings.js").Settings} Settings with default working hours.
 */
function settingsWith(places) {
  return { ...defaultSettings(540, 1020), places };
}

/**
 * Asserts the row's segments cover the window exactly, with no gap, overlap or repeated kind.
 * @param {PickerRow} row
 * @param {PickerWindow} window
 */
function assertCoversWindow(row, window) {
  const { segments } = row;
  assert.equal(segments[0].from, window.from);
  assert.equal(segments[segments.length - 1].to, window.to);
  segments.slice(1).forEach((segment, index) => {
    assert.equal(segment.from, segments[index].to);
    assert.notEqual(segment.kind, segments[index].kind);
  });
}

/**
 * @param {PickerRow} row
 * @returns {[number, number, string][]} Each segment as `[from, to, kind]`.
 */
function shape(row) {
  return row.segments.map((segment) => [segment.from, segment.to, segment.kind]);
}

/**
 * @param {PickerRow} row
 * @param {number} instant
 * @returns {string} The kind of the segment that holds the instant.
 */
function kindAt(row, instant) {
  const found = row.segments.find((segment) => segment.from <= instant && instant < segment.to);
  assert.ok(found, "no segment holds the instant");
  return found.kind;
}

test("test_pck_001_one_row_per_place", () => {
  const settings = settingsWith([
    createPlace("a", "london"),
    createPlace("b", "washington-dc"),
    createPlace("c", "tokyo"),
  ]);
  const rows = buildPicker(settings, { instant: utc(2026, 11, 16, 15) }, {});
  assert.deepEqual(
    rows.map((row) => row.placeId),
    ["a", "b", "c"],
  );
  assert.deepEqual(buildPicker(settingsWith([]), { instant: utc(2026, 11, 16, 15) }, {}), []);
  assert.equal(pickerWindow(settingsWith([]), { year: 2026, month: 11, day: 16 }), null);
});

test("test_pck_002_local_time_at_marker_ex_003", () => {
  const settings = settingsWith([
    createPlace("london", "london"),
    createPlace("newYork", "washington-dc"),
    createPlace("tokyo", "tokyo"),
  ]);
  const [london, newYork, tokyo] = buildPicker(settings, { instant: utc(2026, 11, 16, 15) }, {});
  assert.deepEqual(london.localDateTime, { year: 2026, month: 11, day: 16, hour: 15, minute: 0 });
  assert.deepEqual(newYork.localDateTime, { year: 2026, month: 11, day: 16, hour: 10, minute: 0 });
  assert.deepEqual(tokyo.localDateTime, { year: 2026, month: 11, day: 17, hour: 0, minute: 0 });
  const moved = buildPicker(settings, { instant: utc(2026, 11, 16, 9, 30) }, {});
  assert.deepEqual(moved[1].localDateTime, { year: 2026, month: 11, day: 16, hour: 4, minute: 30 });
});

test("test_pck_003_working_and_non_working_segments_ex_008", () => {
  const settings = settingsWith([createPlace("a", "london")]);
  const [row] = buildPicker(settings, { instant: utc(2026, 11, 16, 14) }, {});
  assert.equal(kindAt(row, utc(2026, 11, 16, 14)), DayKind.working);
  assert.equal(kindAt(row, utc(2026, 11, 16, 19)), DayKind.nonWorking);
  assert.deepEqual(shape(row), [
    [utc(2026, 11, 16, 0), utc(2026, 11, 16, 9), DayKind.nonWorking],
    [utc(2026, 11, 16, 9), utc(2026, 11, 16, 17), DayKind.working],
    [utc(2026, 11, 16, 17), utc(2026, 11, 17, 0), DayKind.nonWorking],
  ]);
});

test("test_pck_003_working_hours_setting_moves_segments_set_005", () => {
  const settings = { ...settingsWith([createPlace("a", "london")]), workStartMinutes: 450 };
  const [row] = buildPicker(
    { ...settings, workEndMinutes: 960 },
    { instant: utc(2026, 11, 16, 14) },
    {},
  );
  assert.deepEqual(shape(row)[1], [
    utc(2026, 11, 16, 7, 30),
    utc(2026, 11, 16, 16),
    DayKind.working,
  ]);
});

test("test_pck_003_window_crosses_midnight_for_another_place", () => {
  const settings = settingsWith([createPlace("london", "london"), createPlace("riyadh", "riyadh")]);
  const marker = { instant: utc(2026, 11, 19, 12) };
  const window = pickerWindow(settings, { year: 2026, month: 11, day: 19 });
  assert.ok(window);
  const [, riyadh] = buildPicker(settings, marker, {});
  assertCoversWindow(riyadh, window);
  assert.deepEqual(shape(riyadh), [
    [utc(2026, 11, 19, 0), utc(2026, 11, 19, 6), DayKind.nonWorking],
    [utc(2026, 11, 19, 6), utc(2026, 11, 19, 14), DayKind.working],
    [utc(2026, 11, 19, 14), utc(2026, 11, 19, 21), DayKind.nonWorking],
    [utc(2026, 11, 19, 21), utc(2026, 11, 20, 0), DayKind.dayOff],
  ]);
});

test("test_pck_005_weekend_or_holiday_is_day_off_ex_009", () => {
  const saudi = settingsWith([createPlace("a", "riyadh")]);
  const friday = utc(2026, 11, 20, 11);
  const [riyadh] = buildPicker(saudi, { instant: friday }, {});
  assert.equal(kindAt(riyadh, friday), DayKind.dayOff);
  assert.deepEqual(
    riyadh.segments.map((segment) => segment.kind),
    [DayKind.dayOff],
  );
  const american = settingsWith([createPlace("a", "washington-dc")]);
  const christmas = { US: [{ date: "2026-12-25", name: "Christmas Day", regions: [] }] };
  const noonFriday = utc(2026, 12, 25, 17);
  assert.equal(
    kindAt(buildPicker(american, { instant: noonFriday }, christmas)[0], noonFriday),
    DayKind.dayOff,
  );
  assert.equal(
    kindAt(buildPicker(american, { instant: noonFriday }, {})[0], noonFriday),
    DayKind.working,
  );
});

test("test_pck_005_regional_holiday_follows_place_region", () => {
  const regional = { US: [{ date: "2026-12-01", name: "Local Day", regions: ["US-CA"] }] };
  const national = createPlace("a", "washington-dc");
  const withRegion = editPlace([national], "a", { region: "US-CA" })[0];
  const noon = utc(2026, 12, 1, 17);
  const rowOf = (/** @type {import("../../src/domain/places.js").Place} */ place) =>
    buildPicker(settingsWith([place]), { instant: noon }, regional)[0];
  assert.equal(kindAt(rowOf(withRegion), noon), DayKind.dayOff);
  assert.equal(kindAt(rowOf(national), noon), DayKind.working);
});

test("test_pck_006_window_starts_at_midnight_of_the_selected_day_and_lasts_picker_hours", () => {
  const tokyo = settingsWith([createPlace("a", "tokyo"), createPlace("b", "london")]);
  const day20 = { year: 2026, month: 11, day: 20 };
  assert.deepEqual(pickerWindow(tokyo, day20), {
    from: utc(2026, 11, 19, 15),
    to: utc(2026, 11, 20, 15),
  });
  assert.deepEqual(pickerWindow({ ...tokyo, pickerHours: 30 }, day20), {
    from: utc(2026, 11, 19, 15),
    to: utc(2026, 11, 20, 21),
  });
  const london = settingsWith([createPlace("a", "london"), createPlace("b", "tokyo")]);
  const autumnDay = { year: 2026, month: 10, day: 25 };
  const autumn = pickerWindow(london, autumnDay);
  assert.deepEqual(autumn, { from: utc(2026, 10, 24, 23), to: utc(2026, 10, 26, 0) });
  assert.ok(autumn);
  assert.equal(autumn.to - autumn.from, 25 * hour);
  assert.deepEqual(pickerWindow({ ...london, pickerHours: 30 }, autumnDay), {
    from: utc(2026, 10, 24, 23),
    to: utc(2026, 10, 26, 5),
  });
  assert.deepEqual(pickerWindow(london, { year: 2026, month: 3, day: 29 }), {
    from: utc(2026, 3, 29, 0),
    to: utc(2026, 3, 30, 0),
  });
  const newYork = settingsWith([createPlace("a", "washington-dc")]);
  assert.deepEqual(pickerWindow(newYork, { year: 2026, month: 3, day: 8 }), {
    from: utc(2026, 3, 8, 5),
    to: utc(2026, 3, 9, 5),
  });
  const rows = buildPicker(london, { instant: utc(2026, 10, 25, 12) }, {}, autumnDay);
  rows.forEach((row) => assertCoversWindow(row, autumn));
});

test("test_pck_003_rows_are_coloured_over_the_whole_window", () => {
  const settings = {
    ...settingsWith([createPlace("london", "london"), createPlace("tokyo", "tokyo")]),
    pickerHours: 30,
  };
  const day = { year: 2026, month: 11, day: 16 };
  const window = pickerWindow(settings, day);
  assert.deepEqual(window, { from: utc(2026, 11, 16, 0), to: utc(2026, 11, 17, 6) });
  assert.ok(window);
  const [london, tokyo] = buildPicker(settings, { instant: utc(2026, 11, 16, 14) }, {}, day);
  assertCoversWindow(london, window);
  assertCoversWindow(tokyo, window);
  assert.deepEqual(shape(london).at(-1), [
    utc(2026, 11, 16, 17),
    utc(2026, 11, 17, 6),
    DayKind.nonWorking,
  ]);
  assert.equal(kindAt(tokyo, utc(2026, 11, 17, 1)), DayKind.working);
});

test("test_pck_006_marker_is_kept_inside_the_window_and_the_window_stays", () => {
  const settings = { ...settingsWith([createPlace("a", "tokyo")]), pickerHours: 30 };
  const selectedDay = { year: 2026, month: 11, day: 20 };
  const choice = { selectedDay, marker: { instant: utc(2026, 11, 19, 20) } };
  assert.deepEqual(markerInWindow(settings, choice, utc(2026, 11, 20, 17)), {
    instant: utc(2026, 11, 20, 17),
  });
  assert.deepEqual(markerInWindow(settings, choice, utc(2026, 11, 22, 0)), {
    instant: utc(2026, 11, 20, 20, 59),
  });
  assert.deepEqual(markerInWindow(settings, choice, utc(2026, 11, 1, 0)), {
    instant: utc(2026, 11, 19, 15),
  });
  const late = { selectedDay, marker: { instant: utc(2026, 11, 20, 17) } };
  assert.deepEqual(keepMarkerInWindow(settings, late), late.marker);
  assert.deepEqual(keepMarkerInWindow({ ...settings, pickerHours: 24 }, late), {
    instant: utc(2026, 11, 19, 17),
  });
  assert.deepEqual(markerInWindow(settingsWith([]), choice, 5), { instant: 5 });
  assert.deepEqual(keepMarkerInWindow(settingsWith([]), late), late.marker);
});

test("test_pck_009_day_selector_shows_first_and_last_date_of_the_window", () => {
  const tokyo = settingsWith([createPlace("a", "tokyo")]);
  const day20 = { year: 2026, month: 11, day: 20 };
  /**
   * @param {import("../../src/domain/settings.js").Settings} settings
   * @param {import("../../src/domain/weekends.js").CalendarDate} day
   * @returns {string} What the day selector's date button says.
   */
  const label = (settings, day) => {
    const dates = windowDates(settings, day);
    assert.ok(dates);
    return formatDateRange(dates.first, dates.last);
  };
  assert.equal(label(tokyo, day20), "20-Nov-26");
  assert.equal(label({ ...tokyo, pickerHours: 30 }, day20), "20–21-Nov-26");
  assert.equal(
    label({ ...tokyo, pickerHours: 30 }, { year: 2026, month: 11, day: 30 }),
    "30-Nov-26 – 01-Dec-26",
  );
  assert.equal(windowDates(settingsWith([]), day20), null);
});

test("test_pck_006_dst_change_day_splits_segments_at_new_offset", () => {
  const settings = settingsWith([createPlace("a", "jerusalem")]);
  const marker = { instant: utc(2026, 10, 25, 10) };
  const window = pickerWindow(settings, { year: 2026, month: 10, day: 25 });
  assert.deepEqual(window, { from: utc(2026, 10, 24, 21), to: utc(2026, 10, 25, 22) });
  const [jerusalem] = buildPicker(settings, marker, {});
  assertCoversWindow(jerusalem, window);
  assert.deepEqual(shape(jerusalem), [
    [utc(2026, 10, 24, 21), utc(2026, 10, 25, 7), DayKind.nonWorking],
    [utc(2026, 10, 25, 7), utc(2026, 10, 25, 15), DayKind.working],
    [utc(2026, 10, 25, 15), utc(2026, 10, 25, 22), DayKind.nonWorking],
  ]);
});

test("test_pck_007_shift_day_keeps_time_of_day_in_first_place", () => {
  const settings = settingsWith([createPlace("a", "london"), createPlace("b", "tokyo")]);
  const marker = { instant: utc(2026, 11, 16, 15) + 42_000 };
  const choice = { selectedDay: { year: 2026, month: 11, day: 16 }, marker };
  assert.deepEqual(shiftDay(settings, choice, 1), {
    selectedDay: { year: 2026, month: 11, day: 17 },
    marker: { instant: utc(2026, 11, 17, 15) + 42_000 },
  });
  assert.deepEqual(shiftDay(settings, choice, -1).marker, {
    instant: utc(2026, 11, 15, 15) + 42_000,
  });
  const beforeChange = {
    selectedDay: { year: 2026, month: 3, day: 28 },
    marker: { instant: utc(2026, 3, 28, 15) },
  };
  assert.deepEqual(shiftDay(settings, beforeChange, 1).marker, { instant: utc(2026, 3, 29, 14) });
  const newYearsEve = {
    selectedDay: { year: 2026, month: 12, day: 31 },
    marker: { instant: utc(2026, 12, 31, 15) },
  };
  assert.deepEqual(shiftDay(settings, newYearsEve, 1), {
    selectedDay: { year: 2027, month: 1, day: 1 },
    marker: { instant: utc(2027, 1, 1, 15) },
  });
  assert.deepEqual(chooseDay(settings, choice, { year: 2026, month: 7, day: 1 }), {
    selectedDay: { year: 2026, month: 7, day: 1 },
    marker: { instant: utc(2026, 7, 1, 14) + 42_000 },
  });
  assert.deepEqual(shiftDay(settingsWith([]), choice, 1).marker, marker);
  assert.deepEqual(
    markerOnDate(settingsWith([]), marker, { year: 2026, month: 7, day: 1 }),
    marker,
  );
});

test("test_pck_007_missing_time_moves_to_end_of_clock_change", () => {
  const settings = settingsWith([createPlace("a", "london")]);
  const choice = {
    selectedDay: { year: 2026, month: 3, day: 28 },
    marker: { instant: utc(2026, 3, 28, 1, 30) },
  };
  assert.deepEqual(shiftDay(settings, choice, 1).marker, { instant: utc(2026, 3, 29, 1) });
});

test("test_pck_007_a_marker_on_the_next_days_hours_moves_to_the_new_day_ex_020", () => {
  const settings = { ...settingsWith([createPlace("a", "tokyo")]), pickerHours: 30 };
  const choice = {
    selectedDay: { year: 2026, month: 11, day: 20 },
    marker: { instant: utc(2026, 11, 20, 17) },
  };
  assert.deepEqual(shiftDay(settings, choice, 1), {
    selectedDay: { year: 2026, month: 11, day: 21 },
    marker: { instant: utc(2026, 11, 20, 17) },
  });
});

test("test_hij_001_picker_rows_carry_hijri_date_only_when_on", () => {
  const settings = settingsWith([createPlace("a", "riyadh")]);
  const marker = { instant: utc(2026, 11, 16, 9, 25) };
  assert.equal(buildPicker(settings, marker, {})[0].hijri, null);
  const on = buildPicker({ ...settings, showHijri: true }, marker, {});
  assert.deepEqual(on[0].hijri, { day: 6, month: "Jumada II", year: 1448 });
});

test("test_pck_005_picker_day_off_follows_the_places_weekend_days", () => {
  const sundayOnly = editPlace([createPlace("a", "riyadh")], "a", { weekendDays: [7] });
  const settings = settingsWith(sundayOnly);
  const friday = utc(2026, 11, 20, 11);
  const sunday = utc(2026, 11, 22, 11);
  assert.equal(kindAt(buildPicker(settings, { instant: friday }, {})[0], friday), DayKind.working);
  assert.equal(kindAt(buildPicker(settings, { instant: sunday }, {})[0], sunday), DayKind.dayOff);
});

test("test_pck_005_a_vacation_day_is_a_day_off_in_the_picker_ex_029", () => {
  const winter = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };
  const [vacationPlace] = editPlace([createPlace("a", "london")], "a", { vacations: [winter] });
  const settings = settingsWith([vacationPlace, createPlace("b", "washington-dc")]);
  const tuesday = utc(2026, 12, 22, 17);
  const [london, washington] = buildPicker(settings, { instant: tuesday }, {});
  assert.deepEqual(
    london.segments.map((segment) => segment.kind),
    [DayKind.dayOff],
  );
  assert.equal(kindAt(washington, tuesday), DayKind.working);
  const before = utc(2026, 12, 18, 11);
  assert.equal(kindAt(buildPicker(settings, { instant: before }, {})[0], before), DayKind.working);
  const lastDay = utc(2026, 12, 31, 11);
  assert.equal(kindAt(buildPicker(settings, { instant: lastDay }, {})[0], lastDay), DayKind.dayOff);
});

test("test_pck_012_follow_clock_puts_the_marker_at_now_and_the_selected_day_at_today_in_the_first_place", () => {
  const settings = settingsWith([createPlace("a", "tokyo"), createPlace("b", "london")]);
  const now = utc(2026, 11, 24, 1, 45);
  assert.deepEqual(followClock(settings, now), {
    selectedDay: { year: 2026, month: 11, day: 24 },
    marker: { instant: now },
  });
});

test("test_pck_012_follow_clock_after_midnight_in_the_first_place_gives_the_new_day_ex_035", () => {
  const settings = settingsWith([createPlace("a", "tokyo")]);
  const now = utc(2026, 11, 24, 15, 0);
  assert.deepEqual(followClock(settings, now), {
    selectedDay: { year: 2026, month: 11, day: 25 },
    marker: { instant: now },
  });
});

test("test_pck_012_follow_clock_uses_the_utc_date_with_no_places", () => {
  const now = utc(2026, 11, 24, 23, 30);
  assert.deepEqual(followClock(settingsWith([]), now), {
    selectedDay: { year: 2026, month: 11, day: 24 },
    marker: { instant: now },
  });
});

test("test_pck_012_follow_clock_on_a_day_with_a_clock_change_keeps_the_marker_in_the_window", () => {
  const settings = settingsWith([createPlace("a", "london")]);
  const now = utc(2026, 10, 25, 1, 30);
  const { selectedDay, marker } = followClock(settings, now);
  const range = pickerWindow(settings, selectedDay);
  assert.deepEqual(selectedDay, { year: 2026, month: 10, day: 25 });
  assert.equal(marker.instant, now);
  assert.ok(range !== null && marker.instant >= range.from && marker.instant < range.to);
});
