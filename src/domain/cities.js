// @ts-check
/**
 * @module domain/cities
 * Looks up the city list (SET-002, SET-013, DEC-015): every city for the add list, one city by id,
 * and English country names (NFR-003). It reads only `data/cities.js`. It does not make or check
 * places (domain/places.js does).
 */
import { cityTable } from "../../data/cities.js";

/** @typedef {import("../../data/cities.js").City} City */

/**
 * @typedef {object} CityChoice A city for the add list.
 * @property {string} id The city's id.
 * @property {string} name The city's name.
 * @property {string} country The English name of its country or territory.
 */

const regionNames = new Intl.DisplayNames("en", { type: "region" });

/**
 * @param {unknown} id
 * @returns {City | null} The city with this id, or `null` when the list has none (SET-013).
 */
export function cityOf(id) {
  return cityTable.find((city) => city.id === id) ?? null;
}

/**
 * @param {string} code ISO 3166-1 alpha-2 code.
 * @returns {string} The English name of the country or territory (NFR-003).
 * @throws {RangeError} When no city of the list is in that country or territory.
 */
export function countryName(code) {
  if (!cityTable.some((city) => city.countryCode === code)) {
    throw new RangeError(`No city of the list has the country code: ${code}`);
  }
  return regionNames.of(code) ?? code;
}

/**
 * @returns {CityChoice[]} Every city of the list, in the table's order, with its country (SET-013).
 */
export function listCities() {
  return cityTable.map((city) => ({
    id: city.id,
    name: city.name,
    country: countryName(city.countryCode),
  }));
}
