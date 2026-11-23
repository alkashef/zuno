// @ts-check
/**
 * @module controller-holidays
 * The holidays side of the page workflows: loads the user's holiday record, applies the add, remove,
 * hide, show, export, import, confirm-import, cancel-import and remove-import actions to it and saves it, works out
 * the holidays the page uses (the service's holidays without those the user hid, plus those the user
 * added) and lists the notices about missing holiday data (HOL-003, HOL-004, HOL-006 to HOL-013,
 * HOL-017, HOL-018, HOL-020, HOL-022, HOL-023, REF-002, SET-006, DEC-017, DEC-022, DEC-032, DEC-035). The
 * vacations of a confirmed import, and those a removed import took with it, go to the places through
 * the `changePlaces` it is given. Pure apart from the `holidayStorage`
 * and `files` it is given. It keeps no state (controller.js does, and passes it in), asks the holiday
 * service for nothing (controller.js does, through `api`) and builds no grid, picker or holiday list
 * logic itself (domain/* does). Only controller.js imports it.
 */
import {
  HolidayType,
  listRegions,
  placesMissingRegionalData,
  toHolidays,
  unavailableCountries,
} from "./domain/holidays.js";
import { planImport, toCsv } from "./domain/holidays-file.js";
import { withoutImport } from "./domain/places.js";
import * as userHolidayList from "./domain/user-holidays.js";
import { importVacation } from "./domain/vacations.js";

/** @typedef {import("./domain/holidays.js").Holiday} Holiday */
/** @typedef {import("./domain/holidays.js").HolidayResult} HolidayResult */
/** @typedef {import("./domain/holidays-file.js").ImportPlan} ImportPlan */
/** @typedef {import("./domain/holidays-file.js").ImportRow} ImportRow */
/** @typedef {import("./domain/places.js").Place} Place */
/** @typedef {import("./domain/settings.js").Settings} Settings */
/** @typedef {import("./domain/user-holidays.js").HolidayEntry} HolidayEntry */
/** @typedef {import("./domain/user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {{ countryCode: string, year: number }} CountryYear */
/** @typedef {Record<string, Record<string, HolidayResult>>} ResultsByCountryYear Keyed by country code, then year. */
/** @typedef {{ status: "read", text: string } | { status: "unreadable" }} TextRead What a picked file holds (DEC-032). */

/**
 * @typedef {Omit<ImportPlan, "status"> & { status: "preview", fileName: string, importable: number }} ImportPreview
 *   What importing the picked file would do, kept until the user chooses Add or Cancel (HOL-017,
 *   DEC-032). `importable` is the number of `rows`.
 */

/** @typedef {null | { status: "refused" } | ImportPreview} HolidayImport The state of an import (HOL-012, HOL-017). */

/**
 * @typedef {object} Notices What the notices card lists (REF-002, HOL-004).
 * @property {string[]} countries Country codes with no holiday data for the shown dates.
 * @property {string[]} placeIds Places whose chosen region has no regional holiday data.
 */

/**
 * @typedef {object} HolidayData The parts of the page state the holidays are worked out from.
 * @property {Settings | null} settings
 * @property {ResultsByCountryYear} holidayResults Every answer of the holiday service.
 * @property {UserHolidays} userHolidays
 * @property {HolidayImport} holidayImport
 */

/**
 * @typedef {object} HolidayChanges The state fields the holiday actions change.
 * @property {UserHolidays} [userHolidays]
 * @property {HolidayImport} [holidayImport]
 */

/**
 * @typedef {object} HolidayDeps The outside world the holiday actions use.
 * @property {{ load: () => UserHolidays | null, save: (record: UserHolidays) => void }} holidayStorage
 *   The record of the holidays the user added and hid (HOL-009, DEC-017).
 * @property {{ saveText: (fileName: string, text: string, mimeType: string) => void, readText: (file: Blob) => Promise<TextRead> }} files
 *   Saves the holidays file and reads a picked one (HOL-010 to HOL-012, DEC-032).
 * @property {string} holidaysFileName The name of the exported holidays file.
 * @property {{ now: () => number }} clock The time of an import (HOL-020).
 */

/**
 * @typedef {object} HolidayTable The built-in holiday table's reader (HOL-013, DEC-024).
 * @property {(countryCode: string) => boolean} isTableCountry
 * @property {(countryCode: string, year: number) => Holiday[] | null} tableHolidays
 */

/**
 * @typedef {object} HolidayContext What a holiday action handler uses.
 * @property {HolidayDeps} deps
 * @property {() => HolidayData} read
 * @property {(changes: HolidayChanges) => void} update
 */

/**
 * @typedef {{ type: "exportHolidays" } | { type: "importHolidays", file: File }
 *   | { type: "confirmImport" } | { type: "cancelImport" } | { type: "removeImport", importId: string }
 *   | ({ type: "addHoliday" | "removeHoliday" | "hideHoliday" | "showHoliday" } & HolidayEntry)} HolidayAction
 */

/** @typedef {(ctx: HolidayContext, action: HolidayAction) => void | Promise<void>} HolidayHandler */

/**
 * The answer for a country-year of the built-in table: its holidays as `loaded`, or `unavailable`
 * for a year the table does not cover (HOL-013, EX-023).
 * @param {HolidayTable} table
 * @param {CountryYear} countryYear A year of a table country.
 * @returns {HolidayResult}
 */
export function tableAnswer(table, { countryCode, year }) {
  const holidays = table.tableHolidays(countryCode, year);
  if (holidays === null) {
    return { status: "unavailable", reason: `The holiday table does not cover ${year}` };
  }
  const records = holidays.map(({ date, name }) => ({
    date,
    name,
    holidayTypes: [HolidayType.public],
    subdivisionCodes: null,
  }));
  return { status: "loaded", holidays: records };
}

/**
 * @param {HolidayDeps["holidayStorage"]} holidayStorage
 * @returns {UserHolidays} The saved holidays, or none added and none hidden when no valid record is
 *   saved (HOL-009).
 */
export function loadUserHolidays(holidayStorage) {
  return holidayStorage.load() ?? userHolidayList.emptyUserHolidays();
}

/**
 * @param {Record<string, HolidayResult>} byYear
 * @returns {Holiday[]} The public holidays of every loaded year.
 */
function loadedHolidays(byYear) {
  return Object.values(byYear).flatMap((result) =>
    result.status === "loaded" ? toHolidays(result.holidays) : [],
  );
}

/**
 * @param {HolidayData} state
 * @param {string} countryCode
 * @returns {Holiday[]} The country's holidays as the page uses them: the loaded ones without those
 *   the user hid, plus those the user added (HOL-003).
 */
function countryHolidays(state, countryCode) {
  const loaded = loadedHolidays(state.holidayResults[countryCode] ?? {});
  return userHolidayList.effectiveHolidays(loaded, state.userHolidays, countryCode);
}

/**
 * @param {HolidayData} state
 * @param {Settings} settings The state's settings, known not to be `null`.
 * @returns {Record<string, Holiday[]>} The holidays of every loaded country and of every place's
 *   country, by country code (HOL-003, REF-002).
 */
export function holidaysByCountry(state, settings) {
  const codes = new Set([
    ...Object.keys(state.holidayResults),
    ...settings.places.map((place) => place.countryCode),
  ]);
  return Object.fromEntries([...codes].map((code) => [code, countryHolidays(state, code)]));
}

/**
 * @param {Record<string, Holiday[]>} holidays Every loaded holiday by country code.
 * @returns {Record<string, string[]>} The region codes of each country (SET-006).
 */
export function regionsByCountry(holidays) {
  return Object.fromEntries(
    Object.entries(holidays).map(([countryCode, list]) => [countryCode, listRegions(list)]),
  );
}

/**
 * @param {Record<string, HolidayResult>} byYear
 * @returns {HolidayResult} `unavailable` when any year failed, else every year's records together.
 */
function mergeYears(byYear) {
  const results = Object.values(byYear);
  const failed = results.find((result) => result.status === "unavailable");
  if (failed !== undefined) return failed;
  const holidays = results.flatMap((result) => (result.status === "loaded" ? result.holidays : []));
  return { status: "loaded", holidays };
}

/**
 * @param {ResultsByCountryYear} holidayResults
 * @param {CountryYear[]} needed The country-years the shown month and the picker window need.
 * @returns {Record<string, HolidayResult>} One answer per country, from the needed years only.
 */
function neededResultsByCountry(holidayResults, needed) {
  /** @type {ResultsByCountryYear} */
  const answered = {};
  for (const { countryCode, year } of needed) {
    const result = holidayResults[countryCode]?.[year];
    if (result !== undefined) answered[countryCode] = { ...answered[countryCode], [year]: result };
  }
  return Object.fromEntries(
    Object.entries(answered).map(([countryCode, byYear]) => [countryCode, mergeYears(byYear)]),
  );
}

/**
 * @param {ResultsByCountryYear} holidayResults
 * @param {CountryYear[]} needed The country-years the shown month and the picker window need.
 * @param {Place[]} places The state's places.
 * @param {UserHolidays} userHolidays A country with a holiday added in it is not listed as having
 *   no data; a hidden holiday does not count (HOL-014).
 * @returns {Notices}
 */
export function noticesOf(holidayResults, needed, places, userHolidays) {
  const byCountry = neededResultsByCountry(holidayResults, needed);
  const withAdded = new Set(userHolidays.added.map((entry) => entry.countryCode));
  return {
    countries: unavailableCountries(byCountry).filter((code) => !withAdded.has(code)),
    placeIds: placesMissingRegionalData(places, byCountry).map((place) => place.id),
  };
}

/**
 * Saves a change of the user's holidays and shows it (HOL-006 to HOL-009). `null` is a refused
 * change: nothing is saved or shown.
 * @param {HolidayContext} ctx
 * @param {UserHolidays | null} next
 * @returns {void}
 */
function commitUserHolidays(ctx, next) {
  if (next === null) return;
  ctx.deps.holidayStorage.save(next);
  ctx.update({ userHolidays: next });
}

/**
 * @param {(record: UserHolidays, entry: HolidayEntry) => UserHolidays | null} change
 * @returns {HolidayHandler} The handler that applies the change to the action's country, date and name.
 */
function holidayChange(change) {
  return (ctx, action) => {
    const { countryCode, date, name } = /** @type {HolidayEntry} */ (action);
    commitUserHolidays(ctx, change(ctx.read().userHolidays, { countryCode, date, name }));
  };
}

/**
 * Saves the user's added holidays, hidden holidays and vacations as one CSV file (HOL-010, DEC-032).
 * @param {HolidayContext} ctx
 * @returns {void}
 */
function exportHolidays(ctx) {
  const { settings, userHolidays } = ctx.read();
  const text = toCsv({ userHolidays, places: settings?.places ?? [] });
  ctx.deps.files.saveText(ctx.deps.holidaysFileName, text, "text/csv");
}

/**
 * Reads a picked file and shows what importing it would do; nothing is saved yet (HOL-012, HOL-017).
 * An unreadable file, a file that is not CSV and a file without the header row are refused.
 * @param {HolidayContext} ctx
 * @param {Extract<HolidayAction, { type: "importHolidays" }>} action
 * @returns {Promise<void>}
 */
async function importHolidays(ctx, { file }) {
  const read = await ctx.deps.files.readText(file);
  const places = ctx.read().settings?.places ?? [];
  /** @type {{ status: "refused" } | ImportPlan} */
  const plan = read.status === "read" ? planImport(read.text, { places }) : { status: "refused" };
  if (plan.status !== "plan") {
    ctx.update({ holidayImport: { status: "refused" } });
    return;
  }
  const importable = plan.rows.length;
  ctx.update({ holidayImport: { ...plan, status: "preview", fileName: file.name, importable } });
}

/**
 * @param {ImportRow[]} rows
 * @returns {{ added: HolidayEntry[], hidden: HolidayEntry[] }} The holidays and the hidden holidays of the rows.
 */
function holidaysOf(rows) {
  /** @param {ImportRow["type"]} type */
  const entriesOf = (type) =>
    rows.flatMap((row) => (row.type === type && row.type !== "vacation" ? [row.entry] : []));
  return { added: entriesOf("holiday"), hidden: entriesOf("hiddenHoliday") };
}

/**
 * @param {Place[]} places
 * @param {Extract<ImportRow, { type: "vacation" }>} row
 * @param {string} importId
 * @returns {Place[]} The places with the row's vacation added to its place, from that import; the
 *   same place objects when the vacation is the user's own already (HOL-011, HOL-020).
 */
function withVacationAdded(places, { placeId, vacation }, importId) {
  return places.map((place) => {
    const vacations =
      place.id === placeId ? importVacation(place.vacations, vacation, importId) : null;
    return vacations === null ? place : { ...place, vacations };
  });
}

/**
 * @param {Place[]} places
 * @param {Place[]} next
 * @returns {Place[] | null} The new list, or `null` when no place changed.
 */
function ifChanged(places, next) {
  return next.some((place, at) => place !== places[at]) ? next : null;
}

/**
 * @param {Place[]} places
 * @param {ImportRow[]} rows
 * @param {string} importId
 * @returns {Place[] | null} The places with every new vacation of the rows added, and every one an
 *   earlier import lists tagged, or `null` when none changes.
 */
function withImportedVacations(places, rows, importId) {
  const next = rows.reduce(
    (current, row) =>
      row.type === "vacation" ? withVacationAdded(current, row, importId) : current,
    places,
  );
  return ifChanged(places, next);
}

/**
 * @template {HolidayContext} Ctx
 * @param {import("./controller-places.js").ChangePlaces<Ctx>} changePlaces
 * @returns {(ctx: Ctx) => Promise<void>} The handler that records the file of the shown preview,
 *   adds its rows to the saved holidays and vacations tagged with the record's id, adds no place,
 *   saves what changed and closes the preview (HOL-011, HOL-020, HOL-023). A file with no importable
 *   row makes no record. Without a preview it does nothing.
 */
function confirmImport(changePlaces) {
  return (ctx) => {
    const { holidayImport, userHolidays } = ctx.read();
    if (holidayImport?.status !== "preview") return Promise.resolve();
    const { rows, fileName } = holidayImport;
    if (rows.length === 0) {
      ctx.update({ holidayImport: null });
      return Promise.resolve();
    }
    const id = userHolidayList.nextImportId(userHolidays);
    const record = { id, fileName, importedAt: ctx.deps.clock.now() };
    const merged = userHolidayList.mergeUserHolidays(userHolidays, holidaysOf(rows), record);
    ctx.deps.holidayStorage.save(merged);
    ctx.update({ userHolidays: merged, holidayImport: null });
    return changePlaces(ctx, (places) => withImportedVacations(places, rows, id));
  };
}

/**
 * @template {HolidayContext} Ctx
 * @param {import("./controller-places.js").ChangePlaces<Ctx>} changePlaces
 * @returns {(ctx: Ctx, action: Extract<HolidayAction, { type: "removeImport" }>) => Promise<void>}
 *   The handler that removes an imported file from the list and takes its id out of every entry's
 *   `sources`; the entries it alone listed go, in the holidays record and in the places' vacations,
 *   and both records are saved (HOL-022, HOL-023). An id that no file has changes nothing.
 */
function removeImport(changePlaces) {
  return (ctx, { importId }) => {
    const { userHolidays } = ctx.read();
    if (!userHolidayList.importsOf(userHolidays).some((each) => each.id === importId)) {
      return Promise.resolve();
    }
    const next = userHolidayList.withoutImport(userHolidays, importId);
    ctx.deps.holidayStorage.save(next);
    ctx.update({ userHolidays: next });
    return changePlaces(ctx, (places) => ifChanged(places, withoutImport(places, importId)));
  };
}

/**
 * Closes the import preview and changes nothing (HOL-018).
 * @param {HolidayContext} ctx
 * @returns {void}
 */
function cancelImport(ctx) {
  ctx.update({ holidayImport: null });
}

/**
 * @template {HolidayContext} Ctx
 * @param {import("./controller-places.js").ChangePlaces<Ctx>} changePlaces controller.js's commit of
 *   a changed place list, which the vacations of an import go through.
 * @returns {Record<HolidayAction["type"], (ctx: Ctx, action: HolidayAction) => void | Promise<void>>}
 *   The handler of each holiday action (HOL-006 to HOL-008, HOL-010 to HOL-012, HOL-017, HOL-018, HOL-022).
 */
export function holidayHandlers(changePlaces) {
  return /** @type {Record<HolidayAction["type"], (ctx: Ctx, action: HolidayAction) => void | Promise<void>>} */ ({
    addHoliday: holidayChange(userHolidayList.addHoliday),
    removeHoliday: holidayChange(userHolidayList.removeHoliday),
    hideHoliday: holidayChange(userHolidayList.hideHoliday),
    showHoliday: holidayChange(userHolidayList.showHoliday),
    exportHolidays,
    importHolidays,
    confirmImport: confirmImport(changePlaces),
    cancelImport,
    removeImport: removeImport(changePlaces),
  });
}
