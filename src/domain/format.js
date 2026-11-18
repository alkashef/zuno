// @ts-check
/**
 * @module domain/format
 * Formats a local date as dd-mmm-yy, the first and last date of the picker window (PCK-009) and a
 * local time as 12-hour text (DSP-001, DSP-002, EX-005, EX-006), minutes after midnight as 12-hour text, a Hijri date as dd-month-yyyy (DSP-003), a month title (PCK-007), a weekday as two
 * English letters (NFR-003), a list of weekend days as English names (SET-016) and an offset from
 * UTC. It does not compute local times or offsets
 * (domain/zones.js does) or Hijri dates (domain/hijri.js does).
 */

/** @typedef {import("./zones.js").LocalDateTime} LocalDateTime */
/** @typedef {import("./hijri.js").HijriDate} HijriDate */
/** @typedef {{ year: number, month: number, day: number }} CalendarDate A date, `month` 1 to 12. */

/**
 * @param {number} value A non-negative integer.
 * @returns {string} The value with at least two digits.
 */
function twoDigits(value) {
  return String(value).padStart(2, "0");
}

/**
 * @param {number} hour 0 to 23.
 * @param {number} minute 0 to 59.
 * @returns {string} The time as 12-hour text with an uppercase suffix and no leading zero.
 */
function clockText(hour, minute) {
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${twoDigits(minute)} ${suffix}`;
}

/**
 * @param {CalendarDate | LocalDateTime} local A date, with or without a time of day.
 * @returns {string} The Gregorian date as dd-mmm-yy, in English, for example `16-Nov-26` (DSP-001).
 */
export function formatDate(local) {
  const monthNames = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const month = monthNames.format(Date.UTC(2000, local.month - 1, 1));
  return `${twoDigits(local.day)}-${month}-${twoDigits(local.year % 100)}`;
}

/**
 * @param {CalendarDate} first
 * @param {CalendarDate} last On or after `first`.
 * @returns {string} One date when both are the same, for example `20-Nov-26`; the two day numbers
 *   joined by an en dash in one month, for example `20–21-Nov-26`; else both dates with a spaced en
 *   dash, for example `30-Nov-26 – 01-Dec-26` (PCK-009, DSP-001).
 */
export function formatDateRange(first, last) {
  const sameMonth = first.year === last.year && first.month === last.month;
  if (sameMonth && first.day === last.day) return formatDate(first);
  if (sameMonth) return `${twoDigits(first.day)}–${formatDate(last)}`;
  return `${formatDate(first)} – ${formatDate(last)}`;
}

/**
 * @param {LocalDateTime} local
 * @returns {string} The time as 12-hour text with an uppercase suffix, for example `9:25 AM`
 * (DSP-002).
 */
export function formatTime(local) {
  return clockText(local.hour, local.minute);
}

/**
 * @param {number} minutes Minutes after midnight, 0 to 1440.
 * @returns {string} The time of day as 12-hour text, for example `9:00 AM` (DSP-002); 1440, the
 *   midnight that ends the day, is `12:00 AM`.
 */
export function formatMinutes(minutes) {
  return clockText(Math.floor(minutes / 60) % 24, minutes % 60);
}

/**
 * @param {HijriDate} hijri
 * @returns {string} The Hijri date as two-digit day, month name and year, for example
 * `06-Jumada II-1448` (DSP-003).
 */
export function formatHijri(hijri) {
  return `${twoDigits(hijri.day)}-${hijri.month}-${hijri.year}`;
}

/**
 * @param {HijriDate} hijri
 * @returns {string} The Hijri month and year for the band above the grid, for example
 * `Jumada II-1448` (DSP-003).
 */
export function formatHijriMonth(hijri) {
  return `${hijri.month}-${hijri.year}`;
}

/**
 * @param {{ year: number, month: number }} monthRef The month, `month` 1 to 12.
 * @returns {string} The month's full English name and the year, for example `November 2026`.
 */
export function formatMonth(monthRef) {
  const names = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
  return `${names.format(Date.UTC(2000, monthRef.month - 1, 1))} ${monthRef.year}`;
}

/**
 * @param {number} instant UTC milliseconds.
 * @returns {string} The time of day and the date in the browser's own time zone, for example
 * `9:25 AM · 16-Nov-26` (the "Updated" time, DSP-001, DSP-002).
 */
export function formatClock(instant) {
  const date = new Date(instant);
  const local = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
  return `${formatTime(local)} · ${formatDate(local)}`;
}

/**
 * @param {{ year: number, month: number, day: number }} date A calendar date, `month` 1 to 12.
 * @returns {string} The first two letters of the weekday's English name, for example `Mo`
 *   (NFR-003).
 */
export function formatWeekday(date) {
  const names = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
  return names.format(Date.UTC(date.year, date.month - 1, date.day)).slice(0, 2);
}

/**
 * @param {number[]} days Days of the week, 1 = Monday to 7 = Sunday.
 * @returns {string} The full English day names in the order given, joined as a list, for example
 *   `Saturday and Sunday` (SET-016).
 */
export function formatDayNames(days) {
  const names = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
  const spelled = days.map((day) => names.format(Date.UTC(2024, 0, day)));
  return new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(spelled);
}

/**
 * @param {number} offset An offset from UTC in milliseconds, east positive.
 * @returns {string} The offset as `UTC` with a sign and whole hours, and minutes when there are
 *   any, for example `UTC+3`, `UTC+5:30` or `UTC−5` (with a minus sign, U+2212).
 */
export function formatOffset(offset) {
  const minutes = Math.round(Math.abs(offset) / 60000);
  const sign = offset < 0 ? "−" : "+";
  const rest = minutes % 60 === 0 ? "" : `:${twoDigits(minutes % 60)}`;
  return `UTC${sign}${Math.floor(minutes / 60)}${rest}`;
}
