// @ts-check
/** @module picker.test Unit tests for src/domain/picker.js (PCK-001 to PCK-003, PCK-005 to PCK-007, SET-005, EX-003, EX-008, EX-009). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DayKind,
  buildPicker,
  markerOnDate,
  pickerWindow,
  shiftMarkerDay,
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
    createPlace("a", "GB"),
    createPlace("b", "US"),
    createPlace("c", "JP"),
  ]);
  const rows = buildPicker(settings, { instant: utc(2026, 11, 16, 15) }, {});
  assert.deepEqual(
    rows.map((row) => row.placeId),
    ["a", "b", "c"],
  );
  assert.deepEqual(buildPicker(settingsWith([]), { instant: utc(2026, 11, 16, 15) }, {}), []);
  assert.equal(pickerWindow(settingsWith([]), { instant: utc(2026, 11, 16, 15) }), null);
});

test("test_pck_002_local_time_at_marker_ex_003", () => {
  const settings = settingsWith([
    createPlace("london", "GB"),
    createPlace("newYork", "US"),
    createPlace("tokyo", "JP"),
  ]);
  const [london, newYork, tokyo] = buildPicker(settings, { instant: utc(2026, 11, 16, 15) }, {});
  assert.deepEqual(london.localDateTime, { year: 2026, month: 11, day: 16, hour: 15, minute: 0 });
  assert.deepEqual(newYork.localDateTime, { year: 2026, month: 11, day: 16, hour: 10, minute: 0 });
  assert.deepEqual(tokyo.localDateTime, { year: 2026, month: 11, day: 17, hour: 0, minute: 0 });
  const moved = buildPicker(settings, { instant: utc(2026, 11, 16, 9, 30) }, {});
  assert.deepEqual(moved[1].localDateTime, { year: 2026, month: 11, day: 16, hour: 4, minute: 30 });
});

test("test_pck_003_working_and_non_working_segments_ex_008", () => {
  const settings = settingsWith([createPlace("a", "GB")]);
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
  const settings = { ...settingsWith([createPlace("a", "GB")]), workStartMinutes: 450 };
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
  const settings = settingsWith([createPlace("london", "GB"), createPlace("riyadh", "SA")]);
  const marker = { instant: utc(2026, 11, 19, 12) };
  const window = pickerWindow(settings, marker);
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
  const saudi = settingsWith([createPlace("a", "SA")]);
  const friday = utc(2026, 11, 20, 11);
  const [riyadh] = buildPicker(saudi, { instant: friday }, {});
  assert.equal(kindAt(riyadh, friday), DayKind.dayOff);
  assert.deepEqual(
    riyadh.segments.map((segment) => segment.kind),
    [DayKind.dayOff],
  );
  const american = settingsWith([createPlace("a", "US")]);
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
  const national = createPlace("a", "US");
  const withRegion = editPlace([national], "a", { region: "US-CA" })[0];
  const noon = utc(2026, 12, 1, 17);
  const rowOf = (/** @type {import("../../src/domain/places.js").Place} */ place) =>
    buildPicker(settingsWith([place]), { instant: noon }, regional)[0];
  assert.equal(kindAt(rowOf(withRegion), noon), DayKind.dayOff);
  assert.equal(kindAt(rowOf(national), noon), DayKind.working);
});

test("test_pck_006_window_midnight_to_midnight_of_first_place_23_and_25_hour_days", () => {
  const london = settingsWith([createPlace("a", "GB"), createPlace("b", "JP")]);
  assert.deepEqual(pickerWindow(london, { instant: utc(2026, 11, 16, 23, 59) }), {
    from: utc(2026, 11, 16, 0),
    to: utc(2026, 11, 17, 0),
  });
  const spring = pickerWindow(london, { instant: utc(2026, 3, 29, 12) });
  assert.deepEqual(spring, { from: utc(2026, 3, 29, 0), to: utc(2026, 3, 29, 23) });
  const autumn = pickerWindow(london, { instant: utc(2026, 10, 25, 12) });
  assert.deepEqual(autumn, { from: utc(2026, 10, 24, 23), to: utc(2026, 10, 26, 0) });
  assert.equal(autumn.to - autumn.from, 25 * hour);
  const newYork = settingsWith([createPlace("a", "US")]);
  assert.deepEqual(pickerWindow(newYork, { instant: utc(2026, 3, 9, 3) }), {
    from: utc(2026, 3, 8, 5),
    to: utc(2026, 3, 9, 4),
  });
  const rows = buildPicker(london, { instant: utc(2026, 10, 25, 12) }, {});
  rows.forEach((row) => assertCoversWindow(row, autumn));
});

test("test_pck_006_dst_change_day_splits_segments_at_new_offset", () => {
  const settings = settingsWith([createPlace("a", "IL")]);
  const marker = { instant: utc(2026, 10, 25, 10) };
  const window = pickerWindow(settings, marker);
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
  const settings = settingsWith([createPlace("a", "GB"), createPlace("b", "JP")]);
  const marker = { instant: utc(2026, 11, 16, 15) + 42_000 };
  assert.deepEqual(shiftMarkerDay(settings, marker, 1), {
    instant: utc(2026, 11, 17, 15) + 42_000,
  });
  assert.deepEqual(shiftMarkerDay(settings, marker, -1), {
    instant: utc(2026, 11, 15, 15) + 42_000,
  });
  assert.deepEqual(shiftMarkerDay(settings, { instant: utc(2026, 3, 28, 15) }, 1), {
    instant: utc(2026, 3, 29, 14),
  });
  assert.deepEqual(shiftMarkerDay(settings, { instant: utc(2026, 12, 31, 15) }, 1), {
    instant: utc(2027, 1, 1, 15),
  });
  assert.deepEqual(markerOnDate(settings, marker, { year: 2026, month: 7, day: 1 }), {
    instant: utc(2026, 7, 1, 14) + 42_000,
  });
  assert.deepEqual(shiftMarkerDay(settingsWith([]), marker, 1), marker);
  assert.deepEqual(
    markerOnDate(settingsWith([]), marker, { year: 2026, month: 7, day: 1 }),
    marker,
  );
});

test("test_pck_007_missing_time_moves_to_end_of_clock_change", () => {
  const settings = settingsWith([createPlace("a", "GB")]);
  const marker = { instant: utc(2026, 3, 28, 1, 30) };
  assert.deepEqual(shiftMarkerDay(settings, marker, 1), { instant: utc(2026, 3, 29, 1) });
});

test("test_hij_001_picker_rows_carry_hijri_date_only_when_on", () => {
  const settings = settingsWith([createPlace("a", "SA")]);
  const marker = { instant: utc(2026, 11, 16, 9, 25) };
  assert.equal(buildPicker(settings, marker, {})[0].hijri, null);
  const on = buildPicker({ ...settings, showHijri: true }, marker, {});
  assert.deepEqual(on[0].hijri, { day: 6, month: "Jumada II", year: 1448 });
});
