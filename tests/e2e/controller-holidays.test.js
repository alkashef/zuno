// @ts-check
/** @module controller-holidays.test Holiday workflows through src/controller.js with fake api, storages, files and clock (HOL-003, HOL-006 to HOL-012, EX-015 to EX-018, DEC-017, DEC-018). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createController } from "../../src/controller.js";
import { createPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";
import { emptyHolidayTable, serviceRecord } from "../unit/holiday-fixtures.js";

/** @typedef {import("../../src/domain/settings.js").Settings} Settings */
/** @typedef {import("../../src/domain/user-holidays.js").UserHolidays} UserHolidays */

/** 17 November 2026, 10:00 UTC: a Tuesday, 15:30 in India. */
const start = Date.UTC(2026, 10, 17, 10);
const diwali = Object.freeze({ countryCode: "IN", date: "2026-11-08", name: "Diwali" });
const christmas = Object.freeze({ countryCode: "US", date: "2026-12-25", name: "Christmas Day" });

/**
 * @typedef {object} Stores What the fake storages hold, shared between controllers.
 * @property {Settings | null} settings
 * @property {UserHolidays | null} holidays
 */

/**
 * @typedef {object} FakeFiles The fake `files`: what it saved, and what each picked file reads as.
 * @property {{ fileName: string, text: string, mimeType: string }[]} saved
 * @property {Map<Blob, import("../../src/controller.js").TextRead>} reads
 */

/**
 * @param {string[]} cityIds
 * @param {Stores} [stores]
 * @returns {{ controller: ReturnType<typeof createController>, stores: Stores, settingsSaves: Settings[], holidaySaves: UserHolidays[], fakeFiles: FakeFiles }}
 */
function setup(cityIds, stores) {
  const places = cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId));
  const shared = stores ?? { settings: { ...defaultSettings(540, 1020), places }, holidays: null };
  /** @type {Settings[]} */
  const settingsSaves = [];
  /** @type {UserHolidays[]} */
  const holidaySaves = [];
  /** @type {FakeFiles} */
  const fakeFiles = { saved: [], reads: new Map() };
  const controller = createController({
    holidayTable: emptyHolidayTable,
    api: {
      getHolidays: async (countryCode, year) => ({
        status: "loaded",
        holidays:
          countryCode === "US" ? [serviceRecord(`${year}-12-25`, "Christmas Day", ["Public"])] : [],
      }),
    },
    storage: {
      load: () => shared.settings,
      save: (settings) => void settingsSaves.push((shared.settings = settings)),
    },
    holidayStorage: {
      load: () => shared.holidays,
      save: (record) => void holidaySaves.push((shared.holidays = record)),
    },
    files: {
      saveText: (fileName, text, mimeType) =>
        void fakeFiles.saved.push({ fileName, text, mimeType }),
      readText: async (file) => fakeFiles.reads.get(file) ?? { status: "unreadable" },
    },
    holidaysFileName: "zuno-holidays-and-vacations.csv",
    clock: { now: () => start },
    defaultHours: { start: 540, end: 1020 },
    pickerLimits: { defaultHours: 24, minHours: 24, maxHours: 48 },
    mapLimits: { minHeight: 240, maxHeight: 900 },
    defaultCityIds: [],
  });
  return { controller, stores: shared, settingsSaves, holidaySaves, fakeFiles };
}

/**
 * @param {ReturnType<typeof createController>} controller
 * @param {number} row
 * @returns {string[]} The holidays of one grid row, as `date name`.
 */
function holidaysInRow(controller, row) {
  return controller
    .getState()
    .grid[row].filter((day) => day.holidayName !== null)
    .map((day) => `${day.date} ${day.holidayName}`);
}

/**
 * @param {ReturnType<typeof createController>} controller
 * @param {number} row
 * @returns {string | undefined} The kind of the picker row's segment at the marker.
 */
function kindAtMarker(controller, row) {
  const { picker, marker } = controller.getState();
  return picker[row].segments.find(
    (segment) => segment.from <= marker.instant && marker.instant < segment.to,
  )?.kind;
}

test("test_hol_006_added_holiday_shows_for_every_place_of_its_country", async () => {
  const { controller, holidaySaves } = setup(["mumbai", "pune", "london"]);
  await controller.dispatch({ type: "open" });
  assert.deepEqual(holidaysInRow(controller, 0), []);
  await controller.dispatch({ type: "addHoliday", ...diwali });
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-11-08 Diwali"]);
  assert.deepEqual(holidaysInRow(controller, 1), ["2026-11-08 Diwali"]);
  assert.deepEqual(holidaysInRow(controller, 2), []);
  assert.deepEqual(controller.getState().userHolidays.added, [diwali]);
  assert.equal(holidaySaves.length, 1);
  assert.equal(kindAtMarker(controller, 1), "working");
  await controller.dispatch({ type: "addHoliday", ...diwali, date: "2026-11-17" });
  assert.equal(kindAtMarker(controller, 0), "dayOff");
  assert.equal(kindAtMarker(controller, 1), "dayOff");
});

test("test_hol_006_refused_holiday_action_saves_nothing", async () => {
  const { controller, holidaySaves } = setup(["mumbai"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali, date: "2026-02-30" });
  await controller.dispatch({ type: "addHoliday", ...diwali, name: " " });
  await controller.dispatch({ type: "addHoliday", ...diwali, countryCode: "ZZ" });
  await controller.dispatch({ type: "removeHoliday", ...diwali });
  await controller.dispatch({ type: "showHoliday", ...christmas });
  assert.deepEqual(holidaySaves, []);
  assert.deepEqual(controller.getState().userHolidays, { version: 1, added: [], hidden: [] });
});

test("test_hol_007_remove_an_added_holiday_without_selecting_it", async () => {
  const { controller, holidaySaves } = setup(["mumbai"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali });
  const cell = controller.getState().grid[0].find((day) => day.date === diwali.date);
  assert.equal(cell?.holidayAdded, true);
  assert.equal("selectedHoliday" in controller.getState(), false);
  await controller.dispatch({ type: "removeHoliday", ...diwali });
  assert.deepEqual(holidaysInRow(controller, 0), []);
  assert.deepEqual(holidaySaves.at(-1)?.added, []);
});

test("test_hol_008_hide_a_service_holiday_without_selecting_it", async () => {
  const { controller, holidaySaves } = setup(["new-york"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "showMonth", offset: 1 });
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-12-25 Christmas Day"]);
  const shown = controller.getState().grid[0].find((day) => day.date === christmas.date);
  assert.equal(shown?.holidayAdded, false);
  await controller.dispatch({ type: "hideHoliday", ...christmas });
  assert.deepEqual(holidaysInRow(controller, 0), []);
  assert.deepEqual(controller.getState().userHolidays.hidden, [christmas]);
  await controller.dispatch({ type: "showHoliday", ...christmas });
  assert.deepEqual(holidaysInRow(controller, 0), ["2026-12-25 Christmas Day"]);
  assert.deepEqual(holidaySaves.at(-1)?.hidden, []);
  assert.equal(holidaySaves.length, 2);
});

test("test_hol_009_added_and_hidden_holidays_are_saved_and_restored", async () => {
  const first = setup(["mumbai", "new-york"]);
  await first.controller.dispatch({ type: "open" });
  await first.controller.dispatch({ type: "addHoliday", ...diwali });
  await first.controller.dispatch({ type: "hideHoliday", ...christmas });
  assert.deepEqual(first.stores.holidays, { version: 1, added: [diwali], hidden: [christmas] });
  const second = setup([], first.stores);
  await second.controller.dispatch({ type: "open" });
  assert.deepEqual(second.controller.getState().userHolidays, first.stores.holidays);
  assert.deepEqual(holidaysInRow(second.controller, 0), ["2026-11-08 Diwali"]);
  await second.controller.dispatch({ type: "showMonth", offset: 1 });
  assert.deepEqual(holidaysInRow(second.controller, 1), []);
});

test("test_hol_009_no_saved_record_means_no_added_and_no_hidden_holidays", async () => {
  const { controller } = setup(["new-york"]);
  await controller.dispatch({ type: "open" });
  assert.deepEqual(controller.getState().userHolidays, { version: 1, added: [], hidden: [] });
});

test("test_dec_017_holiday_actions_leave_the_settings_record_and_service_data_unsaved", async () => {
  const { controller, settingsSaves, holidaySaves } = setup(["mumbai", "new-york"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali });
  await controller.dispatch({ type: "hideHoliday", ...christmas });
  await controller.dispatch({ type: "removeHoliday", ...diwali });
  await controller.dispatch({ type: "showHoliday", ...christmas });
  assert.deepEqual(settingsSaves, []);
  assert.equal(holidaySaves.length, 4);
  for (const record of holidaySaves) {
    assert.deepEqual(Object.keys(record).sort(), ["added", "hidden", "version"]);
  }
  assert.deepEqual(holidaySaves.at(-1), { version: 1, added: [], hidden: [] });
});

const iqbalDay = Object.freeze({ countryCode: "PK", date: "2026-11-09", name: "Iqbal Day" });
const header = "Type,Country,Place,Start date,End date,Name";
const winter = Object.freeze({ start: "2026-12-21", end: "2026-12-31", label: "Winter break" });

/**
 * @param {FakeFiles} fakeFiles
 * @param {string | undefined} text What the picked file holds; `undefined` for a file that cannot be read.
 * @param {string} [fileName]
 * @returns {File} A picked file that reads as that text.
 */
function pickedFile(fakeFiles, text, fileName = "picked.csv") {
  const file = new File(["fake"], fileName);
  fakeFiles.reads.set(
    file,
    text === undefined ? { status: "unreadable" } : { status: "read", text },
  );
  return file;
}

/**
 * @param {...string} lines The data rows of a file.
 * @returns {string} A file with the header row and those rows.
 */
function fileOf(...lines) {
  return [header, ...lines, ""].join("\r\n");
}

/**
 * @param {ReturnType<typeof setup>} app A controller with the city London.
 * @returns {Promise<void>} Opens it and adds the custom place Sara, which gets the id `place-2`.
 */
async function openWithSara({ controller }) {
  await controller.dispatch({ type: "open" });
  await controller.dispatch({
    type: "addCustomPlace",
    name: "Sara",
    zone: "Europe/Lisbon",
    countryCode: "PT",
  });
}

/** The four rows of EX-032: a holiday, two vacations of Sara and one of a place named Omar. */
const ex032File = fileOf(
  "holiday,India,,08-Nov-26,,Diwali",
  "vacation,,Sara,21-Dec-26,31-Dec-26,Winter break",
  "vacation,,Sara,01-Aug-26,15-Aug-26,Summer",
  "vacation,,Omar,01-Jan-27,05-Jan-27,Trip",
);

/**
 * @param {ReturnType<typeof createController>} controller
 * @param {string} placeId
 * @returns {import("../../src/domain/vacations.js").Vacation[]} That place's saved vacations.
 */
function vacationsOf(controller, placeId) {
  return controller.getState().settings?.places.find((p) => p.id === placeId)?.vacations ?? [];
}

test("test_hol_010_export_saves_one_csv_file_with_the_configured_name", async () => {
  const { controller, fakeFiles } = setup(["mumbai", "new-york"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali });
  await controller.dispatch({ type: "hideHoliday", ...christmas });
  await controller.dispatch({ type: "exportHolidays" });
  const bom = String.fromCharCode(0xfeff);
  assert.deepEqual(fakeFiles.saved, [
    {
      fileName: "zuno-holidays-and-vacations.csv",
      text: [
        `${bom}${header}`,
        "holiday,India,,08-Nov-26,,Diwali",
        "hidden holiday,United States,,25-Dec-26,,Christmas Day",
        "",
      ].join("\r\n"),
      mimeType: "text/csv",
    },
  ]);
});

test("test_hol_017_import_shows_a_preview_and_changes_nothing_yet", async () => {
  const app = setup(["london"]);
  await openWithSara(app);
  const { controller, fakeFiles, holidaySaves, settingsSaves } = app;
  const savesBefore = settingsSaves.length;
  const file = pickedFile(fakeFiles, ex032File, "team.csv");
  await controller.dispatch({ type: "importHolidays", file });
  const { holidayImport } = controller.getState();
  assert.equal(holidayImport?.status, "preview");
  assert.deepEqual(
    holidayImport?.status === "preview" && [
      holidayImport.fileName,
      holidayImport.total,
      holidayImport.importable,
      holidayImport.missingPlaces,
      holidayImport.invalid,
    ],
    ["team.csv", 4, 3, ["Omar"], 0],
  );
  assert.deepEqual(holidaySaves, []);
  assert.equal(settingsSaves.length, savesBefore);
  assert.deepEqual(controller.getState().userHolidays, { version: 1, added: [], hidden: [] });
  assert.deepEqual(vacationsOf(controller, "place-2"), []);
});

test("test_hol_011_confirm_adds_the_holidays_and_vacations_and_no_place_ex_032", async () => {
  const app = setup(["london"]);
  await openWithSara(app);
  const { controller, fakeFiles, stores } = app;
  const placesBefore = controller.getState().settings?.places.map((place) => place.id);
  await controller.dispatch({ type: "importHolidays", file: pickedFile(fakeFiles, ex032File) });
  await controller.dispatch({ type: "confirmImport" });
  assert.deepEqual(controller.getState().userHolidays.added, [diwali]);
  assert.deepEqual(stores.holidays?.added, [diwali]);
  assert.deepEqual(vacationsOf(controller, "place-2"), [
    winter,
    { start: "2026-08-01", end: "2026-08-15", label: "Summer" },
  ]);
  assert.deepEqual(stores.settings?.places[1].vacations, vacationsOf(controller, "place-2"));
  assert.deepEqual(
    controller.getState().settings?.places.map((place) => place.id),
    placesBefore,
  );
  assert.equal(controller.getState().holidayImport, null);
});

test("test_hol_011_confirm_keeps_every_saved_entry_and_adds_hidden_holidays", async () => {
  const { controller, stores, fakeFiles } = setup(["new-york", "mumbai"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali });
  const text = fileOf(
    "hidden holiday,United States,,25-Dec-26,,Christmas Day",
    "holiday,India,,08-Nov-26,,Diwali",
  );
  await controller.dispatch({ type: "importHolidays", file: pickedFile(fakeFiles, text) });
  await controller.dispatch({ type: "confirmImport" });
  assert.deepEqual(stores.holidays, { version: 1, added: [diwali], hidden: [christmas] });
});

test("test_hol_011_an_identical_vacation_is_skipped", async () => {
  const app = setup(["london"]);
  await openWithSara(app);
  const { controller, fakeFiles, settingsSaves } = app;
  const add = { type: /** @type {const} */ ("addVacation"), placeId: "place-2", ...winter };
  await controller.dispatch(add);
  const text = fileOf("vacation,,Sara,21-Dec-26,31-Dec-26,Winter break");
  await controller.dispatch({ type: "importHolidays", file: pickedFile(fakeFiles, text) });
  const savesBefore = settingsSaves.length;
  await controller.dispatch({ type: "confirmImport" });
  assert.deepEqual(vacationsOf(controller, "place-2"), [winter]);
  assert.equal(settingsSaves.length, savesBefore);
});

test("test_hol_018_cancel_changes_nothing_ex_032", async () => {
  const app = setup(["london"]);
  await openWithSara(app);
  const { controller, fakeFiles, holidaySaves, settingsSaves } = app;
  const savesBefore = settingsSaves.length;
  await controller.dispatch({ type: "importHolidays", file: pickedFile(fakeFiles, ex032File) });
  await controller.dispatch({ type: "cancelImport" });
  assert.equal(controller.getState().holidayImport, null);
  assert.deepEqual(holidaySaves, []);
  assert.equal(settingsSaves.length, savesBefore);
  assert.deepEqual(controller.getState().userHolidays, { version: 1, added: [], hidden: [] });
  assert.deepEqual(vacationsOf(controller, "place-2"), []);
  await controller.dispatch({ type: "confirmImport" });
  assert.deepEqual(holidaySaves, []);
});

test("test_hol_012_a_refused_file_changes_nothing_ex_018", async () => {
  const { controller, holidaySaves, settingsSaves, fakeFiles } = setup(["mumbai"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali });
  const before = controller.getState().userHolidays;
  for (const text of ["hello", undefined, '{"version":1,"added":[],"hidden":[]}']) {
    const file = pickedFile(fakeFiles, text);
    await controller.dispatch({ type: "importHolidays", file });
    assert.deepEqual(controller.getState().holidayImport, { status: "refused" });
    await controller.dispatch({ type: "confirmImport" });
  }
  assert.equal(holidaySaves.length, 1);
  assert.deepEqual(settingsSaves, []);
  assert.deepEqual(controller.getState().userHolidays, before);
  await controller.dispatch({ type: "importHolidays", file: pickedFile(fakeFiles, fileOf()) });
  assert.equal(controller.getState().holidayImport?.status, "preview");
});

test("test_hol_011_a_file_exported_by_browser_a_imports_in_browser_b_ex_017", async () => {
  const first = setup(["mumbai"]);
  await first.controller.dispatch({ type: "open" });
  await first.controller.dispatch({ type: "addHoliday", ...diwali });
  await first.controller.dispatch({ type: "exportHolidays" });
  const [{ text }] = first.fakeFiles.saved;
  const second = setup(["mumbai", "islamabad"]);
  await second.controller.dispatch({ type: "open" });
  await second.controller.dispatch({ type: "addHoliday", ...iqbalDay });
  const file = pickedFile(second.fakeFiles, text);
  await second.controller.dispatch({ type: "importHolidays", file });
  const { holidayImport } = second.controller.getState();
  assert.deepEqual(
    holidayImport?.status === "preview" && [holidayImport.importable, holidayImport.total],
    [1, 1],
  );
  await second.controller.dispatch({ type: "confirmImport" });
  const merged = { version: 1, added: [iqbalDay, diwali], hidden: [] };
  assert.deepEqual(second.stores.holidays, merged);
  assert.deepEqual(holidaysInRow(second.controller, 0), ["2026-11-08 Diwali"]);
});
