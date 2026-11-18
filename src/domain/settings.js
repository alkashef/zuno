// @ts-check
/**
 * @module domain/settings
 * The settings shape, defaults and validation (SET-005, SET-007, SET-010 to SET-012, DEC-008).
 * Invalid input is refused by returning `null`; it is not an error.
 */
import { isPlace } from "./places.js";

/** @typedef {import("./places.js").Place} Place */

/**
 * @typedef {object} Settings
 * @property {number} version Record version; 1 is the only one (DEC-008).
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
export const settingsVersion = 1;

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
 * @param {unknown} places
 * @returns {boolean} Whether it is a list of valid places with unique ids.
 */
function isPlaceList(places) {
  return (
    Array.isArray(places) &&
    places.every(isPlace) &&
    new Set(places.map((place) => place.id)).size === places.length
  );
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
 * Checks a value read from storage. A record saved before the theme setting existed has no
 * `theme`; it gets Auto, the default (SET-012).
 * @param {unknown} value
 * @returns {Settings | null} The settings when valid, else `null`. An unknown version is invalid.
 */
export function parseSettings(value) {
  if (typeof value !== "object" || value === null) return null;
  /** @type {Record<string, unknown>} */
  const record = { theme: "auto", ...value };
  const valid =
    record.version === settingsVersion &&
    isWorkingHours(record.workStartMinutes, record.workEndMinutes) &&
    hasValidDisplay(record) &&
    isPlaceList(record.places);
  return valid ? /** @type {Settings} */ (/** @type {unknown} */ (record)) : null;
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
