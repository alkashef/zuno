// @ts-check
/** @module holiday-fixtures Invented holiday-service records shared by the holiday unit tests. */

/**
 * @param {string} date `YYYY-MM-DD`.
 * @param {string} name
 * @param {string[]} holidayTypes
 * @param {string[] | null} subdivisionCodes `null` for a national holiday.
 * @returns {import("../../src/api.js").ServiceHoliday} One record in the service's shape.
 */
export function serviceRecord(date, name, holidayTypes, subdivisionCodes = null) {
  return { date, name, subdivisionCodes, holidayTypes };
}

/** @returns {import("../../src/api.js").ServiceHoliday[]} A small United States 2026 list. */
export function usRecords2026() {
  return [
    serviceRecord("2026-12-25", "Christmas Day", ["Public", "Bank"]),
    serviceRecord("2026-02-12", "Lincoln's Birthday", ["Observance"], ["US-CA", "US-NY"]),
    serviceRecord("2026-04-03", "Good Friday", ["Public"], ["US-CT", "US-NC"]),
    serviceRecord("2026-04-05", "Easter Sunday", ["Observance"]),
  ];
}

/** A holiday table that covers no country, so a test's fake holiday service answers for all. */
export const emptyHolidayTable = Object.freeze({
  isTableCountry: () => false,
  tableHolidays: () => null,
});
