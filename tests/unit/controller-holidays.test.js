// @ts-check
/** @module controller-holidays.test Unit tests for src/controller-holidays.js with fake storage, files and state (HOL-003, HOL-004, HOL-006 to HOL-012, CAL-006, REF-002, SET-006, DEC-017, DEC-018, DEC-022). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  holidayAt,
  holidayHandlers,
  holidaysByCountry,
  loadUserHolidays,
  noticesOf,
  regionsByCountry,
} from "../../src/controller-holidays.js";
import { createPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";
import { emptyUserHolidays } from "../../src/domain/user-holidays.js";
import { usRecords2026 } from "./holiday-fixtures.js";

/** @typedef {import("../../src/controller-holidays.js").HolidayChanges} HolidayChanges */
/** @typedef {import("../../src/controller-holidays.js").HolidayContext} HolidayContext */
/** @typedef {import("../../src/controller-holidays.js").HolidayData} HolidayData */
/** @typedef {import("../../src/controller-holidays.js").HolidayState} HolidayState */
/** @typedef {import("../../src/domain/user-holidays.js").UserHolidays} UserHolidays */

const diwali = Object.freeze({ countryCode: "IN", date: "2026-11-08", name: "Diwali" });
const christmas = Object.freeze({ countryCode: "US", date: "2026-12-25", name: "Christmas Day" });
const losAngeles = { ...createPlace("place-1", "los-angeles"), region: "US-CA" };
const mumbai = createPlace("place-2", "mumbai");
const settings = { ...defaultSettings(540, 1020), places: [losAngeles, mumbai] };

/**
 * @param {Partial<HolidayState>} [state]
 * @returns {HolidayState} A page state with the US 2026 holidays loaded and nothing the user changed.
 */
function stateOf(state = {}) {
  return {
    settings,
    holidayResults: { US: { 2026: { status: "loaded", holidays: usRecords2026() } } },
    userHolidays: emptyUserHolidays(),
    selectedHoliday: null,
    ...state,
  };
}

/**
 * @typedef {object} Fakes What the fake context recorded.
 * @property {UserHolidays[]} saves The records saved through `holidayStorage`.
 * @property {{ fileName: string, value: unknown }[]} files The files saved through `files.saveJson`.
 * @property {HolidayChanges[]} updates The changes handed to `update`.
 * @property {HolidayState} state The current state; `update` merges into it.
 */

/**
 * @param {Partial<HolidayState>} [state]
 * @param {(file: Blob) => Promise<import("../../src/controller-holidays.js").FileRead>} [readJson]
 * @returns {{ ctx: HolidayContext, fakes: Fakes }}
 */
function fakeContext(state, readJson = async () => ({ status: "unreadable" })) {
  /** @type {Fakes} */
  const fakes = { saves: [], files: [], updates: [], state: stateOf(state) };
  /** @type {HolidayContext} */
  const ctx = {
    deps: {
      holidayStorage: { load: () => null, save: (record) => void fakes.saves.push(record) },
      files: {
        saveJson: (fileName, value) => void fakes.files.push({ fileName, value }),
        readJson,
      },
      holidaysFileName: "zuno-holidays.json",
    },
    read: () => fakes.state,
    update(changes) {
      fakes.updates.push(changes);
      fakes.state = { ...fakes.state, ...changes };
    },
  };
  return { ctx, fakes };
}

test("test_hol_009_load_gives_the_saved_record_or_an_empty_one", () => {
  const saved = { version: /** @type {const} */ (1), added: [diwali], hidden: [] };
  assert.deepEqual(loadUserHolidays({ load: () => saved, save: () => {} }), saved);
  assert.deepEqual(loadUserHolidays({ load: () => null, save: () => {} }), emptyUserHolidays());
});

test("test_hol_003_holidays_by_country_are_service_minus_hidden_plus_added_for_every_place", () => {
  const userHolidays = {
    version: /** @type {const} */ (1),
    added: [diwali],
    hidden: [{ ...christmas }],
  };
  const byCountry = holidaysByCountry(stateOf({ userHolidays }), settings);
  assert.deepEqual(Object.keys(byCountry).sort(), ["IN", "US"]);
  assert.deepEqual(
    byCountry.US.map((holiday) => holiday.name),
    ["Good Friday"],
  );
  assert.deepEqual(byCountry.IN, [{ date: "2026-11-08", name: "Diwali", regions: [] }]);
});

test("test_set_006_regions_by_country_list_each_countrys_region_codes", () => {
  const byCountry = holidaysByCountry(stateOf(), settings);
  assert.deepEqual(regionsByCountry(byCountry), { US: ["US-CT", "US-NC"], IN: [] });
});

test("test_ref_002_notices_list_unavailable_countries_from_the_needed_years_only", () => {
  const holidayResults = {
    US: { 2026: /** @type {const} */ ({ status: "unavailable", reason: "down" }) },
    IN: { 2020: /** @type {const} */ ({ status: "unavailable", reason: "down" }) },
  };
  const needed = [
    { countryCode: "US", year: 2026 },
    { countryCode: "IN", year: 2026 },
  ];
  assert.deepEqual(noticesOf(holidayResults, needed, [losAngeles, mumbai], emptyUserHolidays()), {
    countries: ["US"],
    placeIds: [],
  });
});

test("test_hol_014_notice_leaves_out_a_country_with_an_added_holiday", () => {
  const down = /** @type {const} */ ({ status: "unavailable", reason: "down" });
  const holidayResults = { US: { 2026: down }, IN: { 2026: down } };
  const needed = [
    { countryCode: "US", year: 2026 },
    { countryCode: "IN", year: 2026 },
  ];
  const places = [losAngeles, mumbai];
  const added = { version: /** @type {const} */ (1), added: [diwali], hidden: [] };
  assert.deepEqual(noticesOf(holidayResults, needed, places, added).countries, ["US"]);
  const hiddenOnly = { version: /** @type {const} */ (1), added: [], hidden: [{ ...diwali }] };
  assert.deepEqual(noticesOf(holidayResults, needed, places, hiddenOnly).countries, ["IN", "US"]);
});

test("test_hol_004_notices_list_places_whose_region_has_no_regional_data", () => {
  const holidayResults = {
    US: {
      2026: /** @type {const} */ ({ status: "loaded", holidays: usRecords2026().slice(0, 1) }),
    },
  };
  assert.deepEqual(
    noticesOf(
      holidayResults,
      [{ countryCode: "US", year: 2026 }],
      [losAngeles],
      emptyUserHolidays(),
    ),
    {
      countries: [],
      placeIds: ["place-1"],
    },
  );
});

test("test_cal_006_holiday_at_gives_the_cells_holiday_or_null", () => {
  const state = stateOf();
  assert.deepEqual(holidayAt(state, { placeId: "place-1", date: "2026-12-25" }), {
    placeId: "place-1",
    date: "2026-12-25",
    name: "Christmas Day",
  });
  assert.equal(holidayAt(state, { placeId: "place-1", date: "2026-12-26" }), null);
  assert.equal(holidayAt(state, { placeId: "place-9", date: "2026-12-25" }), null);
  assert.equal(holidayAt(stateOf({ settings: null }), { placeId: "place-1", date: "x" }), null);
});

test("test_hol_006_add_saves_the_record_and_shows_it_once", async () => {
  const { ctx, fakes } = fakeContext();
  await holidayHandlers().addHoliday(ctx, { type: "addHoliday", ...diwali });
  assert.deepEqual(fakes.saves, [{ version: 1, added: [diwali], hidden: [] }]);
  assert.equal(fakes.updates.length, 1);
  assert.deepEqual(fakes.state.userHolidays.added, [diwali]);
});

test("test_hol_006_refused_change_saves_and_shows_nothing", async () => {
  const { ctx, fakes } = fakeContext();
  const handlers = holidayHandlers();
  await handlers.addHoliday(ctx, { type: "addHoliday", ...diwali, name: " " });
  await handlers.removeHoliday(ctx, { type: "removeHoliday", ...diwali });
  await handlers.showHoliday(ctx, { type: "showHoliday", ...christmas });
  assert.deepEqual(fakes.saves, []);
  assert.deepEqual(fakes.updates, []);
});

test("test_hol_008_hide_closes_the_card_of_the_hidden_holiday", async () => {
  const selectedHoliday = { placeId: "place-1", date: "2026-12-25", name: "Christmas Day" };
  const { ctx, fakes } = fakeContext({ selectedHoliday });
  await holidayHandlers().hideHoliday(ctx, { type: "hideHoliday", ...christmas });
  assert.equal(fakes.state.selectedHoliday, null);
  assert.deepEqual(fakes.state.userHolidays.hidden, [christmas]);
  await holidayHandlers().showHoliday(ctx, { type: "showHoliday", ...christmas });
  assert.deepEqual(fakes.state.userHolidays.hidden, []);
  assert.equal(fakes.saves.length, 2);
});

test("test_hol_010_export_saves_the_record_under_the_file_name", async () => {
  const userHolidays = { version: /** @type {const} */ (1), added: [diwali], hidden: [] };
  const { ctx, fakes } = fakeContext({ userHolidays });
  await holidayHandlers().exportHolidays(ctx, { type: "exportHolidays" });
  assert.deepEqual(fakes.files, [{ fileName: "zuno-holidays.json", value: userHolidays }]);
  assert.deepEqual(fakes.updates, []);
});

test("test_hol_011_import_merges_the_files_holidays_and_clears_the_refusal", async () => {
  const file = new Blob(["{}"]);
  const record = { version: 1, added: [diwali], hidden: [] };
  const { ctx, fakes } = fakeContext({}, async () => ({
    status: "read",
    value: record,
  }));
  await holidayHandlers().importHolidays(ctx, { type: "importHolidays", file });
  assert.deepEqual(fakes.updates[0], { holidayImport: null });
  assert.deepEqual(fakes.saves, [record]);
  assert.deepEqual(fakes.state.userHolidays.added, [diwali]);
});

test("test_hol_012_import_of_a_bad_file_changes_nothing_and_is_reported", async () => {
  const file = new Blob(["x"]);
  for (const read of [
    /** @type {const} */ ({ status: "unreadable" }),
    /** @type {const} */ ({ status: "read", value: { version: 2 } }),
  ]) {
    const { ctx, fakes } = fakeContext({}, async () => read);
    await holidayHandlers().importHolidays(ctx, { type: "importHolidays", file });
    assert.deepEqual(fakes.updates, [{ holidayImport: "refused" }]);
    assert.deepEqual(fakes.saves, []);
  }
});
