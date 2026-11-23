// @ts-check
/**
 * @module domain/user-holidays
 * The holidays a user adds and hides (HOL-003, HOL-006 to HOL-012, DEC-017): adds, removes, hides
 * and shows an entry, validates a stored record (`parseUserHolidays`), merges imported entries
 * into the saved record (`mergeUserHolidays`), keeps the list of imported files and the `sources`
 * of each entry (HOL-020, HOL-022, HOL-023, DEC-035), and applies the record to a country's
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
 * @property {string[]} [sources] The ids of the imported files that list the entry; absent for an
 *   entry the user typed (DEC-035).
 */

/**
 * @typedef {object} ImportRecord One imported file (HOL-020, DEC-035).
 * @property {string} id `import-N`, unique in the record.
 * @property {string} fileName The name of the picked file.
 * @property {number} importedAt UTC milliseconds.
 */

/**
 * @typedef {object} UserHolidays The saved record (and the holidays file's shape). No two entries
 *   of one list share country, date and name.
 * @property {1} version
 * @property {HolidayEntry[]} added Holidays the user added, as national holidays (HOL-006).
 * @property {HolidayEntry[]} hidden Service holidays the user hid (HOL-008).
 * @property {ImportRecord[]} [imports] The imported files; absent in a record saved before M55 and
 *   in one with no import yet (HOL-023).
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
 * @param {unknown} value A stored `sources`.
 * @returns {string[] | null} The list when it holds at least one id and only text ids, else `null`:
 *   an entry with no valid sources is the user's own (DEC-035).
 */
export function validSources(value) {
  const isList = Array.isArray(value) && value.length > 0;
  return isList && value.every((id) => typeof id === "string" && id !== "") ? [...value] : null;
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
  const sources = validSources(/** @type {Record<string, unknown>} */ (value).sources);
  return { countryCode, date, name: name.trim(), ...(sources === null ? {} : { sources }) };
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
 * @param {unknown} each One stored import record.
 * @returns {boolean} Whether it has a text id that is not empty, a text file name and a finite time.
 */
function isImportRecord(each) {
  if (typeof each !== "object" || each === null) return false;
  const { id, fileName, importedAt } = /** @type {Record<string, unknown>} */ (each);
  return (
    typeof id === "string" &&
    id !== "" &&
    typeof fileName === "string" &&
    Number.isFinite(importedAt)
  );
}

/**
 * @param {unknown} value A stored `imports`.
 * @returns {ImportRecord[] | null | undefined} The records, `undefined` when there is no list (a
 *   record saved before M55), or `null` when it is not a list of valid records with distinct ids.
 */
function parseImports(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every(isImportRecord)) return null;
  const records = value.map(({ id, fileName, importedAt }) => ({ id, fileName, importedAt }));
  return new Set(records.map((each) => each.id)).size === records.length ? records : null;
}

/**
 * @param {HolidayEntry[]} entries
 * @param {ImportRecord[]} imports
 * @returns {HolidayEntry[]} The entries with only the sources that name a listed import; an entry
 *   with none left is the user's own.
 */
function withKnownSources(entries, imports) {
  const known = new Set(imports.map((each) => each.id));
  return entries.map(({ sources, ...entry }) => {
    const kept = validSources((sources ?? []).filter((id) => known.has(id)));
    return kept === null ? entry : { ...entry, sources: kept };
  });
}

/**
 * @param {Record<string, unknown>} record A stored record of version 1.
 * @returns {{ imports: ImportRecord[], added: HolidayEntry[], hidden: HolidayEntry[] } | null} The
 *   valid lists (`imports` empty when the record has none), or `null` when one list is not valid.
 */
function parseParts(record) {
  const imports = parseImports(record.imports);
  const added = parseList(record.added);
  const hidden = parseList(record.hidden);
  if (imports === null || added === null || hidden === null) return null;
  return { imports: imports ?? [], added, hidden };
}

/**
 * Validates a stored record (HOL-009, HOL-023, DEC-017, DEC-035).
 * @param {unknown} value The parsed JSON of the record.
 * @returns {UserHolidays | null} The record, or `null` when it is not a valid version 1 record.
 *   A record with no `imports` has none; a source that names no listed import is dropped.
 */
export function parseUserHolidays(value) {
  if (typeof value !== "object" || value === null) return null;
  const record = /** @type {Record<string, unknown>} */ (value);
  const parts = record.version === 1 ? parseParts(record) : null;
  if (parts === null) return null;
  const { imports, added, hidden } = parts;
  return {
    version: 1,
    ...(record.imports === undefined ? {} : { imports }),
    added: withKnownSources(added, imports),
    hidden: withKnownSources(hidden, imports),
  };
}

/**
 * @template {{ sources?: string[] }} Item
 * @param {Item[]} items A list of entries, each the user's own or from imported files.
 * @param {Item} item A valid entry without `sources`.
 * @param {string} importId
 * @param {(first: Item, second: Item) => boolean} same Whether two items are the same entry.
 * @returns {Item[]} The list with the item from that import: a new item is added with that source;
 *   an identical item from an earlier import gets the source too; an identical item the user typed
 *   (no sources) stays as it is (DEC-035).
 */
export function taggedWith(items, item, importId, same) {
  const at = items.findIndex((each) => same(each, item));
  if (at < 0) return [...items, { ...item, sources: [importId] }];
  const { sources } = items[at];
  if (sources === undefined || sources.includes(importId)) return items;
  return items.map((each, index) =>
    index === at ? { ...each, sources: [...sources, importId] } : each,
  );
}

/**
 * @template {{ sources?: string[] }} Item
 * @param {Item[]} items
 * @param {string} importId
 * @returns {Item[]} The items without that source; an item that had sources and has none left is
 *   dropped, an item the user typed stays (HOL-022). The same list when nothing changes.
 */
export function withoutSource(items, importId) {
  if (!items.some((each) => each.sources?.includes(importId))) return items;
  return items.flatMap((each) => {
    const rest = (each.sources ?? []).filter((id) => id !== importId);
    if (each.sources === undefined || rest.length === each.sources.length) return [each];
    return rest.length === 0 ? [] : [{ ...each, sources: rest }];
  });
}

/**
 * @param {{ sources?: string[] }[]} items
 * @param {string} importId
 * @returns {number} How many items came from that import, those that other imports also list
 *   included (HOL-020).
 */
export function countFrom(items, importId) {
  return items.filter((each) => each.sources?.includes(importId)).length;
}

/**
 * @param {UserHolidays} record
 * @returns {ImportRecord[]} The imported files, oldest first; none for a record saved before M55.
 */
export function importsOf(record) {
  return record.imports ?? [];
}

/**
 * @param {UserHolidays} record
 * @returns {string} An id such as `import-3` that no imported file has.
 */
export function nextImportId(record) {
  const taken = new Set(importsOf(record).map((each) => each.id));
  let number = taken.size + 1;
  while (taken.has(`import-${number}`)) number += 1;
  return `import-${number}`;
}

/**
 * @param {HolidayEntry[]} entries
 * @param {HolidayEntry} entry
 * @returns {HolidayEntry[]} The entries, with the entry at the end unless they hold it.
 */
function addedOnce(entries, entry) {
  return entries.some((each) => sameEntry(each, entry)) ? entries : [...entries, entry];
}

/**
 * Merges imported holidays into the saved record (HOL-011, HOL-020).
 * @param {UserHolidays} saved
 * @param {Pick<UserHolidays, "added" | "hidden">} imported Valid entries, such as those of an
 *   import plan.
 * @param {ImportRecord} [importRecord] The imported file: its record is listed and every entry it
 *   contributes gets its id as a source (`taggedWith`). Without it nothing is tagged.
 * @returns {UserHolidays} The saved entries, then the imported ones the saved record lacks; nothing
 *   is removed and no entry appears twice.
 */
export function mergeUserHolidays(saved, imported, importRecord) {
  /** @param {ListName} list */
  const merged = (list) =>
    imported[list].reduce(
      (entries, entry) =>
        importRecord === undefined
          ? addedOnce(entries, entry)
          : taggedWith(entries, entry, importRecord.id, sameEntry),
      saved[list],
    );
  const base = { ...saved, added: merged("added"), hidden: merged("hidden") };
  return importRecord === undefined
    ? base
    : { ...base, imports: [...importsOf(saved), importRecord] };
}

/**
 * Takes an imported file out of the record (HOL-022).
 * @param {UserHolidays} record
 * @param {string} importId
 * @returns {UserHolidays} The record without that import and without the entries that only it
 *   listed; entries another import also lists keep their other sources; entries the user typed stay.
 *   The same record when no import has that id.
 */
export function withoutImport(record, importId) {
  if (!importsOf(record).some((each) => each.id === importId)) return record;
  return {
    ...record,
    imports: importsOf(record).filter((each) => each.id !== importId),
    added: withoutSource(record.added, importId),
    hidden: withoutSource(record.hidden, importId),
  };
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
