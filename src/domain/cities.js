// @ts-check
/**
 * @module domain/cities
 * Looks up the city list (SET-002, SET-013, DEC-015): every city for the add list, one city by id,
 * the countries and territories of the list (HOL-006), every known country (SET-018), the English name of any known country or
 * territory (NFR-003, DEC-029) and the code of a country read from a name (HOL-017, DEC-032). It reads only `data/cities.js`; which codes are known comes from
 * domain/zone-table.js. It does not make or check places (domain/places.js does).
 */
import { cityTable } from "../../data/cities.js";
import { isKnownCountry, listCountryCodes } from "./zone-table.js";

/** @typedef {import("../../data/cities.js").City} City */

/**
 * @typedef {object} CityChoice A city for the add list.
 * @property {string} id The city's id.
 * @property {string} name The city's name.
 * @property {string} country The English name of its country or territory.
 */

const regionNames = new Intl.DisplayNames("en", { type: "region" });

/** Names the city list gives a territory that `Intl` names differently (DSP-004, DEC-015). */
const territoryNames = Object.freeze(
  /** @type {Record<string, string>} */ ({
    HK: "Hong Kong",
  }),
);

/**
 * @param {unknown} id
 * @returns {City | null} The city with this id, or `null` when the list has none (SET-013).
 */
export function cityOf(id) {
  return cityTable.find((city) => city.id === id) ?? null;
}

/**
 * @typedef {object} CountryChoice A country or territory of the city list.
 * @property {string} code ISO 3166-1 alpha-2 code.
 * @property {string} name Its English name.
 */

/**
 * @param {string} code ISO 3166-1 alpha-2 code.
 * @returns {string} The English name of the country or territory (NFR-003).
 * @throws {RangeError} When the code is not a known country or territory (DEC-029).
 */
export function countryName(code) {
  if (!isKnownCountry(code)) throw new RangeError(`Unknown country code: ${code}`);
  return territoryNames[code] ?? regionNames.of(code) ?? code;
}

/**
 * Every English spelling that Chromium, Firefox, WebKit and Edge give a country's name with
 * `Intl.DisplayNames` where they differ (read on 2026-11-23, headless, on the development machine).
 * The page writes the name its own browser gives, so a holidays file written in one browser must be
 * read with the spellings of the others (HOL-017, DEC-032).
 */
const otherCountryNames = Object.freeze(
  /** @type {Record<string, string[]>} */ ({
    BQ: ["Caribbean Netherlands", "Bonaire, Sint Eustatius and Saba"],
    CD: ["Congo - Kinshasa", "Congo (DRC)"],
    CG: ["Congo - Brazzaville", "Congo"],
    CV: ["Cape Verde", "Cabo Verde"],
    EH: ["Western Sahara"],
    FK: ["Falkland Islands", "Falkland Islands (Islas Malvinas)"],
    HK: ["Hong Kong", "Hong Kong SAR China", "Hong Kong SAR"],
    KR: ["South Korea", "Korea"],
    MM: ["Myanmar (Burma)", "Myanmar"],
    MO: ["Macao", "Macao SAR China", "Macao SAR"],
    PS: ["Palestine", "Palestinian Territories", "Palestinian Authority"],
    SH: ["St. Helena", "St Helena, Ascension, Tristan da Cunha"],
  }),
);

/**
 * @param {string} code A known country code.
 * @returns {string[]} The code, the page's name of the country and its other spellings, in lower case.
 */
function namesOf(code) {
  return [code, countryName(code), ...(otherCountryNames[code] ?? [])].map((name) =>
    name.toLowerCase(),
  );
}

/**
 * @param {string} text A country as a file writes it.
 * @returns {string | null} The code of the country whose two-letter code, English name (the page's
 *   or another browser's) is the text, ignoring case and outer spaces; `null` when none is (HOL-017).
 */
export function countryCodeOf(text) {
  const wanted = text.trim().toLowerCase();
  return listCountryCodes().find((code) => namesOf(code).includes(wanted)) ?? null;
}

/**
 * @returns {CountryChoice[]} Each country or territory of the city list once, sorted by its
 *   English name (HOL-006).
 */
export function listCountries() {
  const codes = [...new Set(cityTable.map((city) => city.countryCode))];
  return codes
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/**
 * @returns {CountryChoice[]} Every country and territory of the zone table once, sorted by its
 *   English name: the choices of a custom place (SET-018).
 */
export function listAllCountries() {
  return listCountryCodes()
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
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
