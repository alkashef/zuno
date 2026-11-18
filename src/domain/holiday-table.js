// @ts-check
/**
 * @module domain/holiday-table
 * Reads the built-in holiday table (HOL-013, DEC-024): which countries it covers and a country's
 * holidays of a year as `Holiday` rows. Pure. It is the only reader of `data/holiday-table.js`;
 * `scripts/make-holiday-table.mjs` writes that file, and `controller.js` decides when to ask it.
 */
import { holidayTable } from "../../data/holiday-table.js";

/** @typedef {import("./holidays.js").Holiday} Holiday */

/**
 * @param {string} countryCode ISO 3166-1 alpha-2 code.
 * @returns {boolean} Whether the table holds this country's holidays.
 */
export function isTableCountry(countryCode) {
  return Object.hasOwn(holidayTable.countries, countryCode);
}

/**
 * A table country's national public holidays of one year, sorted by date.
 * @param {string} countryCode A code for which `isTableCountry` is true.
 * @param {number} year Calendar year.
 * @returns {Holiday[] | null} One `Holiday` per day off, with no regions, or `null` for a year the
 *   table does not cover.
 * @throws {Error} If the country is not in the table (a programming error).
 */
export function tableHolidays(countryCode, year) {
  if (!isTableCountry(countryCode)) {
    throw new Error(`The holiday table has no country ${countryCode}`);
  }
  if (!holidayTable.years.includes(year)) return null;
  const prefix = `${year}-`;
  return holidayTable.countries[countryCode]
    .filter((row) => row.date.startsWith(prefix))
    .map((row) => ({ date: row.date, name: row.name, regions: [] }));
}
