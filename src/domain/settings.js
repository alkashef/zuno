// @ts-check
/**
 * @module domain/settings
 * The settings shape, defaults and validation (SET-005, SET-007, SET-010 to SET-012, SET-015,
 * DEC-016). Invalid input is refused by returning `null`; it is not an error. It does not check
 * one place (domain/places.js does).
 */
import { isUnlistedPlace, restorePlace } from "./places.js";

/** @typedef {import("./places.js").Place} Place */

/**
 * @typedef {object} Settings
 * @property {number} version Record version; 2 is the only one (DEC-016).
 * @property {Place[]} places In display order.
 * @property {number} workStartMinutes Minutes after midnight.
 * @property {number} workEndMinutes Minutes after midnight; after the start.
 * @property {boolean} showCountry Country names next to place names (SET-010).
 * @property {boolean} showHijri The Hijri calendar is on (SET-011).
 * @property {Theme} theme The chosen theme (SET-012, THM-001).
 */

/** @typedef {"auto" | "light" | "dark"} Theme */

/** The theme choices (SET-012): follow the operating system, or always light or always dark. */
export const themes = Object.freeze(/** @type {const} */ (["light", "dark", "auto"]));

/** The current record version. */
export const settingsVersion = 2;

const minutesPerDay = 24 * 60;

/**
 * @param {unknown} value
 * @returns {value is number} Whether it is a whole number of minutes within one day.
 */
function isMinutes(value) {
  return (
    Number.isInteger(value) &&
    /** @type {number} */ (value) >= 0 &&
    /** @type {number} */ (value) <= minutesPerDay
  );
}

/**
 * @param {unknown} start
 * @param {unknown} end
 * @returns {boolean} Whether both are valid minutes and the start is before the end (SET-005).
 */
export function isWorkingHours(start, end) {
  return isMinutes(start) && isMinutes(end) && start < end;
}

/**
 * @param {number} workStartMinutes Default start (from config).
 * @param {number} workEndMinutes Default end (from config).
 * @returns {Settings} Settings with no places, country names and Hijri off, and the theme on Auto
 *   (SET-007, SET-010 to SET-012).
 */
export function defaultSettings(workStartMinutes, workEndMinutes) {
  return {
    version: settingsVersion,
    places: [],
    workStartMinutes,
    workEndMinutes,
    showCountry: false,
    showHijri: false,
    theme: "auto",
  };
}

/**
 * @param {unknown} value
 * @returns {value is Theme} Whether it is one of the theme choices (SET-012).
 */
function isTheme(value) {
  return themes.some((theme) => theme === value);
}

/**
 * Restores the saved places. A place whose city is not in the list is dropped (SET-015); any
 * other fault refuses the whole list.
 * @param {unknown} saved
 * @returns {Place[] | null} The places, or `null` when the list is invalid or two ids repeat.
 */
function restorePlaces(saved) {
  if (!Array.isArray(saved)) return null;
  const places = saved.filter((value) => !isUnlistedPlace(value)).map(restorePlace);
  const valid = places.filter((place) => place !== null);
  const unique = new Set(valid.map((place) => place.id)).size === places.length;
  return valid.length === places.length && unique ? valid : null;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean} Whether both display switches are true or false and the theme is a choice.
 */
function hasValidDisplay(record) {
  return (
    typeof record.showCountry === "boolean" &&
    typeof record.showHijri === "boolean" &&
    isTheme(record.theme)
  );
}

/**
 * Checks a value read from storage. A record without `theme` gets Auto, the default (SET-012).
 * A place whose city is not in the list is dropped (SET-015).
 * @param {unknown} value
 * @returns {Settings | null} The settings when valid, else `null`. Any version but 2, such as a
 *   version 1 record of places by country, is invalid (DEC-016).
 */
export function parseSettings(value) {
  if (typeof value !== "object" || value === null) return null;
  /** @type {Record<string, unknown>} */
  const record = { theme: "auto", ...value };
  const places = restorePlaces(record.places);
  const valid =
    record.version === settingsVersion &&
    isWorkingHours(record.workStartMinutes, record.workEndMinutes) &&
    hasValidDisplay(record) &&
    places !== null;
  return valid ? /** @type {Settings} */ (/** @type {unknown} */ ({ ...record, places })) : null;
}

/**
 * Turns one display switch on or off (SET-010, SET-011).
 * @param {Settings} settings
 * @param {"showCountry" | "showHijri"} name The switch.
 * @param {unknown} value
 * @returns {Settings | null} New settings, or `null` when the value is not `true` or `false`.
 */
export function withDisplaySwitch(settings, name, value) {
  return typeof value === "boolean" ? { ...settings, [name]: value } : null;
}

/**
 * Sets the working hours (SET-005).
 * @param {Settings} settings
 * @param {number} start Minutes after midnight.
 * @param {number} end Minutes after midnight.
 * @returns {Settings | null} New settings, or `null` when the start is not before the end.
 */
export function withWorkingHours(settings, start, end) {
  return isWorkingHours(start, end)
    ? { ...settings, workStartMinutes: start, workEndMinutes: end }
    : null;
}

/**
 * Chooses the theme (SET-012).
 * @param {Settings} settings
 * @param {unknown} value
 * @returns {Settings | null} New settings, or `null` when the value is not a theme choice.
 */
export function withTheme(settings, value) {
  return isTheme(value) ? { ...settings, theme: value } : null;
}
