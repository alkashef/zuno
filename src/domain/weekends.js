// @ts-check
/**
 * @module domain/weekends
 * Tells which days of the week are the weekend of a place (CAL-002, SET-016, EX-002, EX-014,
 * DEC-003): the days the user chose for it, else the weekend of its country or territory from the
 * browser's own locale data. It does not know holidays (domain/holidays.js does), does not build
 * the month grid (domain/calendar.js does) and does not edit places (domain/places.js does).
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

const firstDay = 1;
const lastDay = 7;

/**
 * @typedef {object} WeekendSource The facts of a place that decide its weekend.
 * @property {string} countryCode ISO 3166-1 alpha-2 code of the place's country.
 * @property {number[] | null} weekendDays The days the user chose, or `null` for the country's.
 */

/**
 * @param {string} countryCode ISO 3166-1 alpha-2 code, for example `SA`.
 * @returns {number[]} The weekend days of the country, 1 = Monday to 7 = Sunday.
 */
export function countryWeekendDays(countryCode) {
  return [...weekInfoOf(new Intl.Locale("und", { region: countryCode })).weekend];
}

/**
 * @param {unknown} value
 * @returns {boolean} Whether it is a valid weekend choice (SET-016): `null` for the country's
 *   weekend, or a non-empty list of distinct whole days, 1 = Monday to 7 = Sunday.
 */
export function isWeekendChoice(value) {
  if (value === null) return true;
  if (!Array.isArray(value) || value.length === 0) return false;
  const inRange = value.every((day) => Number.isInteger(day) && day >= firstDay && day <= lastDay);
  return inRange && new Set(value).size === value.length;
}

/**
 * @param {WeekendSource} place
 * @returns {number[]} The place's weekend days: its own when the user chose them, else its
 *   country's (SET-016). A place read from an older record has no own days.
 */
export function placeWeekendDays(place) {
  return place.weekendDays ?? countryWeekendDays(place.countryCode);
}

/**
 * @param {WeekendSource} place
 * @param {CalendarDate} date A date in the place's own calendar.
 * @returns {boolean} Whether the date falls on a weekend day of the place (CAL-002, PCK-005).
 */
export function isWeekend(place, date) {
  const utcDay = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
  const isoDay = utcDay === 0 ? lastDay : utcDay;
  return placeWeekendDays(place).includes(isoDay);
}
