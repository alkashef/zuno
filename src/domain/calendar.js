// @ts-check
/**
 * @module domain/calendar
 * The month-grid model: one row per place, one cell of facts per day (CAL-001 to CAL-004, CAL-007,
 * VAC-004, HIJ-001, DEC-030), and the weeks of a month for the day selector's calendar (PCK-007). It says what each cell is; the view chooses colours, including the split cell for a
 * holiday on a weekend day (CAL-007). It reads no clock (the caller passes the instant), makes no
 * request, and does not format dates as text (domain/format.js does).
 */
import { hijriDate } from "./hijri.js";
import { holidayOn } from "./holidays.js";
import { vacationsOn } from "./vacations.js";
import { isWeekend } from "./weekends.js";
import { localDateTime } from "./zones.js";

/** @typedef {import("./hijri.js").HijriDate} HijriDate */
/** @typedef {import("./holidays.js").Holiday} Holiday */
/** @typedef {import("./places.js").Place} Place */
/** @typedef {import("./settings.js").Settings} Settings */
/** @typedef {import("./vacations.js").Vacation} Vacation */

/** The kinds a cell's fill is made of (CAL-007, VAC-004). */
export const FillKind = Object.freeze({
  weekend: "weekend",
  holiday: "holiday",
  vacation: "vacation",
});

/** @typedef {typeof FillKind[keyof typeof FillKind]} FillKindName */

/**
 * @typedef {object} Fill What a cell is filled with (DEC-030).
 * @property {FillKindName | null} first The kind of the first colour, or `null` for a plain day.
 * @property {FillKindName | null} second The kind of the other half of a split cell, or `null` for
 *   one colour.
 */

/**
 * @typedef {object} MonthRef A displayed month.
 * @property {number} year
 * @property {number} month 1 to 12.
 */

/**
 * @typedef {object} DayFacts The facts of one day in one place's row.
 * @property {string} date `YYYY-MM-DD`.
 * @property {boolean} isWeekend Whether the day is a weekend day of the place (CAL-002).
 * @property {string | null} holidayName The public holiday's name, or `null` (CAL-003).
 * @property {Vacation[]} vacations The place's vacations that cover the day, in the order added
 *   (VAC-004).
 * @property {Fill} fill The kinds of the cell's colours (CAL-007, VAC-004).
 * @property {boolean} isToday Whether it is today's date in the place's own zone (CAL-004).
 * @property {HijriDate | null} hijri The Hijri date, or `null` while Hijri is off (HIJ-001).
 */

/**
 * @typedef {object} RowContext What every cell of one place's row needs.
 * @property {Place} place
 * @property {Holiday[]} holidays The holidays of the place's country.
 * @property {string} today The place's local date now, `YYYY-MM-DD`.
 * @property {boolean} showHijri
 */

/**
 * @param {number} value
 * @returns {string} The number with at least two digits.
 */
function twoDigits(value) {
  return String(value).padStart(2, "0");
}

/**
 * @param {number} year
 * @param {number} month 1 to 12.
 * @param {number} day
 * @returns {string} The date as `YYYY-MM-DD`.
 */
function isoDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${twoDigits(month)}-${twoDigits(day)}`;
}

/**
 * @param {{ isWeekend: boolean, isHoliday: boolean, vacations: Vacation[] }} day
 * @returns {Fill} A vacation day: the vacation colour, with the holiday colour on the other half
 *   when the day is a holiday, else the weekend colour when it is a weekend day (VAC-004). Any other
 *   day: weekend, holiday, or weekend then holiday (CAL-007).
 */
function fillOf({ isWeekend: weekend, isHoliday, vacations }) {
  /** @type {FillKindName[]} */
  const others = [...(weekend ? [FillKind.weekend] : []), ...(isHoliday ? [FillKind.holiday] : [])];
  if (vacations.length > 0) return { first: FillKind.vacation, second: others.at(-1) ?? null };
  return { first: others[0] ?? null, second: others[1] ?? null };
}

/**
 * @param {RowContext} row
 * @param {MonthRef} monthRef
 * @param {number} day 1 to 31.
 * @returns {DayFacts} The facts of one day of the row.
 */
function dayFacts(row, monthRef, day) {
  const { place } = row;
  const date = isoDate(monthRef.year, monthRef.month, day);
  const calendarDate = { year: monthRef.year, month: monthRef.month, day };
  const holidayName = holidayOn(row.holidays, place.region, date)?.name ?? null;
  const weekend = isWeekend(place, calendarDate);
  const vacations = vacationsOn(place.vacations, date);
  return {
    date,
    isWeekend: weekend,
    holidayName,
    vacations,
    fill: fillOf({ isWeekend: weekend, isHoliday: holidayName !== null, vacations }),
    isToday: date === row.today,
    hijri: row.showHijri ? hijriDate(calendarDate, place.hijriVariant, place.hijriAdjust) : null,
  };
}

/**
 * @param {number} nowInstant UTC milliseconds.
 * @param {Place} place
 * @returns {string} The place's local date at that instant, `YYYY-MM-DD`.
 */
function localToday(nowInstant, place) {
  const local = localDateTime(nowInstant, place.zone);
  return isoDate(local.year, local.month, local.day);
}

/**
 * The grid of a month (CAL-001).
 * @param {Settings} settings The places, in display order, and the Hijri switch.
 * @param {MonthRef} monthRef The month to build.
 * @param {Record<string, Holiday[]>} holidays Holidays by country code; a missing country has none.
 * @param {number} nowInstant UTC milliseconds, used only to find today in each place.
 * @returns {DayFacts[][]} One row per place; one cell per day of the month.
 */
export function buildMonth(settings, monthRef, holidays, nowInstant) {
  const dayCount = new Date(Date.UTC(monthRef.year, monthRef.month, 0)).getUTCDate();
  return settings.places.map((place) => {
    const row = {
      place,
      holidays: holidays[place.countryCode] ?? [],
      today: localToday(nowInstant, place),
      showHijri: settings.showHijri,
    };
    return Array.from({ length: dayCount }, (_, index) => dayFacts(row, monthRef, index + 1));
  });
}

/**
 * The days of a month laid out in weeks, Sunday first, for the day selector's calendar (PCK-007).
 * @param {MonthRef} monthRef
 * @returns {(number | null)[][]} Weeks of seven entries; a day number, or `null` before the 1st and
 *   after the last day.
 */
export function monthWeeks(monthRef) {
  const { year, month } = monthRef;
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const padding = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells = [
    ...Array(padding).fill(null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];
  const weekCount = Math.ceil(cells.length / 7);
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => cells[week * 7 + day] ?? null),
  );
}
