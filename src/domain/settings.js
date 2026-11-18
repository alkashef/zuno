// @ts-check
/**
 * @module domain/settings
 * The settings shape, defaults and validation (SET-005, SET-007, SET-010 to SET-012, SET-014, SET-015,
 * LAY-003, LAY-005, DEC-016, DEC-019, DEC-028). Invalid input is refused by returning `null`; it is not an error. It
 * does not check one place (domain/places.js does).
 */
import { createPlace, isUnlistedPlace, restorePlace } from "./places.js";

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
 * @property {number} pickerHours Hour slots of the picker window (PCK-006, LAY-003, DEC-019).
 * @property {number | null} mapHeight The map card's height in pixels, or `null` when the map takes
 *   the height the month grid leaves (LAY-004, LAY-005, DEC-028).
 */

/**
 * @typedef {object} PickerLimits The hour slots the picker may show (from config, DEC-019).
 * @property {number} defaultHours For settings that do not say.
 * @property {number} minHours The fewest.
 * @property {number} maxHours The most.
 */

/**
 * @typedef {object} MapLimits The map card heights the user may set (from config, DEC-028).
 * @property {number} minHeight The lowest, in pixels.
 * @property {number} maxHeight The highest, in pixels.
 */

/**
 * @typedef {PickerLimits & { mapLimits: MapLimits }} SettingsLimits Every limit a saved record is
 *   checked against.
 */

/** @typedef {"auto" | "light" | "dark"} Theme */

/** The theme choices (SET-012): follow the operating system, or always light or always dark. */
export const themes = Object.freeze(/** @type {const} */ (["light", "dark", "auto"]));

/** The current record version. */
export const settingsVersion = 2;

const minutesPerDay = 24 * 60;
const hoursPerDay = 24;

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
 * @param {unknown} value
 * @param {PickerLimits} limits
 * @returns {value is number} Whether it is a whole number of hour slots within the limits.
 */
function isPickerHours(value, limits) {
  return (
    Number.isInteger(value) &&
    /** @type {number} */ (value) >= limits.minHours &&
    /** @type {number} */ (value) <= limits.maxHours
  );
}

/**
 * @param {unknown} value
 * @param {MapLimits} limits
 * @returns {value is number} Whether it is a whole number of pixels within the limits.
 */
function isMapHeight(value, limits) {
  return (
    Number.isInteger(value) &&
    /** @type {number} */ (value) >= limits.minHeight &&
    /** @type {number} */ (value) <= limits.maxHeight
  );
}

/**
 * @param {number} workStartMinutes Default start (from config).
 * @param {number} workEndMinutes Default end (from config).
 * @param {readonly string[]} [cityIds] The cities of the default places, in order (from config);
 *   none when left out.
 * @param {number} [pickerHours] Hour slots of the picker (from config); the whole day when left
 *   out (PCK-006).
 * @returns {Settings} Settings with one place per city id, country names and Hijri off, the
 *   theme on Auto, and no map height of the user's (SET-007, SET-010 to SET-012, SET-014, DEC-028).
 */
export function defaultSettings(
  workStartMinutes,
  workEndMinutes,
  cityIds = [],
  pickerHours = hoursPerDay,
) {
  return {
    version: settingsVersion,
    places: cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId)),
    workStartMinutes,
    workEndMinutes,
    showCountry: false,
    showHijri: false,
    theme: "auto",
    pickerHours,
    mapHeight: null,
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
 * @param {PickerLimits} limits
 * @returns {boolean} Whether both display switches are true or false, the theme is a choice and the
 *   picker hours are within the limits.
 */
function hasValidDisplay(record, limits) {
  return (
    typeof record.showCountry === "boolean" &&
    typeof record.showHijri === "boolean" &&
    isTheme(record.theme) &&
    isPickerHours(record.pickerHours, limits)
  );
}

/**
 * @param {unknown} value A saved map height.
 * @param {MapLimits} limits
 * @returns {number | null} The height when it is a whole number within the limits, else `null`
 *   (DEC-028).
 */
function savedMapHeight(value, limits) {
  return isMapHeight(value, limits) ? value : null;
}

/**
 * Checks a value read from storage. A record without `theme` gets Auto, the default (SET-012), and
 * one without `pickerHours` gets the default hours (LAY-003). A `mapHeight` that is missing or
 * outside the map limits reads as `null`, so the places are kept (LAY-005, DEC-028). A place whose
 * city is not in the list is dropped (SET-015).
 * @param {unknown} value
 * @param {SettingsLimits} limits The picker hour and map height limits (from config); required.
 * @returns {Settings | null} The settings when valid, else `null`. Any version but 2, such as a
 *   version 1 record of places by country, is invalid (DEC-016), and so are hours outside the limits.
 * @throws {TypeError} When `limits` is missing.
 */
export function parseSettings(value, limits) {
  if (limits === undefined) throw new TypeError("parseSettings: the argument `limits` is missing");
  if (typeof value !== "object" || value === null) return null;
  /** @type {Record<string, unknown>} */
  const record = { theme: "auto", pickerHours: limits.defaultHours, ...value };
  const places = restorePlaces(record.places);
  const mapHeight = savedMapHeight(record.mapHeight, limits.mapLimits);
  const valid =
    record.version === settingsVersion &&
    isWorkingHours(record.workStartMinutes, record.workEndMinutes) &&
    hasValidDisplay(record, limits) &&
    places !== null;
  return valid
    ? /** @type {Settings} */ (/** @type {unknown} */ ({ ...record, places, mapHeight }))
    : null;
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

/**
 * Sets the number of hour slots of the picker (LAY-002, LAY-003, DEC-019).
 * @param {Settings} settings
 * @param {unknown} hours
 * @param {PickerLimits} limits The picker hour limits (from config).
 * @returns {Settings | null} New settings, or `null` when the hours are not a whole number within
 *   the limits.
 */
export function withPickerHours(settings, hours, limits) {
  return isPickerHours(hours, limits) ? { ...settings, pickerHours: hours } : null;
}

/**
 * Sets the map card's height (LAY-004, LAY-005, DEC-028).
 * @param {Settings} settings
 * @param {unknown} px A whole number of pixels, or `null` for the height the month grid leaves.
 * @param {MapLimits} limits The map height limits (from config).
 * @returns {Settings | null} New settings, or `null` when the value is neither `null` nor a whole
 *   number within the limits.
 */
export function withMapHeight(settings, px, limits) {
  return px === null || isMapHeight(px, limits) ? { ...settings, mapHeight: px } : null;
}
