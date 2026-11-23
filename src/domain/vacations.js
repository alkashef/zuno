// @ts-check
/**
 * @module domain/vacations
 * The vacations of one place (VAC-002, VAC-003, VAC-004, VAC-006, HOL-020, DEC-030, DEC-035): adds,
 * changes and removes one, adds one from an imported file with its source, finds those that cover a
 * date, checks the fields of a form and validates a stored list. Pure: it saves nothing (the controller does), makes no colour (domain/calendar.js and the
 * views do) and does not hold the place (domain/places.js does). A refused change returns `null`,
 * so the caller knows to save nothing.
 */
import { isCalendarDate, taggedWith, validSources } from "./user-holidays.js";

/**
 * @typedef {object} Vacation A span of days off that a place takes once (DEC-030). The three fields
 *   together name it: no two vacations of one place are equal; overlap is allowed.
 * @property {string} start `YYYY-MM-DD`, a real calendar date.
 * @property {string} end `YYYY-MM-DD`, a real calendar date, not before the start.
 * @property {string} label Trimmed; may be empty.
 * @property {string[]} [sources] The ids of the imported files that list the vacation; absent for
 *   one the user typed (DEC-035).
 */

/** @typedef {"ok" | "start-missing" | "end-missing" | "end-before-start"} VacationCheck */

/**
 * @param {unknown} value
 * @returns {string} The value when it is text, else the empty text.
 */
function textOf(value) {
  return typeof value === "string" ? value : "";
}

/**
 * Checks the fields of a vacation form (VAC-003).
 * @param {{ start?: unknown, end?: unknown }} entry The start and end as typed.
 * @returns {VacationCheck} `ok`, or what the form must tell the user: the start or the end is not a
 *   date, or the end is before the start.
 */
export function checkVacation(entry) {
  if (!isCalendarDate(entry.start)) return "start-missing";
  if (!isCalendarDate(entry.end)) return "end-missing";
  return entry.end < entry.start ? "end-before-start" : "ok";
}

/**
 * @param {unknown} value Anything, such as an action's fields or one entry of a stored list.
 * @returns {Vacation | null} The vacation with its label trimmed, or `null` when it does not pass
 *   `checkVacation` or its label is not text.
 */
function toVacation(value) {
  if (typeof value !== "object" || value === null) return null;
  const { start, end, label } = /** @type {Record<string, unknown>} */ (value);
  if (typeof label !== "string" || checkVacation({ start, end }) !== "ok") return null;
  const sources = validSources(/** @type {Record<string, unknown>} */ (value).sources);
  return {
    start: /** @type {string} */ (start),
    end: /** @type {string} */ (end),
    label: label.trim(),
    ...(sources === null ? {} : { sources }),
  };
}

/**
 * @param {Vacation} first
 * @param {Vacation} second
 * @returns {boolean} Whether both have the same start, end and label.
 */
function sameVacation(first, second) {
  return first.start === second.start && first.end === second.end && first.label === second.label;
}

/**
 * Adds a vacation at the end of the list (VAC-002).
 * @param {Vacation[]} vacations A place's vacations.
 * @param {{ start?: unknown, end?: unknown, label?: unknown }} entry The start, the end and the label
 *   (trimmed here).
 * @returns {Vacation[] | null} The new list, or `null` when refused: a start or end that is not a
 *   date, an end before the start (VAC-003), or a copy of a vacation already in the list.
 */
export function addVacation(vacations, entry) {
  const vacation = toVacation({ ...entry, label: textOf(entry.label) });
  if (vacation === null || vacations.some((each) => sameVacation(each, vacation))) return null;
  return [...vacations, vacation];
}

/**
 * Adds a vacation of an imported file (HOL-020, DEC-035).
 * @param {Vacation[]} vacations A place's vacations.
 * @param {Vacation} vacation A valid vacation of an import plan.
 * @param {string} importId
 * @returns {Vacation[] | null} The list with the vacation from that import: a new one is added with
 *   that source, an identical one of an earlier import gets the source too, and an identical one
 *   the user typed stays as it is; `null` when the list would not change.
 */
export function importVacation(vacations, vacation, importId) {
  const tagged = taggedWith(vacations, vacation, importId, sameVacation);
  return tagged === vacations ? null : tagged;
}

/**
 * Changes a whole vacation, in its place in the list (VAC-005).
 * @param {Vacation[]} vacations A place's vacations.
 * @param {Vacation} original The saved vacation to change.
 * @param {{ start?: unknown, end?: unknown, label?: unknown }} entry The new start, end and label.
 * @returns {Vacation[] | null} The new list, or `null` when refused: the original is not in the
 *   list, the entry is not valid (VAC-003), or it would be a copy of another vacation.
 */
export function changeVacation(vacations, original, entry) {
  const vacation = toVacation({ ...entry, label: textOf(entry.label) });
  const at = vacations.findIndex((each) => sameVacation(each, original));
  if (vacation === null || at < 0) return null;
  const copies = vacations.some((each, index) => index !== at && sameVacation(each, vacation));
  return copies ? null : vacations.map((each, index) => (index === at ? vacation : each));
}

/**
 * Removes a whole vacation (VAC-005).
 * @param {Vacation[]} vacations A place's vacations.
 * @param {Vacation} original The saved vacation to remove.
 * @returns {Vacation[]} The list without it; the same content when it is not in the list.
 */
export function removeVacation(vacations, original) {
  return vacations.filter((each) => !sameVacation(each, original));
}

/**
 * @param {Vacation[]} vacations A place's vacations.
 * @param {string} date `YYYY-MM-DD`.
 * @returns {Vacation[]} The vacations that cover the date, start and end days included, in the
 *   order they were added (VAC-004).
 */
export function vacationsOn(vacations, date) {
  return vacations.filter((each) => each.start <= date && date <= each.end);
}

/**
 * @param {unknown} value A stored list.
 * @returns {Vacation[]} The valid vacations of the list, labels trimmed, a repeated one once. An
 *   entry that is not valid is dropped alone (DEC-030); a value that is not a list holds none.
 */
export function parseVacations(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(toVacation)
    .filter((vacation) => vacation !== null)
    .reduce(
      (kept, vacation) =>
        kept.some((each) => sameVacation(each, vacation)) ? kept : [...kept, vacation],
      /** @type {Vacation[]} */ ([]),
    );
}

/**
 * @param {unknown} value
 * @returns {value is Vacation[]} Whether it is a list of valid vacations, each trimmed and none
 *   repeated.
 */
export function isVacationList(value) {
  if (!Array.isArray(value)) return false;
  const parsed = parseVacations(value);
  return (
    parsed.length === value.length && parsed.every((each, at) => sameVacation(each, value[at]))
  );
}
