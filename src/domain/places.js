// @ts-check
/**
 * @module domain/places
 * The list of places: makes a place from a city, restores a saved one, validates, adds, removes,
 * moves, edits and names them (SET-001, SET-002, SET-006, SET-008, SET-009, SET-010, SET-013,
 * SET-015, SET-016). Every function returns a new list and leaves its input unchanged. The list order is the
 * display order (PCK-006). It does not hold the city list (domain/cities.js does).
 */
import { cityOf, countryName } from "./cities.js";
import { formatDate, formatTime } from "./format.js";
import { HijriVariant, isHijriAdjust, isHijriVariant } from "./hijri.js";
import { isWeekendChoice } from "./weekends.js";
import { localDateTime } from "./zones.js";

/** @typedef {import("./hijri.js").HijriVariantName} HijriVariantName */
/** @typedef {import("./cities.js").City} City */

/**
 * @typedef {object} Place One place the user follows: a city of the list (SET-002).
 * @property {string} id Unique within the list.
 * @property {string} cityId Id of a city of the list.
 * @property {string} countryCode The city's ISO 3166-1 alpha-2 code, filled in from the city.
 * @property {string} zone The city's IANA time-zone name, filled in from the city.
 * @property {string} label Display name; empty means the city name (SET-009).
 * @property {string} region Region code; empty means national holidays only (SET-006).
 * @property {number[] | null} weekendDays The weekend days the user chose, 1 = Monday to 7 = Sunday;
 *   `null` means the weekend of the place's country (SET-016).
 * @property {HijriVariantName} hijriVariant
 * @property {number} hijriAdjust -1, 0 or 1 days.
 */

/**
 * @param {string} cityId
 * @returns {City} The city of the list with this id.
 * @throws {RangeError} When the list has no such city (SET-013).
 */
function listedCity(cityId) {
  const city = cityOf(cityId);
  if (city === null) throw new RangeError(`Unknown city id: ${cityId}`);
  return city;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean} Whether the city is in the list and the country and zone are the city's.
 */
function hasCityFacts(record) {
  const city = cityOf(record.cityId);
  return city !== null && record.countryCode === city.countryCode && record.zone === city.zone;
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
 * @returns {value is Place} Whether it is a valid place: a city of the list with that city's
 *   country and zone, text fields and Hijri fields in range.
 */
export function isPlace(value) {
  if (typeof value !== "object" || value === null) return false;
  const record = /** @type {Record<string, unknown>} */ (value);
  return (
    hasTextFields(record) &&
    isWeekendChoice(record.weekendDays) &&
    isHijriVariant(record.hijriVariant) &&
    isHijriAdjust(record.hijriAdjust) &&
    hasCityFacts(record)
  );
}

/**
 * @param {unknown} value A place as read from storage.
 * @returns {boolean} Whether its city id is text that names no city of the list (SET-015).
 */
export function isUnlistedPlace(value) {
  if (typeof value !== "object" || value === null) return false;
  const { cityId } = /** @type {Record<string, unknown>} */ (value);
  return typeof cityId === "string" && cityOf(cityId) === null;
}

/**
 * Turns a saved place back into a place: its country and zone are filled in from its city, so a
 * correction of the city table reaches saved places (DEC-016).
 * @param {unknown} value A place as read from storage.
 * @returns {Place | null} The place, or `null` when it is invalid or its city is not in the list.
 */
export function restorePlace(value) {
  if (typeof value !== "object" || value === null) return null;
  const city = cityOf(/** @type {Record<string, unknown>} */ (value).cityId);
  if (city === null) return null;
  const place = { weekendDays: null, ...value, countryCode: city.countryCode, zone: city.zone };
  return isPlace(place) ? place : null;
}

/**
 * Makes a place for a city of the list, with that city's country and zone (SET-002).
 * @param {string} id Unique id.
 * @param {string} cityId
 * @returns {Place}
 * @throws {RangeError} When the city is not in the list (SET-013).
 */
export function createPlace(id, cityId) {
  const city = listedCity(cityId);
  return {
    id,
    cityId,
    countryCode: city.countryCode,
    zone: city.zone,
    label: "",
    region: "",
    weekendDays: null,
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

/** @typedef {Partial<Omit<Place, "id" | "cityId" | "countryCode" | "zone">>} PlaceChanges */

/**
 * Changes fields of a place (SET-006, SET-009, SET-016, HIJ-002, HIJ-003). The id and the city, with its
 * country and zone, do not change.
 * @param {Place[]} places
 * @param {string} id
 * @param {PlaceChanges} changes
 * @returns {Place[]} The new list; the place is unchanged when the edit would make it invalid.
 */
export function editPlace(places, id, changes) {
  return places.map((place) => {
    const { cityId, countryCode, zone } = place;
    const edited = { ...place, ...changes, id: place.id, cityId, countryCode, zone };
    return place.id === id && isPlace(edited) ? edited : place;
  });
}

/**
 * @param {Place} place
 * @returns {string} The name of the place's city.
 */
function cityName(place) {
  return listedCity(place.cityId).name;
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
 * The parts of a place's name that the views lay out apart.
 * @param {Place} place
 * @param {boolean} showCountry
 * @returns {{ name: string, city: string | null, country: string | null }} The name shown for the
 *   place (SET-009), the city name when a display name hides it, and the country name while
 *   country names are on (SET-010).
 */
export function placeFacts(place, showCountry) {
  return {
    name: placeName(place, false),
    city: place.label === "" ? null : cityName(place),
    country: showCountry ? countryName(place.countryCode) : null,
  };
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
 * @returns {PlacePin} The position of the place's own city on the map, and its local time and
 *   date (MAP-001, CLK-001).
 * @throws {RangeError} When the place's city is not in the list.
 */
export function placePin(place, instant) {
  const { latitude, longitude } = listedCity(place.cityId);
  const local = localDateTime(instant, place.zone);
  return {
    left: ((longitude + 180) / 360) * 100,
    top: ((90 - latitude) / 180) * 100,
    time: formatTime(local),
    date: formatDate(local),
  };
}
