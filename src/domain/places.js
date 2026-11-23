// @ts-check
/**
 * @module domain/places
 * The list of places: makes a place from a city or a custom place from a name, a time zone and a
 * country, restores a saved one, validates, adds, removes, moves, edits and names them, puts each on
 * the map and lists the countries of the Holidays section (SET-001, SET-002, SET-006, SET-008,
 * SET-009, SET-010, SET-013, SET-015, SET-016, SET-018, MAP-001, MAP-002, HOL-006, VAC-006, DEC-029, DEC-030). Every
 * function returns a new list and leaves its input unchanged. The list order is the display order
 * (PCK-006). It does not hold the city list (domain/cities.js does) or the zone table
 * (domain/zone-table.js does).
 */
import { cityOf, countryName, listCountries } from "./cities.js";
import { formatDate, formatTime } from "./format.js";
import { HijriVariant, isHijriAdjust, isHijriVariant } from "./hijri.js";
import { isVacationList, parseVacations } from "./vacations.js";
import { countryWeekendDays, isWeekendChoice } from "./weekends.js";
import { isKnownCountry, isKnownZone, zoneRow } from "./zone-table.js";
import { localDateTime } from "./zones.js";

/** @typedef {import("./hijri.js").HijriVariantName} HijriVariantName */
/** @typedef {import("./cities.js").City} City */
/** @typedef {import("./cities.js").CountryChoice} CountryChoice */
/** @typedef {import("./vacations.js").Vacation} Vacation */

/**
 * @typedef {object} CustomPlace A place the user entered instead of choosing a city (SET-018).
 * @property {string} name A person's or a city's name; not empty after trimming.
 * @property {string} zone An IANA zone of the zone table.
 * @property {string} countryCode A known ISO 3166-1 alpha-2 code.
 */

/**
 * @typedef {object} Place One place the user follows: a city of the list (SET-002) or a custom
 *   place (SET-018); exactly one of `cityId` and `custom` is set (DEC-029).
 * @property {string} id Unique within the list.
 * @property {string | null} cityId Id of a city of the list; `null` for a custom place.
 * @property {CustomPlace | null} custom The custom place's entry; `null` for a city.
 * @property {string} countryCode ISO 3166-1 alpha-2 code, filled in from the city or the entry.
 * @property {string} zone IANA time-zone name, filled in from the city or the entry.
 * @property {string} label Display name; empty means the city's or the entry's name (SET-009).
 * @property {string} region Region code; empty means national holidays only (SET-006).
 * @property {number[] | null} weekendDays The weekend days the user chose, 1 = Monday to 7 = Sunday;
 *   `null` means the weekend of the place's country (SET-016).
 * @property {HijriVariantName} hijriVariant
 * @property {number} hijriAdjust -1, 0 or 1 days.
 * @property {Vacation[]} vacations The place's vacations; none by default (VAC-006, DEC-030).
 */

/** @typedef {{ countryCode: string, zone: string }} PlaceOrigin The country and zone of a place. */

/**
 * @param {string | null} cityId
 * @returns {City} The city of the list with this id.
 * @throws {RangeError} When the list has no such city (SET-013).
 */
function listedCity(cityId) {
  const city = cityOf(cityId);
  if (city === null) throw new RangeError(`Unknown city id: ${cityId}`);
  return city;
}

/**
 * @param {unknown} value
 * @returns {value is CustomPlace} Whether it is a custom place's entry: a name that is not empty
 *   after trimming, a zone of the zone table and a known country (SET-015, SET-018).
 */
export function isCustomPlaceEntry(value) {
  if (typeof value !== "object" || value === null) return false;
  const { name, zone, countryCode } = /** @type {Record<string, unknown>} */ (value);
  const hasName = typeof name === "string" && name.trim() !== "";
  return hasName && isKnownZone(zone) && isKnownCountry(countryCode);
}

/**
 * @param {Record<string, unknown>} record
 * @returns {PlaceOrigin | null} The country and zone of the record's city or custom entry, or `null`
 *   when it is neither a city of the list nor a valid custom place.
 */
function originOf({ cityId, custom }) {
  if (cityId === null && isCustomPlaceEntry(custom)) {
    return { countryCode: custom.countryCode, zone: custom.zone };
  }
  const city = custom === null ? cityOf(cityId) : null;
  return city === null ? null : { countryCode: city.countryCode, zone: city.zone };
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean} Whether it is a city or a custom place and the country and zone are its own.
 */
function hasOriginFacts(record) {
  const origin = originOf(record);
  return (
    origin !== null && record.countryCode === origin.countryCode && record.zone === origin.zone
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
 * @returns {value is Place} Whether it is a valid place: a city of the list or a valid custom place,
 *   with its own country and zone, text fields and Hijri fields in range.
 */
export function isPlace(value) {
  if (typeof value !== "object" || value === null) return false;
  const record = /** @type {Record<string, unknown>} */ (value);
  return (
    hasTextFields(record) &&
    isVacationList(record.vacations) &&
    isWeekendChoice(record.weekendDays) &&
    isHijriVariant(record.hijriVariant) &&
    isHijriAdjust(record.hijriAdjust) &&
    hasOriginFacts(record)
  );
}

/**
 * @param {unknown} value A place as read from storage.
 * @returns {boolean} Whether it is neither a city of the list nor a valid custom place (SET-015):
 *   its city id is text that names no city, or it has no city id and its custom entry is not valid.
 */
export function isUnusablePlace(value) {
  if (typeof value !== "object" || value === null) return false;
  const { cityId, custom } = /** @type {Record<string, unknown>} */ (value);
  if (typeof cityId === "string") return cityOf(cityId) === null;
  const hasEntry = typeof custom === "object" && custom !== null;
  return (cityId === null || cityId === undefined) && hasEntry && !isCustomPlaceEntry(custom);
}

/**
 * Turns a saved place back into a place: its country and zone are filled in from its city or its
 * custom entry, so a correction of the city table reaches saved places (DEC-016, DEC-029).
 * @param {unknown} value A place as read from storage.
 * @returns {Place | null} The place, or `null` when it is invalid, or neither a city of the list
 *   nor a valid custom place. An invalid vacation is dropped alone and the place stays (DEC-030).
 */
export function restorePlace(value) {
  if (typeof value !== "object" || value === null) return null;
  /** @type {Record<string, unknown>} */
  const record = { weekendDays: null, cityId: null, custom: null, ...value };
  const origin = originOf(record);
  if (origin === null) return null;
  const place = { ...record, ...origin, vacations: parseVacations(record.vacations) };
  return isPlace(place) ? place : null;
}

/**
 * @param {string} id
 * @param {Pick<Place, "cityId" | "custom" | "countryCode" | "zone">} origin
 * @returns {Place} A place with no display name, region or weekend choice and the default Hijri
 *   choices.
 */
function newPlace(id, origin) {
  return {
    id,
    ...origin,
    label: "",
    region: "",
    weekendDays: null,
    hijriVariant: HijriVariant.umalqura,
    hijriAdjust: 0,
    vacations: [],
  };
}

/**
 * Makes a place for a city of the list, with that city's country and zone (SET-002).
 * @param {string} id Unique id.
 * @param {string} cityId
 * @returns {Place}
 * @throws {RangeError} When the city is not in the list (SET-013).
 */
export function createPlace(id, cityId) {
  const { countryCode, zone } = listedCity(cityId);
  return newPlace(id, { cityId, custom: null, countryCode, zone });
}

/**
 * Makes a custom place from a name, a time zone and a country (SET-018, DEC-029).
 * @param {string} id Unique id.
 * @param {CustomPlace} entry The name (trimmed here), the zone and the country code.
 * @returns {Place}
 * @throws {RangeError} When the name is empty after trimming, or the zone or the country is not in
 *   the tables.
 */
export function createCustomPlace(id, entry) {
  if (!isCustomPlaceEntry(entry)) {
    throw new RangeError(`Not a valid custom place for the place id: ${id}`);
  }
  const { zone, countryCode } = entry;
  const custom = { name: entry.name.trim(), zone, countryCode };
  return newPlace(id, { cityId: null, custom, countryCode, zone });
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

/** @typedef {Partial<Omit<Place, "id" | "cityId" | "custom" | "countryCode" | "zone">>} PlaceChanges */

/**
 * @param {Place} place
 * @returns {Place} The place with `null` weekend days when its days equal its country's, in any
 *   order (SET-017).
 */
function withDefaultWeekend(place) {
  const own = place.weekendDays;
  if (own === null) return place;
  const country = countryWeekendDays(place.countryCode);
  const same = own.length === country.length && country.every((day) => own.includes(day));
  return same ? { ...place, weekendDays: null } : place;
}

/**
 * Changes fields of a place (SET-006, SET-009, SET-016, SET-017, HIJ-002, HIJ-003). The id and the
 * city or custom entry, with its country and zone, do not change.
 * @param {Place[]} places
 * @param {string} id
 * @param {PlaceChanges} changes
 * @returns {Place[]} The new list; the place is unchanged when the edit would make it invalid.
 */
export function editPlace(places, id, changes) {
  return places.map((place) => {
    const { cityId, custom, countryCode, zone } = place;
    const edited = { ...place, ...changes, id: place.id, cityId, custom, countryCode, zone };
    return place.id === id && isPlace(edited) ? withDefaultWeekend(edited) : place;
  });
}

/**
 * @param {Place} place
 * @returns {string} The name of the place's city, or the name the user entered for a custom place.
 */
function ownName(place) {
  return place.custom === null ? listedCity(place.cityId).name : place.custom.name;
}

/**
 * The name to show for a place: the display name, else the city's or the custom place's name
 * (SET-009); with country names on, the country follows it (SET-010).
 * @param {Place} place
 * @param {boolean} showCountry
 * @returns {string}
 */
export function placeName(place, showCountry) {
  const name = place.label === "" ? ownName(place) : place.label;
  return showCountry ? `${name}, ${countryName(place.countryCode)}` : name;
}

/**
 * The parts of a place's name that the views lay out apart.
 * @param {Place} place
 * @param {boolean} showCountry
 * @returns {{ name: string, city: string | null, country: string | null }} The name shown for the
 *   place (SET-009), the city's or custom place's name when a display name hides it, and the
 *   country name while country names are on (SET-010).
 */
export function placeFacts(place, showCountry) {
  return {
    name: placeName(place, false),
    city: place.label === "" ? null : ownName(place),
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
 * @returns {{ latitude: number, longitude: number }} The city's own coordinates, or for a custom
 *   place those of its zone's principal location (MAP-001, MAP-002).
 * @throws {RangeError} When the city or the zone is not in its table.
 */
function coordinatesOf(place) {
  if (place.custom === null) return listedCity(place.cityId);
  const row = zoneRow(place.custom.zone);
  if (row === null) throw new RangeError(`Unknown time zone: ${place.custom.zone}`);
  return row;
}

/**
 * @param {Place} place
 * @param {number} instant UTC milliseconds.
 * @returns {PlacePin} The position of the place on the map (its city, or its zone's reference city
 *   for a custom place), and its local time and date (MAP-001, MAP-002, CLK-001).
 * @throws {RangeError} When the place's city or zone is not in its table.
 */
export function placePin(place, instant) {
  const { latitude, longitude } = coordinatesOf(place);
  const local = localDateTime(instant, place.zone);
  return {
    left: ((longitude + 180) / 360) * 100,
    top: ((90 - latitude) / 180) * 100,
    time: formatTime(local),
    date: formatDate(local),
  };
}

/**
 * The countries and territories the Holidays section offers (HOL-006, DEC-029).
 * @param {Place[]} places The user's places.
 * @returns {CountryChoice[]} Those of the city list plus those of the user's custom places, each
 *   once, sorted by English name.
 */
export function holidayCountries(places) {
  const listed = listCountries();
  const extra = [...new Set(places.map((place) => place.countryCode))]
    .filter((code) => !listed.some((country) => country.code === code))
    .map((code) => ({ code, name: countryName(code) }));
  return [...listed, ...extra].sort((a, b) => a.name.localeCompare(b.name, "en"));
}
