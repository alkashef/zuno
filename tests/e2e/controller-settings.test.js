// @ts-check
/** @module controller-settings.test Settings workflows through src/controller.js with fake api, storage and clock (SET-001, SET-002, SET-004 to SET-006, SET-008 to SET-013, SET-015, HIJ-002, HIJ-003, LAY-003, EX-019). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "../../src/config.js";
import { createController } from "../../src/controller.js";
import { createPlace, placeName } from "../../src/domain/places.js";
import { defaultSettings, parseSettings } from "../../src/domain/settings.js";
import { zoneOffset } from "../../src/domain/zones.js";

/** @typedef {import("../../src/domain/settings.js").Settings} Settings */

const start = Date.UTC(2026, 10, 17, 10);

/** @returns {Settings} A saved record with no places, so the page starts empty (SET-007). */
function savedWithNoPlaces() {
  return { ...defaultSettings(540, 1020), places: [] };
}

/**
 * @param {{ saved?: Settings | null, store?: { saved: Settings | null } }} [options] Starting
 *   settings (a saved record with no places unless given; `null` is "nothing saved"), or a storage
 *   record shared between controllers.
 * @returns {{ controller: ReturnType<typeof createController>, calls: string[], store: { saved: Settings | null }, saves: Settings[] }}
 */
function setup({ saved = savedWithNoPlaces(), store = { saved } } = {}) {
  /** @type {string[]} */
  const calls = [];
  /** @type {Settings[]} */
  const saves = [];
  const controller = createController({
    api: {
      getHolidays: async (countryCode, year) => {
        calls.push(`${countryCode}-${year}`);
        return { status: "loaded", holidays: [] };
      },
    },
    storage: {
      load: () => store.saved,
      save: (settings) => {
        store.saved = settings;
        saves.push(settings);
      },
    },
    holidayStorage: { load: () => null, save: () => {} },
    files: { saveJson: () => {}, readJson: async () => ({ status: "unreadable" }) },
    holidaysFileName: "zuno-holidays.json",
    clock: { now: () => start },
    defaultHours: { start: 540, end: 1020 },
    pickerLimits: { defaultHours: 24, minHours: 24, maxHours: 48 },
    defaultCityIds: config.defaultCityIds,
  });
  return { controller, calls, store, saves };
}

/**
 * @param {ReturnType<typeof createController>} controller
 * @returns {string[]} The place ids in the settings, in order.
 */
function placeIds(controller) {
  return (controller.getState().settings?.places ?? []).map((place) => place.id);
}

/**
 * @param {ReturnType<typeof createController>} controller
 * @returns {string[]} The city ids of the places in the settings, in order.
 */
function shownCityIds(controller) {
  return (controller.getState().settings?.places ?? []).map((place) => place.cityId);
}

test("test_set_014_no_saved_settings_shows_the_seven_default_places_in_order", async () => {
  const { controller, calls } = setup({ saved: null });
  await controller.dispatch({ type: "open" });
  const expected = ["tokyo", "cairo", "new-delhi", "madrid", "bogota", "riyadh", "islamabad"];
  assert.deepEqual(shownCityIds(controller), expected);
  assert.equal(controller.getState().isEmpty, false);
  assert.equal(controller.getState().picker.length, 7);
  const countries = ["CO", "EG", "ES", "IN", "JP", "PK", "SA"].map((code) => code + "-2026");
  assert.deepEqual([...calls].sort(), countries);
});

test("test_set_014_defaults_are_not_saved_until_a_setting_changes", async () => {
  const { controller, saves } = setup({ saved: null });
  await controller.dispatch({ type: "open" });
  assert.equal(saves.length, 0);
  await controller.dispatch({ type: "setShowHijri", value: true });
  assert.equal(saves.length, 1);
  assert.deepEqual(
    saves[0].places.map((place) => place.cityId),
    config.defaultCityIds,
  );
});

test("test_set_007_empty_page_only_when_the_settings_hold_no_places", async () => {
  const first = setup({ saved: null });
  await first.controller.dispatch({ type: "open" });
  for (const place of [...(first.controller.getState().settings?.places ?? [])]) {
    await first.controller.dispatch({ type: "removePlace", placeId: place.id });
  }
  assert.equal(first.controller.getState().isEmpty, true);
  const second = setup({ store: first.store });
  await second.controller.dispatch({ type: "open" });
  assert.equal(second.controller.getState().isEmpty, true);
  assert.deepEqual(shownCityIds(second.controller), []);
});

test("test_set_001_add_and_remove_place_workflow", async () => {
  const { controller, calls } = setup();
  await controller.dispatch({ type: "open" });
  assert.equal(controller.getState().isEmpty, true);
  await controller.dispatch({ type: "addPlace", cityId: "london" });
  await controller.dispatch({ type: "addPlace", cityId: "washington-dc" });
  assert.deepEqual(placeIds(controller), ["place-1", "place-2"]);
  assert.equal(controller.getState().isEmpty, false);
  assert.equal(controller.getState().picker.length, 2);
  assert.deepEqual([...calls].sort(), ["GB-2026", "US-2026"]);
  await controller.dispatch({ type: "removePlace", placeId: "place-1" });
  assert.deepEqual(placeIds(controller), ["place-2"]);
  await controller.dispatch({ type: "removePlace", placeId: "place-2" });
  assert.equal(controller.getState().isEmpty, true);
});

test("test_set_001_new_place_after_removal_gets_an_unused_id", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "london" });
  await controller.dispatch({ type: "addPlace", cityId: "washington-dc" });
  await controller.dispatch({ type: "removePlace", placeId: "place-1" });
  await controller.dispatch({ type: "addPlace", cityId: "tokyo" });
  assert.deepEqual(placeIds(controller), ["place-2", "place-3"]);
});

test("test_set_001_removed_place_keeps_holidays_another_place_uses", async () => {
  const { controller, calls } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "washington-dc" });
  await controller.dispatch({ type: "addPlace", cityId: "washington-dc" });
  await controller.dispatch({ type: "addPlace", cityId: "london" });
  await controller.dispatch({ type: "removePlace", placeId: "place-1" });
  assert.deepEqual(Object.keys(controller.getState().holidayResults).sort(), ["GB", "US"]);
  await controller.dispatch({ type: "removePlace", placeId: "place-3" });
  assert.deepEqual(Object.keys(controller.getState().holidayResults), ["US"]);
  assert.deepEqual([...calls].sort(), ["GB-2026", "US-2026"]);
});

test("test_set_001_removing_a_place_closes_its_holiday_card", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "london" });
  await controller.dispatch({ type: "removePlace", placeId: "place-1" });
  assert.equal(controller.getState().selectedHoliday, null);
});

test("test_set_002_add_city_sets_name_country_and_zone", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "mumbai" });
  const place = controller.getState().settings?.places[0];
  assert.equal(place?.cityId, "mumbai");
  assert.equal(place && placeName(place, true), "Mumbai, India");
  assert.equal(place?.zone, "Asia/Kolkata");
  assert.equal(place && zoneOffset(start, place.zone), 5.5 * 60 * 60 * 1000);
});

test("test_set_013_only_listed_cities_can_be_added", async () => {
  const { controller, saves } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "nairobi" });
  assert.deepEqual(saves, []);
  assert.deepEqual(controller.getState().settings?.places, []);
  assert.equal(controller.getState().isEmpty, true);
});

test("test_set_015_saved_place_outside_the_list_is_dropped", async () => {
  const { countryCode, zone, ...london } = createPlace("place-1", "london");
  const unlisted = { ...london, id: "place-2", cityId: "nairobi" };
  const raw = { ...defaultSettings(540, 1020), places: [london, unlisted] };
  const { controller } = setup({ store: { saved: parseSettings(raw) } });
  await controller.dispatch({ type: "open" });
  const places = controller.getState().settings?.places ?? [];
  assert.deepEqual(
    places.map((place) => placeName(place, false)),
    ["London"],
  );
  assert.deepEqual([places[0].countryCode, places[0].zone], [countryCode, zone]);
});

test("test_set_015_version_1_record_is_read_as_no_saved_settings", async () => {
  const raw = { ...defaultSettings(540, 1020), version: 1, places: [createPlace("a", "riyadh")] };
  const { controller } = setup({ store: { saved: parseSettings(raw) } });
  await controller.dispatch({ type: "open" });
  assert.deepEqual(shownCityIds(controller), config.defaultCityIds);
  assert.equal(controller.getState().isEmpty, false);
});

test("test_set_004_change_is_saved_and_restored_on_next_open", async () => {
  const first = setup();
  await first.controller.dispatch({ type: "open" });
  await first.controller.dispatch({ type: "addPlace", cityId: "riyadh" });
  await first.controller.dispatch({ type: "setShowHijri", value: true });
  assert.equal(first.saves.length, 2);
  const second = setup({ store: first.store });
  await second.controller.dispatch({ type: "open" });
  assert.deepEqual(second.controller.getState().settings, first.controller.getState().settings);
  assert.deepEqual(placeIds(second.controller), ["place-1"]);
  assert.equal(second.controller.getState().settings?.showHijri, true);
});

test("test_set_004_refused_change_is_not_saved", async () => {
  const { controller, saves } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setWorkingHours", start: 600, end: 600 });
  assert.deepEqual(saves, []);
  assert.equal(controller.getState().settings?.workStartMinutes, 540);
});

test("test_set_005_set_working_hours", async () => {
  const { controller } = setup({ saved: { ...defaultSettings(540, 1020), places: [] } });
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setWorkingHours", start: 480, end: 960 });
  assert.equal(controller.getState().settings?.workStartMinutes, 480);
  assert.equal(controller.getState().settings?.workEndMinutes, 960);
  await controller.dispatch({ type: "setWorkingHours", start: 960, end: 480 });
  assert.equal(controller.getState().settings?.workStartMinutes, 480);
});

test("test_set_005_hours_set_before_any_place_start_from_the_defaults", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setWorkingHours", start: 480, end: 960 });
  await controller.dispatch({ type: "addPlace", cityId: "london" });
  const settings = controller.getState().settings;
  assert.deepEqual([settings?.workStartMinutes, settings?.workEndMinutes], [480, 960]);
});

test("test_set_006_choose_region", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "washington-dc" });
  assert.equal(controller.getState().settings?.places[0].region, "");
  await controller.dispatch({
    type: "editPlace",
    placeId: "place-1",
    changes: { region: "US-CA" },
  });
  assert.equal(controller.getState().settings?.places[0].region, "US-CA");
  await controller.dispatch({ type: "editPlace", placeId: "place-1", changes: { region: "" } });
  assert.equal(controller.getState().settings?.places[0].region, "");
});

test("test_set_008_move_place_reorders_picker_and_grid", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  for (const cityId of ["london", "washington-dc", "tokyo"]) {
    await controller.dispatch({ type: "addPlace", cityId });
  }
  await controller.dispatch({ type: "movePlace", placeId: "place-3", offset: -1 });
  const state = controller.getState();
  assert.deepEqual(placeIds(controller), ["place-1", "place-3", "place-2"]);
  assert.deepEqual(
    state.picker.map((row) => row.placeId),
    ["place-1", "place-3", "place-2"],
  );
  assert.equal(state.grid.length, 3);
  await controller.dispatch({ type: "movePlace", placeId: "place-1", offset: -1 });
  assert.deepEqual(placeIds(controller), ["place-1", "place-3", "place-2"]);
});

test("test_set_008_new_first_place_requests_its_window_years", async () => {
  const { controller, calls } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "washington-dc" });
  await controller.dispatch({ type: "addPlace", cityId: "tokyo" });
  await controller.dispatch({ type: "movePlace", placeId: "place-2", offset: -1 });
  assert.deepEqual(placeIds(controller), ["place-2", "place-1"]);
  assert.deepEqual([...calls].sort(), ["JP-2026", "US-2026"]);
});

test("test_set_009_set_display_name", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "london" });
  await controller.dispatch({
    type: "editPlace",
    placeId: "place-1",
    changes: { label: "Ana's desk" },
  });
  assert.equal(controller.getState().settings?.places[0].label, "Ana's desk");
});

test("test_set_010_turn_on_country_names", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setShowCountry", value: true });
  assert.equal(controller.getState().settings?.showCountry, true);
  await controller.dispatch({ type: "setShowCountry", value: false });
  assert.equal(controller.getState().settings?.showCountry, false);
});

test("test_set_011_turn_on_hijri", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "riyadh" });
  assert.equal(controller.getState().grid[0][0].hijri, null);
  await controller.dispatch({ type: "setShowHijri", value: true });
  assert.equal(controller.getState().settings?.showHijri, true);
  assert.notEqual(controller.getState().grid[0][0].hijri, null);
});

test("test_hij_002_choose_variant_per_place", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", cityId: "riyadh" });
  await controller.dispatch({ type: "addPlace", cityId: "riyadh" });
  await controller.dispatch({
    type: "editPlace",
    placeId: "place-2",
    changes: { hijriVariant: "tabular" },
  });
  const variants = controller.getState().settings?.places.map((place) => place.hijriVariant);
  assert.deepEqual(variants, ["umalqura", "tabular"]);
});

test("test_hij_003_adjust_hijri_per_place", async () => {
  const { controller } = setup({
    saved: {
      ...defaultSettings(540, 1020),
      showHijri: true,
      places: [createPlace("a", "riyadh"), createPlace("b", "riyadh")],
    },
  });
  await controller.dispatch({ type: "open" });
  const before = controller.getState().grid[0][0].hijri;
  await controller.dispatch({ type: "editPlace", placeId: "a", changes: { hijriAdjust: 1 } });
  const places = controller.getState().settings?.places;
  assert.deepEqual(
    places?.map((place) => place.hijriAdjust),
    [1, 0],
  );
  assert.notDeepEqual(controller.getState().grid[0][0].hijri, before);
  assert.deepEqual(controller.getState().grid[1][0].hijri, before);
  await controller.dispatch({ type: "editPlace", placeId: "a", changes: { hijriAdjust: 2 } });
  assert.equal(controller.getState().settings?.places[0].hijriAdjust, 1);
});

test("test_set_012_choose_theme_is_saved_and_a_wrong_value_refused", async () => {
  const { controller, store } = setup({ saved: null });
  await controller.dispatch({ type: "open" });
  assert.equal(controller.getState().settings?.theme, "auto");
  assert.equal(Boolean(store.saved), false);
  await controller.dispatch({ type: "setTheme", value: "dark" });
  assert.equal(controller.getState().settings?.theme, "dark");
  assert.equal(store.saved?.theme, "dark");
  await controller.dispatch({ type: "setTheme", value: "blue" });
  assert.equal(store.saved?.theme, "dark");
});

test("test_set_016_user_chooses_a_places_weekend_days", async () => {
  const { controller, saves } = setup({
    saved: { ...defaultSettings(540, 1020), places: [createPlace("a", "new-delhi")] },
  });
  await controller.dispatch({ type: "open" });
  const place = () => controller.getState().settings?.places[0];
  assert.equal(place()?.weekendDays, null);
  assert.equal(controller.getState().grid[0][6].isWeekend, false);
  await controller.dispatch({ type: "editPlace", placeId: "a", changes: { weekendDays: [6, 7] } });
  assert.deepEqual(place()?.weekendDays, [6, 7]);
  assert.equal(saves.length, 1);
  const marked = controller.getState().grid[0].filter((day) => day.isWeekend);
  assert.deepEqual(
    marked.slice(1, 3).map((day) => day.date),
    ["2026-11-07", "2026-11-08"],
  );
  for (const weekendDays of [[], [0], [8], [6, 6]]) {
    await controller.dispatch({ type: "editPlace", placeId: "a", changes: { weekendDays } });
  }
  assert.deepEqual(place()?.weekendDays, [6, 7]);
  assert.equal(saves.length, 1);
  await controller.dispatch({ type: "editPlace", placeId: "a", changes: { weekendDays: null } });
  assert.equal(place()?.weekendDays, null);
  assert.equal(saves.length, 2);
});

test("test_lay_003_picker_hours_are_saved_and_restored", async () => {
  const limits = { defaultHours: 24, minHours: 24, maxHours: 48 };
  const saved = { ...defaultSettings(540, 1020), places: [createPlace("a", "tokyo")] };
  const { controller, store, saves } = setup({ saved });
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "setPickerHours", hours: 30 });
  assert.equal(saves.length, 1);
  assert.equal(saves[0].pickerHours, 30);
  for (const hours of [23, 49, 26.5]) {
    await controller.dispatch({ type: "setPickerHours", hours });
  }
  assert.equal(saves.length, 1);
  const reloaded = setup({
    store: { saved: parseSettings(JSON.parse(JSON.stringify(store.saved)), limits) },
  });
  await reloaded.controller.dispatch({ type: "open" });
  const state = reloaded.controller.getState();
  assert.equal(state.settings?.pickerHours, 30);
  const window = state.pickerWindow;
  assert.ok(window);
  assert.equal(window.to - window.from, 30 * 60 * 60 * 1000);
});
