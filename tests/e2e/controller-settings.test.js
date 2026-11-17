// @ts-check
/** @module controller-settings.test Settings workflows through src/controller.js with fake api, storage and clock (SET-001 to SET-006, SET-008 to SET-011, HIJ-002, HIJ-003). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createController } from "../../src/controller.js";
import { createPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";

/** @typedef {import("../../src/domain/settings.js").Settings} Settings */

const start = Date.UTC(2026, 10, 17, 10);

/**
 * @param {{ saved?: Settings | null, store?: { saved: Settings | null } }} [options] Starting
 *   settings, or a storage record shared between controllers.
 * @returns {{ controller: ReturnType<typeof createController>, calls: string[], store: { saved: Settings | null }, saves: Settings[] }}
 */
function setup({ saved = null, store = { saved } } = {}) {
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
    clock: { now: () => start },
    defaultHours: { start: 540, end: 1020 },
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

test("test_set_001_add_and_remove_place_workflow", async () => {
  const { controller, calls } = setup();
  await controller.dispatch({ type: "open" });
  assert.equal(controller.getState().isEmpty, true);
  await controller.dispatch({ type: "addPlace", countryCode: "GB" });
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
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
  await controller.dispatch({ type: "addPlace", countryCode: "GB" });
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
  await controller.dispatch({ type: "removePlace", placeId: "place-1" });
  await controller.dispatch({ type: "addPlace", countryCode: "JP" });
  assert.deepEqual(placeIds(controller), ["place-2", "place-3"]);
});

test("test_set_001_removed_place_keeps_holidays_another_place_uses", async () => {
  const { controller, calls } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
  await controller.dispatch({ type: "addPlace", countryCode: "GB" });
  await controller.dispatch({ type: "removePlace", placeId: "place-1" });
  assert.deepEqual(Object.keys(controller.getState().holidayResults).sort(), ["GB", "US"]);
  await controller.dispatch({ type: "removePlace", placeId: "place-3" });
  assert.deepEqual(Object.keys(controller.getState().holidayResults), ["US"]);
  assert.deepEqual([...calls].sort(), ["GB-2026", "US-2026"]);
});

test("test_set_001_removing_a_place_closes_its_holiday_card", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", countryCode: "GB" });
  await controller.dispatch({ type: "removePlace", placeId: "place-1" });
  assert.equal(controller.getState().selectedHoliday, null);
});

test("test_set_002_add_country_sets_capital_zone", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
  await controller.dispatch({ type: "addPlace", countryCode: "SA" });
  const zones = controller.getState().settings?.places.map((place) => place.zone);
  assert.deepEqual(zones, ["America/New_York", "Asia/Riyadh"]);
});

test("test_set_003_choose_other_city_zone", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
  await controller.dispatch({
    type: "editPlace",
    placeId: "place-1",
    changes: { zone: "America/Los_Angeles" },
  });
  assert.equal(controller.getState().settings?.places[0].zone, "America/Los_Angeles");
  assert.equal(controller.getState().picker[0].localDateTime.hour, 2);
  await controller.dispatch({
    type: "editPlace",
    placeId: "place-1",
    changes: { zone: "Europe/London" },
  });
  assert.equal(controller.getState().settings?.places[0].zone, "America/Los_Angeles");
});

test("test_set_004_change_is_saved_and_restored_on_next_open", async () => {
  const first = setup();
  await first.controller.dispatch({ type: "open" });
  await first.controller.dispatch({ type: "addPlace", countryCode: "SA" });
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
  assert.equal(controller.getState().settings, null);
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
  await controller.dispatch({ type: "addPlace", countryCode: "GB" });
  const settings = controller.getState().settings;
  assert.deepEqual([settings?.workStartMinutes, settings?.workEndMinutes], [480, 960]);
});

test("test_set_006_choose_region", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
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
  for (const countryCode of ["GB", "US", "JP"]) {
    await controller.dispatch({ type: "addPlace", countryCode });
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
  await controller.dispatch({ type: "addPlace", countryCode: "US" });
  await controller.dispatch({ type: "addPlace", countryCode: "JP" });
  await controller.dispatch({ type: "movePlace", placeId: "place-2", offset: -1 });
  assert.deepEqual(placeIds(controller), ["place-2", "place-1"]);
  assert.deepEqual([...calls].sort(), ["JP-2026", "US-2026"]);
});

test("test_set_009_set_display_name", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", countryCode: "GB" });
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
  await controller.dispatch({ type: "addPlace", countryCode: "SA" });
  assert.equal(controller.getState().grid[0][0].hijri, null);
  await controller.dispatch({ type: "setShowHijri", value: true });
  assert.equal(controller.getState().settings?.showHijri, true);
  assert.notEqual(controller.getState().grid[0][0].hijri, null);
});

test("test_hij_002_choose_variant_per_place", async () => {
  const { controller } = setup();
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addPlace", countryCode: "SA" });
  await controller.dispatch({ type: "addPlace", countryCode: "SA" });
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
      places: [createPlace("a", "SA"), createPlace("b", "SA")],
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
