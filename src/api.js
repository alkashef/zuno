// @ts-check
/**
 * @module api
 * The only module that calls `fetch`. It gets one country-year of public holidays from the holiday
 * service and returns a `HolidayResult` (HOL-001, HOL-002, REF-002, DEC-005, DEC-006). It sends only
 * the country code and the year, and it does not interpret the holidays (domain/holidays.js does).
 */
import { config } from "./config.js";
import { log } from "./log.js";

/**
 * One holiday record as the holiday service returns it. Only the fields the page uses are checked.
 * @typedef {object} ServiceHoliday
 * @property {string} date `YYYY-MM-DD`.
 * @property {string} name
 * @property {string[]} holidayTypes For example `Public`, `Bank`, `Observance`.
 * @property {string[] | null} subdivisionCodes Region codes, or `null` for a national holiday.
 */

/**
 * @typedef {{ status: "loaded", holidays: ServiceHoliday[] } | { status: "unavailable", reason: string }} HolidayResult
 */

/**
 * @param {unknown} value
 * @returns {boolean} Whether `value` is a list of strings.
 */
function isStringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * @param {unknown} record
 * @returns {boolean} Whether `record` has the service's documented fields (DEC-005).
 */
function isServiceHoliday(record) {
  if (typeof record !== "object" || record === null) {
    return false;
  }
  const { date, name, holidayTypes, subdivisionCodes } = /** @type {Record<string, unknown>} */ (
    record
  );
  return (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    typeof name === "string" &&
    isStringList(holidayTypes) &&
    (subdivisionCodes === null || isStringList(subdivisionCodes))
  );
}

/**
 * @param {string} reason
 * @returns {HolidayResult} An `unavailable` result; the reason is also logged.
 */
function unavailable(reason) {
  log.warn(`Holidays unavailable: ${reason}`);
  return { status: "unavailable", reason };
}

/**
 * Gets the holidays of one country and year.
 * @param {string} countryCode Two capital letters, for example `US`.
 * @param {number} year Four digits.
 * @param {typeof fetch} [fetchFn] The fetch to use; tests pass a fake.
 * @returns {Promise<HolidayResult>} `loaded`, or `unavailable` with the reason for a network
 *   failure, a timeout, a non-success status or a body of the wrong shape (DEC-006).
 * @throws {Error} When the country code or the year is not well formed (a programming error).
 */
export async function getHolidays(countryCode, year, fetchFn = fetch) {
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error(`getHolidays: bad country code "${countryCode}"`);
  }
  if (!/^\d{4}$/.test(String(year))) {
    throw new Error(`getHolidays: bad year "${year}"`);
  }
  const url = `${config.holidayServiceBaseUrl}/Holidays/${countryCode}/${year}`;
  try {
    return await requestHolidays(url, fetchFn);
  } catch (error) {
    return unavailable(`request to ${url} failed: ${String(error)}`);
  }
}

/**
 * Sends the one request. Only the URL (country code and year) leaves the machine (HOL-002).
 * @param {string} url
 * @param {typeof fetch} fetchFn
 * @returns {Promise<HolidayResult>} `loaded`, or `unavailable` for a status or shape problem.
 */
async function requestHolidays(url, fetchFn) {
  const response = await fetchFn(url, {
    signal: AbortSignal.timeout(config.holidayRequestTimeoutMs),
    credentials: "omit",
  });
  if (!response.ok) {
    return unavailable(`HTTP ${response.status} from ${url}`);
  }
  const body = await response.json();
  if (!Array.isArray(body) || !body.every(isServiceHoliday)) {
    return unavailable(`unexpected response shape from ${url}`);
  }
  return { status: "loaded", holidays: body };
}
