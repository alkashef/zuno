// @ts-check
/**
 * @module controller-holidays
 * The holidays side of the page workflows: loads the user's holiday record, applies the add, remove,
 * hide, show, export and import actions to it and saves it, works out the holidays the page uses
 * (the service's holidays without those the user hid, plus those the user added) and lists the
 * notices about missing holiday data (HOL-003, HOL-004, HOL-006 to HOL-013, REF-002, SET-006,
 * DEC-017, DEC-018, DEC-022). Pure apart from the `holidayStorage`
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
import * as userHolidayList from "./domain/user-holidays.js";

/** @typedef {import("./domain/holidays.js").Holiday} Holiday */
/** @typedef {import("./domain/holidays.js").HolidayResult} HolidayResult */
/** @typedef {import("./domain/places.js").Place} Place */
/** @typedef {import("./domain/settings.js").Settings} Settings */
/** @typedef {import("./domain/user-holidays.js").HolidayEntry} HolidayEntry */
/** @typedef {import("./domain/user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {{ countryCode: string, year: number }} CountryYear */
/** @typedef {Record<string, Record<string, HolidayResult>>} ResultsByCountryYear Keyed by country code, then year. */
/** @typedef {{ status: "read", value: unknown } | { status: "unreadable" }} FileRead What a picked file holds (DEC-018). */

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
 */

/**
 * @typedef {object} HolidayChanges The state fields the holiday actions change.
 * @property {UserHolidays} [userHolidays]
 * @property {"refused" | null} [holidayImport] `refused` while the last imported file was refused (HOL-012).
 */

/**
 * @typedef {object} HolidayDeps The outside world the holiday actions use.
 * @property {{ load: () => UserHolidays | null, save: (record: UserHolidays) => void }} holidayStorage
 *   The record of the holidays the user added and hid (HOL-009, DEC-017).
 * @property {{ saveJson: (fileName: string, value: unknown) => void, readJson: (file: Blob) => Promise<FileRead> }} files
 *   Saves the holidays file and reads a picked one (HOL-010 to HOL-012, DEC-018).
 * @property {string} holidaysFileName The name of the exported holidays file.
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
 * @typedef {{ type: "exportHolidays" } | { type: "importHolidays", file: Blob }
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
 * Saves the user's added and hidden holidays as a file (HOL-010).
 * @param {HolidayContext} ctx
 * @returns {void}
 */
function exportHolidays(ctx) {
  ctx.deps.files.saveJson(ctx.deps.holidaysFileName, ctx.read().userHolidays);
}

/**
 * Adds the holidays of a picked file to the saved ones (HOL-011). A file that is not JSON or not a
 * holidays record changes nothing and is reported (HOL-012).
 * @param {HolidayContext} ctx
 * @param {Extract<HolidayAction, { type: "importHolidays" }>} action
 * @returns {Promise<void>}
 */
async function importHolidays(ctx, { file }) {
  const read = await ctx.deps.files.readJson(file);
  const imported = read.status === "read" ? userHolidayList.parseUserHolidays(read.value) : null;
  if (imported === null) {
    ctx.update({ holidayImport: "refused" });
    return;
  }
  ctx.update({ holidayImport: null });
  commitUserHolidays(ctx, userHolidayList.mergeUserHolidays(ctx.read().userHolidays, imported));
}

/**
 * @returns {Record<HolidayAction["type"], HolidayHandler>} The handler of each holiday action
 *   (HOL-006 to HOL-008, HOL-010 to HOL-012).
 */
export function holidayHandlers() {
  return /** @type {Record<HolidayAction["type"], HolidayHandler>} */ ({
    addHoliday: holidayChange(userHolidayList.addHoliday),
    removeHoliday: holidayChange(userHolidayList.removeHoliday),
    hideHoliday: holidayChange(userHolidayList.hideHoliday),
    showHoliday: holidayChange(userHolidayList.showHoliday),
    exportHolidays,
    importHolidays,
  });
}
