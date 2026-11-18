// @ts-check
/** @module settings.test Unit tests for src/domain/settings.js (SET-005, SET-007, SET-010 to SET-012, SET-015, LAY-003). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "../../src/config.js";
import { createPlace } from "../../src/domain/places.js";
import { placeWeekendDays } from "../../src/domain/weekends.js";

/** @typedef {import("../../src/domain/places.js").Place} Place */
import {
  defaultSettings,
  parseSettings,
  withDisplaySwitch,
  withPickerHours,
  withTheme,
  withWorkingHours,
} from "../../src/domain/settings.js";

const fresh = () => defaultSettings(config.defaultWorkStartMinutes, config.defaultWorkEndMinutes);

/** The picker hour limits from config (LAY-002, DEC-019). */
const limits = {
  defaultHours: config.pickerDefaultHours,
  minHours: config.pickerMinHours,
  maxHours: config.pickerMaxHours,
};

test("test_set_005_default_hours_9am_to_5pm_and_start_before_end", () => {
  const settings = fresh();
  assert.equal(settings.workStartMinutes, 9 * 60);
  assert.equal(settings.workEndMinutes, 17 * 60);
  assert.equal(withWorkingHours(settings, 600, 600), null);
  assert.equal(withWorkingHours(settings, 700, 600), null);
  assert.equal(withWorkingHours(settings, 600, 1500), null);
  assert.equal(withWorkingHours(settings, 480, 960)?.workEndMinutes, 960);
});

test("test_set_007_no_saved_places_means_empty_state", () => {
  assert.deepEqual(fresh().places, []);
});

test("test_set_014_default_settings_hold_the_default_places_in_order", () => {
  const settings = defaultSettings(540, 1020, config.defaultCityIds);
  assert.deepEqual(
    settings.places.map((place) => [place.id, place.cityId]),
    config.defaultCityIds.map((cityId, index) => ["place-" + (index + 1), cityId]),
  );
});

test("test_set_010_country_names_off_by_default", () => {
  assert.equal(fresh().showCountry, false);
});

test("test_set_011_hijri_off_by_default", () => {
  assert.equal(fresh().showHijri, false);
});

test("test_set_004_parse_accepts_valid_and_refuses_invalid", () => {
  const valid = { ...fresh(), places: [createPlace("a", "riyadh")] };
  assert.deepEqual(parseSettings(valid, limits), valid);
  assert.equal(parseSettings({ ...valid, version: 3 }, limits), null);
  assert.equal(parseSettings({ ...valid, showHijri: "yes" }, limits), null);
  assert.equal(
    parseSettings({ ...valid, places: [valid.places[0], valid.places[0]] }, limits),
    null,
  );
  assert.equal(parseSettings({ ...valid, places: [{ id: "x" }] }, limits), null);
  assert.equal(parseSettings("text", limits), null);
});

test("test_set_010_set_011_display_switch_changes_one_switch_and_refuses_non_booleans", () => {
  const settings = fresh();
  assert.deepEqual(withDisplaySwitch(settings, "showCountry", true), {
    ...settings,
    showCountry: true,
  });
  assert.deepEqual(withDisplaySwitch(settings, "showHijri", true), {
    ...settings,
    showHijri: true,
  });
  assert.equal(withDisplaySwitch(settings, "showHijri", "yes"), null);
});

test("test_set_012_theme_is_auto_by_default_and_refuses_other_values", () => {
  const settings = fresh();
  assert.equal(settings.theme, "auto");
  assert.deepEqual(withTheme(settings, "dark"), { ...settings, theme: "dark" });
  assert.deepEqual(withTheme(settings, "light"), { ...settings, theme: "light" });
  assert.equal(withTheme(settings, "blue"), null);
});

test("test_set_012_saved_record_without_theme_gets_auto_and_a_wrong_theme_is_refused", () => {
  const { theme, ...older } = { ...fresh(), places: [createPlace("a", "riyadh")] };
  assert.equal(theme, "auto");
  assert.deepEqual(parseSettings(older, limits), { ...older, theme: "auto" });
  assert.equal(parseSettings({ ...older, theme: "blue" }, limits), null);
});

test("test_lay_003_parse_settings_without_limits_throws", () => {
  const withoutLimits = /** @type {(value: unknown) => unknown} */ (
    /** @type {unknown} */ (parseSettings)
  );
  assert.throws(() => withoutLimits(fresh()), { name: "TypeError", message: /limits/ });
});

test("test_set_015_saved_place_outside_the_list_is_dropped", () => {
  const london = createPlace("a", "london");
  const { countryCode, zone, ...stored } = london;
  const unlisted = { ...stored, id: "b", cityId: "nairobi" };
  const record = { ...fresh(), places: [stored, unlisted] };
  assert.deepEqual(parseSettings(record, limits), {
    ...fresh(),
    places: [{ ...stored, countryCode, zone }],
  });
  assert.equal(
    parseSettings({ ...record, places: [stored, { ...unlisted, cityId: 7 }] }, limits),
    null,
  );
});

test("test_set_015_version_1_record_is_read_as_no_saved_settings", () => {
  const record = { ...fresh(), places: [createPlace("a", "riyadh")] };
  assert.equal(parseSettings({ ...record, version: 1 }, limits), null);
  assert.equal(fresh().version, 2);
});

test("test_set_016_saved_record_without_weekend_days_gets_the_countrys", () => {
  const { weekendDays, ...older } = createPlace("a", "riyadh");
  assert.equal(weekendDays, null);
  const parsed = parseSettings({ ...fresh(), places: [older] }, limits);
  assert.equal(parsed?.places[0].weekendDays, null);
  assert.deepEqual(placeWeekendDays(/** @type {Place} */ (parsed?.places[0])), [5, 6]);
  assert.equal(parsed?.version, 2);
  assert.equal(
    parseSettings({ ...fresh(), places: [{ ...older, weekendDays: [] }] }, limits),
    null,
  );
});

test("test_lay_003_saved_record_without_picker_hours_gets_24", () => {
  const { pickerHours, ...older } = { ...fresh(), places: [createPlace("a", "tokyo")] };
  assert.equal(pickerHours, 24);
  assert.deepEqual(parseSettings(older, limits), { ...older, pickerHours: 24 });
  assert.equal(parseSettings(older, limits)?.version, 2);
  assert.deepEqual(parseSettings({ ...older, pickerHours: 30 }, limits)?.pickerHours, 30);
  assert.equal(parseSettings({ ...older, pickerHours: 23 }, limits), null);
  assert.equal(parseSettings({ ...older, pickerHours: 49 }, limits), null);
  assert.equal(parseSettings({ ...older, pickerHours: 30.5 }, limits), null);
  assert.equal(parseSettings({ ...older, pickerHours: "30" }, limits), null);
});

test("test_lay_003_picker_hours_are_whole_numbers_within_the_limits", () => {
  const settings = fresh();
  assert.deepEqual(withPickerHours(settings, 30, limits), { ...settings, pickerHours: 30 });
  assert.equal(withPickerHours(settings, 48, limits)?.pickerHours, 48);
  assert.equal(withPickerHours(settings, 24, limits)?.pickerHours, 24);
  assert.equal(withPickerHours(settings, 23, limits), null);
  assert.equal(withPickerHours(settings, 49, limits), null);
  assert.equal(withPickerHours(settings, 26.5, limits), null);
  assert.equal(withPickerHours(settings, "30", limits), null);
  assert.equal(defaultSettings(540, 1020, [], 30).pickerHours, 30);
});
