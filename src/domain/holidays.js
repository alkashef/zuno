// @ts-check
/**
 * @module domain/holidays
 * Turns holiday-service records into a place's public holidays, lists regions, and reports missing
 * data (HOL-003, HOL-004, SET-006, REF-002). Pure: it makes no request (api.js does) and keeps
 * nothing between calls.
 */

/** Holiday types of the service; only `public` counts as a day off (HOL-003). */
export const HolidayType = Object.freeze({ public: "Public" });

/**
 * @typedef {object} Holiday
 * @property {string} date `YYYY-MM-DD`.
 * @property {string} name
 * @property {string[]} regions Region codes, or an empty list for a national holiday.
 */

/**
 * @typedef {object} ServiceRecord A record from the holiday service (shape owned by api.js).
 * @property {string} date
 * @property {string} name
 * @property {string[]} holidayTypes
 * @property {string[] | null} subdivisionCodes
 */

/**
 * @typedef {{ status: "loaded", holidays: ServiceRecord[] } | { status: "unavailable", reason: string }} HolidayResult
 */

/**
 * @typedef {object} HolidayPlace The parts of a place that holidays depend on.
 * @property {string} id
 * @property {string} countryCode
 * @property {string} region Region code, or an empty string for national holidays only.
 */

/**
 * Keeps the public holidays of a service list.
 * @param {ServiceRecord[]} records
 * @returns {Holiday[]} One `Holiday` for every record of type `Public`.
 */
export function toHolidays(records) {
  return records
    .filter((record) => record.holidayTypes.includes(HolidayType.public))
    .map((record) => ({
      date: record.date,
      name: record.name,
      regions: record.subdivisionCodes ?? [],
    }));
}

/**
 * The public holiday of a place on a date: national, or of the chosen region (HOL-003, SET-006).
 * @param {Holiday[]} holidays The country's holidays from `toHolidays`.
 * @param {string} region Region code, or an empty string for national holidays only.
 * @param {string} date `YYYY-MM-DD`.
 * @returns {Holiday | null} The first matching holiday, or `null`.
 */
export function holidayOn(holidays, region, date) {
  const found = holidays.find(
    (holiday) =>
      holiday.date === date &&
      (holiday.regions.length === 0 || (region !== "" && holiday.regions.includes(region))),
  );
  return found ?? null;
}

/**
 * @param {Holiday[]} holidays
 * @returns {string[]} Every region code that has a holiday, sorted, without repeats.
 */
export function listRegions(holidays) {
  return [...new Set(holidays.flatMap((holiday) => holiday.regions))].sort();
}

/**
 * @param {Record<string, HolidayResult>} resultsByCountry Results keyed by country code.
 * @returns {string[]} The country codes whose holidays could not be loaded, sorted (REF-002).
 */
export function unavailableCountries(resultsByCountry) {
  return Object.entries(resultsByCountry)
    .filter(([, result]) => result.status === "unavailable")
    .map(([countryCode]) => countryCode)
    .sort();
}

/**
 * Places whose chosen region cannot be served: the country's loaded holidays name no region at
 * all, so only national holidays can be shown (HOL-004).
 * @param {HolidayPlace[]} places
 * @param {Record<string, HolidayResult>} resultsByCountry Results keyed by country code.
 * @returns {HolidayPlace[]} The places with a region and no regional data.
 */
export function placesMissingRegionalData(places, resultsByCountry) {
  return places.filter((place) => {
    const result = resultsByCountry[place.countryCode];
    return (
      place.region !== "" &&
      result?.status === "loaded" &&
      listRegions(toHolidays(result.holidays)).length === 0
    );
  });
}
