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
 * @property {{ fileName: string, value: unknown }[]} saved
 * @property {Map<Blob, import("../../src/controller.js").FileRead>} reads
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
      saveJson: (fileName, value) => void fakeFiles.saved.push({ fileName, value }),
      readJson: async (file) => fakeFiles.reads.get(file) ?? { status: "unreadable" },
    },
    holidaysFileName: "zuno-holidays.json",
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

/**
 * @param {FakeFiles} fakeFiles
 * @param {unknown} value What the picked file holds, as parsed JSON; `undefined` for text that is not JSON.
 * @returns {File} A picked file that reads as that value.
 */
function pickedFile(fakeFiles, value) {
  const file = new File(["fake"], "picked.json");
  fakeFiles.reads.set(
    file,
    value === undefined ? { status: "unreadable" } : { status: "read", value },
  );
  return file;
}

test("test_hol_010_export_saves_the_added_and_hidden_holidays_to_a_file", async () => {
  const { controller, fakeFiles } = setup(["mumbai", "new-york"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali });
  await controller.dispatch({ type: "hideHoliday", ...christmas });
  await controller.dispatch({ type: "exportHolidays" });
  assert.deepEqual(fakeFiles.saved, [
    {
      fileName: "zuno-holidays.json",
      value: { version: 1, added: [diwali], hidden: [christmas] },
    },
  ]);
});

test("test_hol_011_import_adds_the_files_holidays_to_the_saved_ones", async () => {
  const first = setup(["mumbai"]);
  await first.controller.dispatch({ type: "open" });
  await first.controller.dispatch({ type: "addHoliday", ...diwali });
  await first.controller.dispatch({ type: "exportHolidays" });
  const exported = first.fakeFiles.saved[0].value;
  const second = setup(["mumbai", "islamabad"]);
  await second.controller.dispatch({ type: "open" });
  await second.controller.dispatch({ type: "addHoliday", ...iqbalDay });
  const file = pickedFile(second.fakeFiles, exported);
  await second.controller.dispatch({ type: "importHolidays", file });
  const merged = { version: 1, added: [iqbalDay, diwali], hidden: [] };
  assert.deepEqual(second.controller.getState().userHolidays, merged);
  assert.deepEqual(second.stores.holidays, merged);
  assert.equal(second.controller.getState().holidayImport, null);
  assert.deepEqual(holidaysInRow(second.controller, 0), ["2026-11-08 Diwali"]);
  await second.controller.dispatch({ type: "importHolidays", file });
  assert.deepEqual(second.stores.holidays, merged);
});

test("test_hol_011_import_keeps_every_saved_entry", async () => {
  const { controller, stores, fakeFiles } = setup(["new-york"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "hideHoliday", ...christmas });
  const file = pickedFile(fakeFiles, { version: 1, added: [], hidden: [] });
  await controller.dispatch({ type: "importHolidays", file });
  assert.deepEqual(stores.holidays, { version: 1, added: [], hidden: [christmas] });
});

test("test_hol_012_invalid_file_changes_nothing_and_is_reported", async () => {
  const { controller, holidaySaves, fakeFiles } = setup(["mumbai"]);
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "addHoliday", ...diwali });
  const before = controller.getState().userHolidays;
  const notJson = pickedFile(fakeFiles, undefined);
  await controller.dispatch({ type: "importHolidays", file: notJson });
  assert.equal(controller.getState().holidayImport, "refused");
  const wrongShape = pickedFile(fakeFiles, { version: 2, added: "yes" });
  await controller.dispatch({ type: "importHolidays", file: wrongShape });
  assert.equal(controller.getState().holidayImport, "refused");
  assert.equal(holidaySaves.length, 1);
  assert.deepEqual(controller.getState().userHolidays, before);
  const good = pickedFile(fakeFiles, { version: 1, added: [], hidden: [] });
  await controller.dispatch({ type: "importHolidays", file: good });
  assert.equal(controller.getState().holidayImport, null);
});
