// @ts-check
/**
 * @module domain/places
 * The list of places: makes, validates, adds, removes, moves, edits and names them (SET-001 to
 * SET-003, SET-006, SET-008, SET-009, SET-010). Every function returns a new list and leaves its
 * input unchanged. The list order is the display order (PCK-006).
 */
import { capitalZone, countryName, listCountries, otherZones } from "./countries.js";
import { formatDate, formatTime } from "./format.js";
import { HijriVariant, isHijriAdjust, isHijriVariant } from "./hijri.js";
import { localDateTime } from "./zones.js";

/** @typedef {import("./hijri.js").HijriVariantName} HijriVariantName */

/**
 * @typedef {object} Place One place the user follows.
 * @property {string} id Unique within the list.
 * @property {string} countryCode ISO 3166-1 alpha-2 code from the country table.
 * @property {string} zone IANA time-zone name, one of the country's zones.
 * @property {string} label Display name; empty means the city name (SET-009).
 * @property {string} region Region code; empty means national holidays only (SET-006).
 * @property {HijriVariantName} hijriVariant
 * @property {number} hijriAdjust -1, 0 or 1 days.
 */

/**
 * @param {string} countryCode
 * @returns {import("../../data/countries.js").CityZone[]} The capital first, then the other zones
 *   of the country: the cities a place can use (SET-002, SET-003).
 */
export function zonesOf(countryCode) {
  return [capitalZone(countryCode), ...otherZones(countryCode)];
}

/**
 * @param {unknown} code
 * @returns {boolean} Whether the country table has this code.
 */
function isKnownCountry(code) {
  return typeof code === "string" && listCountries().some((country) => country.code === code);
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean} Whether the country is known and the zone is one of its zones.
 */
function hasValidCountryAndZone(record) {
  return (
    isKnownCountry(record.countryCode) &&
    zonesOf(/** @type {string} */ (record.countryCode)).some((city) => city.zone === record.zone)
  );
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean} Whether the id is non-empty text and the label and region are text.
 */
function hasTextFields(record) {
  return (
    typeof record.id === "string" &&
    record.id !== "" &&
    typeof record.label === "string" &&
    typeof record.region === "string"
  );
}

/**
 * @param {unknown} value
 * @returns {value is Place} Whether it is a valid place: a known country, a zone of that country,
 * text fields and Hijri fields in range.
 */
export function isPlace(value) {
  if (typeof value !== "object" || value === null) return false;
  const record = /** @type {Record<string, unknown>} */ (value);
  return (
    hasTextFields(record) &&
    isHijriVariant(record.hijriVariant) &&
    isHijriAdjust(record.hijriAdjust) &&
    hasValidCountryAndZone(record)
  );
}

/**
 * Makes a place for a country with the capital's zone (SET-002).
 * @param {string} id Unique id.
 * @param {string} countryCode
 * @returns {Place}
 * @throws {RangeError} When the code is not in the country table.
 */
export function createPlace(id, countryCode) {
  return {
    id,
    countryCode,
    zone: capitalZone(countryCode).zone,
    label: "",
    region: "",
    hijriVariant: HijriVariant.umalqura,
    hijriAdjust: 0,
  };
}

/**
 * Adds a place at the end of the list (SET-001).
 * @param {Place[]} places
 * @param {Place} place
 * @returns {Place[]} The new list; same content when the place is invalid or its id is taken.
 */
export function addPlace(places, place) {
  if (!isPlace(place) || places.some((existing) => existing.id === place.id)) return [...places];
  return [...places, place];
}

/**
 * Removes a place (SET-001).
 * @param {Place[]} places
 * @param {string} id
 * @returns {Place[]}
 */
export function removePlace(places, id) {
  return places.filter((place) => place.id !== id);
}

/**
 * Moves a place up or down in the list (SET-008). A move past either end changes nothing.
 * @param {Place[]} places
 * @param {string} id
 * @param {number} offset -1 for up, 1 for down.
 * @returns {Place[]}
 */
export function movePlace(places, id, offset) {
  const from = places.findIndex((place) => place.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= places.length) return [...places];
  const moved = [...places];
  const [place] = moved.splice(from, 1);
  moved.splice(to, 0, place);
  return moved;
}

/**
 * Changes fields of a place (SET-003, SET-006, SET-009, HIJ-002, HIJ-003). The id and country do
 * not change.
 * @param {Place[]} places
 * @param {string} id
 * @param {Partial<Omit<Place, "id" | "countryCode">>} changes
 * @returns {Place[]} The new list; the place is unchanged when the edit would make it invalid.
 */
export function editPlace(places, id, changes) {
  return places.map((place) => {
    const edited = { ...place, ...changes, id: place.id, countryCode: place.countryCode };
    return place.id === id && isPlace(edited) ? edited : place;
  });
}

/**
 * @param {Place} place
 * @returns {string} The city name of the place's zone.
 */
function cityName(place) {
  const city = zonesOf(place.countryCode).find((candidate) => candidate.zone === place.zone);
  return city === undefined ? place.zone : city.label;
}

/**
 * The name to show for a place: the display name, else the city name (SET-009); with country
 * names on, the country follows it (SET-010).
 * @param {Place} place
 * @param {boolean} showCountry
 * @returns {string}
 */
export function placeName(place, showCountry) {
  const name = place.label === "" ? cityName(place) : place.label;
  return showCountry ? `${name}, ${countryName(place.countryCode)}` : name;
}

/**
 * @param {Place} place
 * @param {number} instant UTC milliseconds.
 * @returns {string} The place's local time of day, for example `9:25 AM` (SET-002).
 */
export function placeClock(place, instant) {
  return formatTime(localDateTime(instant, place.zone));
}

/**
 * @typedef {object} PlacePin Where a place sits on the world map, and what its label says.
 * @property {number} left Percent of the map width (equirectangular projection).
 * @property {number} top Percent of the map height.
 * @property {string} time The local time of day, for example `9:25 AM`.
 * @property {string} date The local date as dd-mmm-yy.
 */

/**
 * @param {Place} place
 * @param {number} instant UTC milliseconds.
 * @returns {PlacePin} The position of the place's zone city on the map, and its local time and
 *   date (MAP-001, CLK-001).
 */
export function placePin(place, instant) {
  const city = zonesOf(place.countryCode).find((candidate) => candidate.zone === place.zone);
  const { latitude, longitude } = city ?? capitalZone(place.countryCode);
  const local = localDateTime(instant, place.zone);
  return {
    left: ((longitude + 180) / 360) * 100,
    top: ((90 - latitude) / 180) * 100,
    time: formatTime(local),
    date: formatDate(local),
  };
}
