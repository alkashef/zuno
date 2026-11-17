// @ts-check
/**
 * @module domain/countries
 * Looks up countries: English names, the capital's zone (SET-002) and the other city zones of a
 * country with several (SET-003). It reads only `data/countries.js` (DEC-004).
 */
import { countryTable } from "../../data/countries.js";

/** @typedef {import("../../data/countries.js").CityZone} CityZone */

/**
 * @typedef {object} CountryName A country for a pick list.
 * @property {string} code ISO 3166-1 alpha-2 code.
 * @property {string} name English name.
 */

const regionNames = new Intl.DisplayNames("en", { type: "region" });

/**
 * @param {string} code ISO 3166-1 alpha-2 code.
 * @returns {import("../../data/countries.js").CountryRow} The table row.
 * @throws {RangeError} When the code is not in the table.
 */
function findRow(code) {
  const row = countryTable.find((candidate) => candidate.code === code);
  if (row === undefined) {
    throw new RangeError(`Unknown country code: ${code}`);
  }
  return row;
}

/**
 * @param {string} code ISO 3166-1 alpha-2 code.
 * @returns {string} The English name of the country (NFR-003).
 * @throws {RangeError} When the code is not in the table.
 */
export function countryName(code) {
  return regionNames.of(findRow(code).code) ?? code;
}

/**
 * @returns {CountryName[]} Every country, sorted by English name.
 */
export function listCountries() {
  return countryTable
    .map((row) => ({ code: row.code, name: countryName(row.code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/**
 * @param {string} code ISO 3166-1 alpha-2 code.
 * @returns {CityZone} The capital's city, zone and coordinates (SET-002).
 * @throws {RangeError} When the code is not in the table.
 */
export function capitalZone(code) {
  return findRow(code).capital;
}

/**
 * @param {string} code ISO 3166-1 alpha-2 code.
 * @returns {CityZone[]} The other zones of the country; empty when it has one (SET-003).
 * @throws {RangeError} When the code is not in the table.
 */
export function otherZones(code) {
  return [...findRow(code).zones];
}
