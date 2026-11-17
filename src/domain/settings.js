// @ts-check
/**
 * @module domain/settings
 * The settings shape, defaults and validation (SET-005, SET-007, SET-010, SET-011, DEC-008).
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
 */

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
 * @returns {Settings} Settings with no places, country names and Hijri off (SET-007, SET-010, SET-011).
 */
export function defaultSettings(workStartMinutes, workEndMinutes) {
  return {
    version: settingsVersion,
    places: [],
    workStartMinutes,
    workEndMinutes,
    showCountry: false,
    showHijri: false,
  };
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
 * Checks a value read from storage.
 * @param {unknown} value
 * @returns {Settings | null} The settings when valid, else `null`. An unknown version is invalid.
 */
export function parseSettings(value) {
  if (typeof value !== "object" || value === null) return null;
  const record = /** @type {Record<string, unknown>} */ (value);
  const valid =
    record.version === settingsVersion &&
    isWorkingHours(record.workStartMinutes, record.workEndMinutes) &&
    typeof record.showCountry === "boolean" &&
    typeof record.showHijri === "boolean" &&
    isPlaceList(record.places);
  return valid ? /** @type {Settings} */ (record) : null;
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
