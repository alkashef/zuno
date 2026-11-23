// @ts-check
/**
 * @module domain/holidays-file
 * The holidays and vacations file (HOL-010, HOL-011, HOL-012, HOL-016, HOL-017, DEC-032): the six
 * header names, the row types, `toCsv`, which turns the user's added holidays, hidden holidays and
 * vacations into the CSV text of the file, and `planImport`, which reads the text of a picked file
 * into an import plan. It writes and reads no file (files.js does), holds no CSV rules (domain/csv.js
 * does) and changes no saved record (the controller does, from the plan).
 */
import { countryCodeOf, countryName } from "./cities.js";
import { format, parse } from "./csv.js";
import { formatIsoDate } from "./format.js";
import { placeName } from "./places.js";
import { isCalendarDate } from "./user-holidays.js";
import { checkVacation } from "./vacations.js";

/** @typedef {import("./places.js").Place} Place */
/** @typedef {import("./user-holidays.js").HolidayEntry} HolidayEntry */
/** @typedef {import("./user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {import("./vacations.js").Vacation} Vacation */

/**
 * @typedef {{ type: "holiday" | "hiddenHoliday", entry: HolidayEntry }
 *   | { type: "vacation", placeId: string, vacation: Vacation }} ImportRow One row of the file that
 *   can be imported (HOL-017): a holiday, a hidden holiday, or a vacation with the id of the place
 *   it matched.
 */

/**
 * @typedef {object} ImportPlan What importing a file would do (HOL-017, DEC-032).
 * @property {"plan"} status
 * @property {number} total The data rows of the file; a blank line is not a row.
 * @property {ImportRow[]} rows The rows that can be imported, in the file's order.
 * @property {string[]} missingPlaces The names of the places that vacations name and the user does
 *   not have, each once.
 * @property {number} invalid The rows that cannot be imported for a reason other than a missing place.
 */

/** The English month names a date may use, three letters each (DSP-001). */
const monthNames = Object.freeze([
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
]);

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

/**
 * @param {string} text A date as `d-mmm-yy` or `d-mmm-yyyy`, with an English month in any case.
 * @returns {string | null} The date as `YYYY-MM-DD`, or `null` when it is not a real date. A
 *   two-digit year is read as 20yy.
 */
function readDate(text) {
  const found = /^(\d{1,2})-([a-z]{3})-(\d{2}|\d{4})$/i.exec(text.trim());
  if (found === null) return null;
  const month = monthNames.indexOf(found[2].toLowerCase()) + 1;
  const year = found[3].length === 2 ? 2000 + Number(found[3]) : Number(found[3]);
  const iso = [year, month, Number(found[1])]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  return month > 0 && isCalendarDate(iso) ? iso : null;
}

/** @typedef {{ row: ImportRow } | { missingPlace: string } | { invalid: true }} RowOutcome */

/**
 * @param {"holiday" | "hiddenHoliday"} type
 * @param {string[]} cells The six cells of the row.
 * @returns {RowOutcome} The holiday of the row, or `invalid` when its country, date or name is not valid.
 */
function holidayOutcome(type, cells) {
  const [, country, , start, , name] = cells;
  const countryCode = countryCodeOf(country);
  const date = readDate(start);
  if (countryCode === null || date === null || name.trim() === "") return { invalid: true };
  return { row: { type, entry: { countryCode, date, name: name.trim() } } };
}

/**
 * @param {string[]} cells The six cells of a vacation row.
 * @param {Place[]} places The user's places.
 * @returns {RowOutcome} The vacation of the row; `missingPlace` when its place is not one of the
 *   user's, matched by shown name in any case (the first place when two share a name); `invalid` when
 *   the place cell is empty, the dates are not real or the end is before the start.
 */
function vacationOutcome(cells, places) {
  const [, , placeText, start, end, label] = cells;
  const wanted = placeText.trim().toLowerCase();
  if (wanted === "") return { invalid: true };
  const place = places.find((each) => placeName(each, false).trim().toLowerCase() === wanted);
  if (place === undefined) return { missingPlace: placeText.trim() };
  const vacation = { start: readDate(start) ?? "", end: readDate(end) ?? "", label: label.trim() };
  if (checkVacation(vacation) !== "ok") return { invalid: true };
  return { row: { type: "vacation", placeId: place.id, vacation } };
}

/**
 * @param {string[]} cells One data row.
 * @param {Place[]} places The user's places.
 * @returns {RowOutcome} What the row is: importable, a vacation of a missing place, or invalid.
 */
function outcomeOf(cells, places) {
  if (cells.length !== Object.keys(HeaderName).length) return { invalid: true };
  const type = cells[0].trim().toLowerCase();
  if (type === RowType.holiday) return holidayOutcome("holiday", cells);
  if (type === RowType.hiddenHoliday) return holidayOutcome("hiddenHoliday", cells);
  return type === RowType.vacation ? vacationOutcome(cells, places) : { invalid: true };
}

/**
 * @param {string[] | undefined} first The first row of the file.
 * @returns {boolean} Whether it holds the six header names in order, trimmed, in any case.
 */
function isHeader(first) {
  const names = Object.values(HeaderName);
  return (
    first !== undefined &&
    first.length === names.length &&
    names.every((name, at) => first[at].trim().toLowerCase() === name.toLowerCase())
  );
}

/**
 * @param {string[]} names Place names, some of them the same in another case.
 * @returns {string[]} Each name once, in its first spelling.
 */
function distinctNames(names) {
  const seen = new Set();
  return names.filter((name) => !seen.has(name.toLowerCase()) && seen.add(name.toLowerCase()));
}

/**
 * Reads the text of a picked file into a plan (HOL-011, HOL-012, HOL-017).
 * @param {string} text The file's text.
 * @param {{ places: Place[] }} saved The user's places, which vacations are matched to.
 * @returns {{ status: "refused" } | ImportPlan} `refused` when the text is not CSV or its first row is
 *   not the six header names; else the plan: the rows that can be imported, the places that are
 *   missing and the count of invalid rows. Nothing is changed.
 */
export function planImport(text, { places }) {
  const table = parse(text);
  if (table === null || !isHeader(table[0])) return { status: "refused" };
  const outcomes = table
    .slice(1)
    .filter((cells) => cells.some((cell) => cell.trim() !== ""))
    .map((cells) => outcomeOf(cells, places));
  return {
    status: "plan",
    total: outcomes.length,
    rows: outcomes.flatMap((outcome) => ("row" in outcome ? [outcome.row] : [])),
    missingPlaces: distinctNames(
      outcomes.flatMap((outcome) => ("missingPlace" in outcome ? [outcome.missingPlace] : [])),
    ),
    invalid: outcomes.filter((outcome) => "invalid" in outcome).length,
  };
}
