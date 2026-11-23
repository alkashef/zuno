// @ts-check
/**
 * @module domain/zone-table
 * Looks up the zone table of custom places (SET-015, SET-018, MAP-002, DEC-029): every time zone
 * with its country and the coordinates of its principal location, one zone by name, and the known
 * country and territory codes. It is the only reader of `data/zone-table.js`. It does not make or
 * check places (domain/places.js does) and does not name countries (domain/cities.js does).
 */
import { countryCodes, zones } from "../../data/zone-table.js";

/** @typedef {import("../../data/zone-table.js").ZoneRow} ZoneRow */

/** @returns {readonly ZoneRow[]} Every zone of the table, sorted by zone name. */
export function listZones() {
  return zones;
}

/**
 * @param {unknown} zone
 * @returns {ZoneRow | null} The table's row of that zone, or `null` when the table has none.
 */
export function zoneRow(zone) {
  return zones.find((row) => row.zone === zone) ?? null;
}

/**
 * @param {unknown} zone
 * @returns {zone is string} Whether the zone is in the table (SET-015).
 */
export function isKnownZone(zone) {
  return zoneRow(zone) !== null;
}

/** @returns {readonly string[]} Every known country and territory code, sorted. */
export function listCountryCodes() {
  return countryCodes;
}

/**
 * @param {unknown} code
 * @returns {code is string} Whether the code names a country or territory of the table (SET-015,
 *   HOL-006).
 */
export function isKnownCountry(code) {
  return countryCodes.some((each) => each === code);
}
