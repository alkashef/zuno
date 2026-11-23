// @ts-check
/**
 * @module domain/user-holidays
 * The holidays a user adds and hides (HOL-003, HOL-006 to HOL-012, DEC-017): adds, removes, hides
 * and shows an entry, validates a stored or imported record (`parseUserHolidays`), merges an
 * imported record into the saved one (`mergeUserHolidays`), and applies the record to a country's
 * service holidays (`effectiveHolidays`). Pure: it saves nothing (the controller does, through the
 * injected holiday storage), reads no file (files.js does) and reads no service data (api.js and
 * domain/holidays.js do). A refused change returns `null`, so the caller knows to save nothing.
 */
import { isKnownCountry } from "./zone-table.js";

/** @typedef {import("./holidays.js").Holiday} Holiday */

/**
 * @typedef {object} HolidayEntry One holiday of a country or territory, added or hidden.
 * @property {string} countryCode ISO 3166-1 alpha-2 code of a known country or territory (DEC-029).
 * @property {string} date `YYYY-MM-DD`; a real calendar date.
 * @property {string} name Not empty after trimming.
 */

/**
 * @typedef {object} UserHolidays The saved record (and the holidays file's shape). No two entries
 *   of one list share country, date and name.
 * @property {1} version
 * @property {HolidayEntry[]} added Holidays the user added, as national holidays (HOL-006).
 * @property {HolidayEntry[]} hidden Service holidays the user hid (HOL-008).
 */

/** @typedef {"added" | "hidden"} ListName */

/** @returns {UserHolidays} A record with no added and no hidden holidays. */
export function emptyUserHolidays() {
  return { version: 1, added: [], hidden: [] };
}

/**
 * @param {unknown} value
 * @returns {value is string} Whether the value is a `YYYY-MM-DD` string of a real calendar date.
 */
export function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * @param {unknown} value Anything, such as one entry of a stored record or an action's fields.
 * @returns {HolidayEntry | null} The entry with its name trimmed, or `null` when the date is not a
 *   real calendar date, the name is empty after trimming or the country is not known (DEC-029).
 */
function toEntry(value) {
  if (typeof value !== "object" || value === null) return null;
  const { countryCode, date, name } = /** @type {Record<string, unknown>} */ (value);
  if (typeof name !== "string" || name.trim() === "") return null;
  if (!isCalendarDate(date) || !isKnownCountry(countryCode)) return null;
  return { countryCode, date, name: name.trim() };
}

/**
 * @param {HolidayEntry} first
 * @param {HolidayEntry} second
 * @returns {boolean} Whether both name the same country, date and name.
 */
function sameEntry(first, second) {
  return (
    first.countryCode === second.countryCode &&
    first.date === second.date &&
    first.name === second.name
  );
}

/**
 * @param {UserHolidays} record
 * @param {ListName} list
 * @param {HolidayEntry} entry A valid entry.
 * @returns {UserHolidays | null} The record with the entry put in the list, or `null` when the list
 *   already holds it.
 */
function withEntry(record, list, entry) {
  if (record[list].some((each) => sameEntry(each, entry))) return null;
  return { ...record, [list]: [...record[list], entry] };
}

/**
 * @param {UserHolidays} record
 * @param {ListName} list
 * @param {HolidayEntry} entry
 * @returns {UserHolidays | null} The record without the entry in the list, or `null` when the list
 *   does not hold it.
 */
function withoutEntry(record, list, entry) {
  const kept = record[list].filter((each) => !sameEntry(each, entry));
  return kept.length === record[list].length ? null : { ...record, [list]: kept };
}

/**
 * Adds a holiday to a known country or territory (HOL-006, DEC-029).
 * @param {UserHolidays} record
 * @param {HolidayEntry} entry The country code, the date and the name (trimmed here).
 * @returns {UserHolidays | null} The new record, or `null` when refused: a date that is not a real
 *   calendar date, an empty name, a country that is not known, or a holiday already added.
 */
export function addHoliday(record, entry) {
  const valid = toEntry(entry);
  return valid === null ? null : withEntry(record, "added", valid);
}

/**
 * Removes a holiday the user added (HOL-007).
 * @param {UserHolidays} record
 * @param {HolidayEntry} entry
 * @returns {UserHolidays | null} The new record, or `null` when no such holiday was added.
 */
export function removeHoliday(record, entry) {
  return withoutEntry(record, "added", entry);
}

/**
 * Hides a holiday that came from the holiday service (HOL-008).
 * @param {UserHolidays} record
 * @param {HolidayEntry} entry The service holiday's country code, date and name.
 * @returns {UserHolidays | null} The new record, or `null` when the entry is not valid or is
 *   already hidden.
 */
export function hideHoliday(record, entry) {
  const valid = toEntry(entry);
  return valid === null ? null : withEntry(record, "hidden", valid);
}

/**
 * Shows a hidden holiday again (HOL-008).
 * @param {UserHolidays} record
 * @param {HolidayEntry} entry
 * @returns {UserHolidays | null} The new record, or `null` when no such holiday is hidden.
 */
export function showHoliday(record, entry) {
  return withoutEntry(record, "hidden", entry);
}

/**
 * @param {UserHolidays} record
 * @param {HolidayEntry} entry
 * @returns {boolean} Whether the user added this holiday (the holiday card offers Remove, HOL-007).
 */
export function isAddedHoliday(record, entry) {
  return record.added.some((each) => sameEntry(each, entry));
}

/**
 * @param {unknown} value A stored list.
 * @returns {HolidayEntry[] | null} Its entries, or `null` when it is not a list of valid entries
 *   without repeats.
 */
function parseList(value) {
  if (!Array.isArray(value)) return null;
  const entries = value.map(toEntry);
  if (entries.some((entry, index) => entry === null || entry.name !== value[index].name)) {
    return null;
  }
  const valid = /** @type {HolidayEntry[]} */ (entries);
  const unique = valid.every(
    (entry, index) => valid.findIndex((e) => sameEntry(e, entry)) === index,
  );
  return unique ? valid : null;
}

/**
 * Validates a stored record (HOL-009, DEC-017).
 * @param {unknown} value The parsed JSON of the record.
 * @returns {UserHolidays | null} The record, or `null` when it is not a valid version 1 record.
 */
export function parseUserHolidays(value) {
  if (typeof value !== "object" || value === null) return null;
  const record = /** @type {Record<string, unknown>} */ (value);
  if (record.version !== 1) return null;
  const added = parseList(record.added);
  const hidden = parseList(record.hidden);
  return added === null || hidden === null ? null : { version: 1, added, hidden };
}

/**
 * Merges an imported record into the saved one (HOL-011).
 * @param {UserHolidays} saved
 * @param {UserHolidays} imported A record that passed `parseUserHolidays`.
 * @returns {UserHolidays} The saved entries, then the imported ones the saved record lacks; nothing
 *   is removed and no entry appears twice.
 */
export function mergeUserHolidays(saved, imported) {
  /** @param {ListName} list */
  const merged = (list) =>
    imported[list].reduce(
      (entries, entry) =>
        entries.some((each) => sameEntry(each, entry)) ? entries : [...entries, entry],
      saved[list],
    );
  return { version: 1, added: merged("added"), hidden: merged("hidden") };
}

/**
 * A country's public holidays as the page uses them (HOL-003): the service's list without the
 * holidays the user hid, plus the holidays the user added, as national holidays.
 * @param {Holiday[]} serviceHolidays The country's holidays from `toHolidays`.
 * @param {UserHolidays} record
 * @param {string} countryCode
 * @returns {Holiday[]} The service's holidays first, in their order, then the added ones.
 */
export function effectiveHolidays(serviceHolidays, record, countryCode) {
  const isHidden = (/** @type {Holiday} */ holiday) =>
    record.hidden.some((entry) =>
      sameEntry(entry, { countryCode, date: holiday.date, name: holiday.name.trim() }),
    );
  const added = record.added
    .filter((entry) => entry.countryCode === countryCode)
    .map((entry) => ({ date: entry.date, name: entry.name, regions: [] }));
  return [...serviceHolidays.filter((holiday) => !isHidden(holiday)), ...added];
}
