// @ts-check
/** @module controller-holidays.test Unit tests for src/controller-holidays.js with fake storage, files and state (HOL-003, HOL-004, HOL-006 to HOL-012, HOL-017, HOL-018, CAL-006, REF-002, SET-006, DEC-017, DEC-022, DEC-032). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  holidayHandlers,
  holidaysByCountry,
  loadUserHolidays,
  noticesOf,
  regionsByCountry,
} from "../../src/controller-holidays.js";
import { planImport, toCsv } from "../../src/domain/holidays-file.js";
import { createPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";
import { emptyUserHolidays } from "../../src/domain/user-holidays.js";
import { usRecords2026 } from "./holiday-fixtures.js";

/** @typedef {import("../../src/controller-holidays.js").HolidayChanges} HolidayChanges */
/** @typedef {import("../../src/controller-holidays.js").HolidayContext} HolidayContext */
/** @typedef {import("../../src/controller-holidays.js").HolidayData} HolidayData */
/** @typedef {import("../../src/domain/user-holidays.js").UserHolidays} UserHolidays */

const diwali = Object.freeze({ countryCode: "IN", date: "2026-11-08", name: "Diwali" });
const christmas = Object.freeze({ countryCode: "US", date: "2026-12-25", name: "Christmas Day" });
const losAngeles = { ...createPlace("place-1", "los-angeles"), region: "US-CA" };
const mumbai = createPlace("place-2", "mumbai");
const settings = { ...defaultSettings(540, 1020), places: [losAngeles, mumbai] };

/** A `changePlaces` that changes nothing: the holiday actions that never touch the places pass it. */
const keepPlaces = async () => {};

/**
 * @param {Partial<HolidayData>} [state]
 * @returns {HolidayData} A page state with the US 2026 holidays loaded and nothing the user changed.
 */
function stateOf(state = {}) {
  return {
    settings,
    holidayResults: { US: { 2026: { status: "loaded", holidays: usRecords2026() } } },
    userHolidays: emptyUserHolidays(),
    holidayImport: null,
    ...state,
  };
}

/**
 * @typedef {object} Fakes What the fake context recorded.
 * @property {UserHolidays[]} saves The records saved through `holidayStorage`.
 * @property {{ fileName: string, text: string, mimeType: string }[]} files The files saved through `files.saveText`.
 * @property {HolidayChanges[]} updates The changes handed to `update`.
 * @property {HolidayData} state The current state; `update` merges into it.
 */

/**
 * @param {Partial<HolidayData>} [state]
 * @param {(file: Blob) => Promise<import("../../src/controller-holidays.js").TextRead>} [readText]
 * @returns {{ ctx: HolidayContext, fakes: Fakes }}
 */
function fakeContext(state, readText = async () => ({ status: "unreadable" })) {
  /** @type {Fakes} */
  const fakes = { saves: [], files: [], updates: [], state: stateOf(state) };
  /** @type {HolidayContext} */
  const ctx = {
    deps: {
      holidayStorage: { load: () => null, save: (record) => void fakes.saves.push(record) },
      files: {
        saveText: (fileName, text, mimeType) => void fakes.files.push({ fileName, text, mimeType }),
        readText,
      },
      holidaysFileName: "zuno-holidays-and-vacations.csv",
      clock: { now: () => 0 },
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

test("test_hol_006_add_saves_the_record_and_shows_it_once", async () => {
  const { ctx, fakes } = fakeContext();
  await holidayHandlers(keepPlaces).addHoliday(ctx, { type: "addHoliday", ...diwali });
  assert.deepEqual(fakes.saves, [{ version: 1, added: [diwali], hidden: [] }]);
  assert.equal(fakes.updates.length, 1);
  assert.deepEqual(fakes.state.userHolidays.added, [diwali]);
});

test("test_hol_006_refused_change_saves_and_shows_nothing", async () => {
  const { ctx, fakes } = fakeContext();
  const handlers = holidayHandlers(keepPlaces);
  await handlers.addHoliday(ctx, { type: "addHoliday", ...diwali, name: " " });
  await handlers.removeHoliday(ctx, { type: "removeHoliday", ...diwali });
  await handlers.showHoliday(ctx, { type: "showHoliday", ...christmas });
  assert.deepEqual(fakes.saves, []);
  assert.deepEqual(fakes.updates, []);
});

test("test_hol_008_hide_and_show_save_the_record_each_time", async () => {
  const { ctx, fakes } = fakeContext();
  await holidayHandlers(keepPlaces).hideHoliday(ctx, { type: "hideHoliday", ...christmas });
  assert.deepEqual(fakes.state.userHolidays.hidden, [christmas]);
  await holidayHandlers(keepPlaces).showHoliday(ctx, { type: "showHoliday", ...christmas });
  assert.deepEqual(fakes.state.userHolidays.hidden, []);
  assert.equal(fakes.saves.length, 2);
});

test("test_hol_010_export_saves_the_record_as_csv_under_the_file_name", async () => {
  const userHolidays = { version: /** @type {const} */ (1), added: [diwali], hidden: [] };
  const { ctx, fakes } = fakeContext({ userHolidays });
  await holidayHandlers(keepPlaces).exportHolidays(ctx, { type: "exportHolidays" });
  assert.deepEqual(fakes.files, [
    {
      fileName: "zuno-holidays-and-vacations.csv",
      text: toCsv({ userHolidays, places: settings.places }),
      mimeType: "text/csv",
    },
  ]);
  assert.deepEqual(fakes.updates, []);
});

const csvHeader = "Type,Country,Place,Start date,End date,Name";
const winter = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };

/**
 * @param {string} text A file's text.
 * @param {string} [name] The file's name.
 * @returns {{ file: File, readText: (file: Blob) => Promise<import("../../src/controller-holidays.js").TextRead> }}
 *   A picked file and a `readText` that reads it as that text.
 */
function picked(text, name = "a.csv") {
  return { file: new File(["fake"], name), readText: async () => ({ status: "read", text }) };
}

/**
 * @param {string[]} rows Data rows.
 * @returns {import("../../src/controller-holidays.js").ImportPreview} The preview of a file of those rows.
 */
function previewOf(rows) {
  const text = [csvHeader, ...rows, ""].join("\r\n");
  const plan = planImport(text, { places: settings.places });
  if (plan.status !== "plan") throw new Error("the test file was refused");
  return { ...plan, status: "preview", fileName: "a.csv", importable: plan.rows.length };
}

test("test_hol_017_import_sets_a_preview_and_saves_nothing", async () => {
  const { file, readText } = picked(`${csvHeader}\r\nholiday,India,,08-Nov-26,,Diwali\r\n`);
  const { ctx, fakes } = fakeContext({}, readText);
  await holidayHandlers(keepPlaces).importHolidays(ctx, { type: "importHolidays", file });
  assert.deepEqual(fakes.updates, [
    {
      holidayImport: {
        status: "preview",
        fileName: "a.csv",
        total: 1,
        importable: 1,
        missingPlaces: [],
        invalid: 0,
        rows: [{ type: "holiday", entry: diwali }],
      },
    },
  ]);
  assert.deepEqual(fakes.saves, []);
});

test("test_hol_012_import_of_a_bad_file_changes_nothing_and_is_reported", async () => {
  const unreadable = /** @type {const} */ ({ status: "unreadable" });
  const readers = [async () => unreadable, picked("hello").readText, picked("{}").readText];
  for (const readText of readers) {
    const { ctx, fakes } = fakeContext({}, readText);
    const file = new File(["x"], "a.csv");
    await holidayHandlers(keepPlaces).importHolidays(ctx, { type: "importHolidays", file });
    assert.deepEqual(fakes.updates, [{ holidayImport: { status: "refused" } }]);
    assert.deepEqual(fakes.saves, []);
  }
});

test("test_hol_011_confirm_saves_the_holidays_and_hands_the_vacations_to_the_places", async () => {
  const holidayImport = previewOf([
    "holiday,India,,08-Nov-26,,Diwali",
    "hidden holiday,United States,,25-Dec-26,,Christmas Day",
    "vacation,,Mumbai,21-Dec-26,31-Dec-26,Winter break",
  ]);
  const { ctx, fakes } = fakeContext({ holidayImport });
  /** @type {import("../../src/domain/places.js").Place[][]} */
  const changed = [];
  await holidayHandlers(async (_ctx, change) => {
    const places = change(settings.places);
    if (places !== null) changed.push(places);
  }).confirmImport(ctx, { type: "confirmImport" });
  const fromImport = { sources: ["import-1"] };
  assert.deepEqual(fakes.saves, [
    {
      version: 1,
      imports: [{ id: "import-1", fileName: "a.csv", importedAt: 0 }],
      added: [{ ...diwali, ...fromImport }],
      hidden: [{ ...christmas, ...fromImport }],
    },
  ]);
  assert.deepEqual(fakes.state.holidayImport, null);
  assert.equal(changed.length, 1);
  assert.deepEqual(changed[0][1].vacations, [{ ...winter, ...fromImport }]);
  assert.deepEqual(changed[0][0], losAngeles);
});

test("test_hol_011_confirm_changes_no_places_when_no_vacation_is_new", async () => {
  const holidayImport = previewOf(["vacation,,Mumbai,21-Dec-26,31-Dec-26,Winter break"]);
  const placesWithIt = [losAngeles, { ...mumbai, vacations: [winter] }];
  const { ctx, fakes } = fakeContext({
    holidayImport,
    settings: { ...settings, places: placesWithIt },
  });
  /** @type {unknown[]} */
  const answers = [];
  await holidayHandlers(
    async (_ctx, change) => void answers.push(change(placesWithIt)),
  ).confirmImport(ctx, { type: "confirmImport" });
  assert.deepEqual(answers, [null]);
  assert.deepEqual(fakes.saves, [
    {
      version: 1,
      imports: [{ id: "import-1", fileName: "a.csv", importedAt: 0 }],
      added: [],
      hidden: [],
    },
  ]);
  assert.equal(fakes.state.holidayImport, null);
});

test("test_hol_018_cancel_clears_the_preview_and_changes_nothing", async () => {
  const holidayImport = previewOf(["holiday,India,,08-Nov-26,,Diwali"]);
  const { ctx, fakes } = fakeContext({ holidayImport });
  await holidayHandlers(keepPlaces).cancelImport(ctx, { type: "cancelImport" });
  assert.deepEqual(fakes.updates, [{ holidayImport: null }]);
  assert.deepEqual(fakes.saves, []);
});

test("test_hol_011_confirm_with_no_preview_does_nothing", async () => {
  const { ctx, fakes } = fakeContext({ holidayImport: { status: "refused" } });
  await holidayHandlers(keepPlaces).confirmImport(ctx, { type: "confirmImport" });
  assert.deepEqual(fakes.updates, []);
  assert.deepEqual(fakes.saves, []);
});
