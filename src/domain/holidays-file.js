// @ts-check
/**
 * @module domain/holidays-file
 * The holidays and vacations file (HOL-010, HOL-016, DEC-032): the six header names, the row types,
 * and `toCsv`, which turns the user's added holidays, hidden holidays and vacations into the CSV text
 * of the file. It writes no file (files.js does), holds no CSV rules (domain/csv.js does) and does not
 * read a file back (a later milestone adds that here).
 */
import { countryName } from "./cities.js";
import { format } from "./csv.js";
import { formatIsoDate } from "./format.js";
import { placeName } from "./places.js";

/** @typedef {import("./places.js").Place} Place */
/** @typedef {import("./user-holidays.js").HolidayEntry} HolidayEntry */
/** @typedef {import("./user-holidays.js").UserHolidays} UserHolidays */

/** The six column names of the header row, in the order of the columns (DEC-032). */
export const HeaderName = Object.freeze({
  type: "Type",
  country: "Country",
  place: "Place",
  startDate: "Start date",
  endDate: "End date",
  name: "Name",
});

/** The values of the Type column (DEC-032). */
export const RowType = Object.freeze({
  holiday: "holiday",
  hiddenHoliday: "hidden holiday",
  vacation: "vacation",
});

/**
 * @param {HolidayEntry[]} entries
 * @returns {HolidayEntry[]} A copy ordered by country name, then date, then holiday name.
 */
function ordered(entries) {
  return [...entries].sort(
    (a, b) =>
      countryName(a.countryCode).localeCompare(countryName(b.countryCode), "en") ||
      a.date.localeCompare(b.date) ||
      a.name.localeCompare(b.name, "en"),
  );
}

/**
 * @param {string} type A `RowType` value.
 * @param {HolidayEntry[]} entries
 * @returns {string[][]} One row per holiday: the country's English name, the date and the name.
 */
function holidayRows(type, entries) {
  return ordered(entries).map(({ countryCode, date, name }) => [
    type,
    countryName(countryCode),
    "",
    formatIsoDate(date),
    "",
    name,
  ]);
}

/**
 * @param {Place[]} places
 * @returns {string[][]} One row per vacation, by place order and then the order added.
 */
function vacationRows(places) {
  return places.flatMap((place) =>
    place.vacations.map(({ start, end, label }) => [
      RowType.vacation,
      "",
      placeName(place, false),
      formatIsoDate(start),
      formatIsoDate(end),
      label,
    ]),
  );
}

/**
 * Writes the holidays file (HOL-010).
 * @param {{ userHolidays: UserHolidays, places: Place[] }} saved The user's added and hidden
 *   holidays and the places whose vacations are written.
 * @returns {string} A byte-order mark (so a spreadsheet reads accents), the header row, then the
 *   added holidays, the hidden holidays and the vacations, one row each, with `\r\n` line ends.
 */
export function toCsv({ userHolidays, places }) {
  const header = Object.values(HeaderName);
  const rows = [
    header,
    ...holidayRows(RowType.holiday, userHolidays.added),
    ...holidayRows(RowType.hiddenHoliday, userHolidays.hidden),
    ...vacationRows(places),
  ];
  return String.fromCharCode(0xfeff) + format(rows);
}
