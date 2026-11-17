// @ts-check
/**
 * @module domain/weekends
 * Tells which days of the week are the weekend in a country (CAL-002, EX-002, DEC-003), using the
 * browser's own locale data. It does not know holidays (domain/holidays.js does) and does not build
 * the month grid (domain/calendar.js does).
 */

/** @typedef {{ year: number, month: number, day: number }} CalendarDate A Gregorian date. */

/**
 * @typedef {object} WeekInfo The week data of a locale.
 * @property {number[]} weekend Weekend days, 1 = Monday to 7 = Sunday.
 */

/**
 * Reads the week data through `getWeekInfo()`; engines that only have the older `weekInfo`
 * property (for example Node.js 22) expose the same data there.
 * @param {Intl.Locale} locale
 * @returns {WeekInfo}
 */
function weekInfoOf(locale) {
  const modern = /** @type {{ getWeekInfo?: () => WeekInfo }} */ (locale);
  if (typeof modern.getWeekInfo === "function") {
    return modern.getWeekInfo();
  }
  return /** @type {{ weekInfo: WeekInfo }} */ (/** @type {unknown} */ (locale)).weekInfo;
}

/**
 * @param {string} countryCode ISO 3166-1 alpha-2 code, for example `SA`.
 * @returns {number[]} The weekend days of the country, 1 = Monday to 7 = Sunday.
 */
export function weekendDays(countryCode) {
  return [...weekInfoOf(new Intl.Locale("und", { region: countryCode })).weekend];
}

/**
 * @param {string} countryCode ISO 3166-1 alpha-2 code.
 * @param {CalendarDate} date A date in the country's own calendar.
 * @returns {boolean} Whether the date falls on a weekend day of the country.
 */
export function isWeekend(countryCode, date) {
  const utcDay = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  const isoDay = utcDay === 0 ? 7 : utcDay;
  return weekendDays(countryCode).includes(isoDay);
}
