// @ts-check
/**
 * @module domain/format
 * Formats a local date as dd-mmm-yy and a local time as 12-hour text (DSP-001, DSP-002, EX-005,
 * EX-006). It does not compute local times (domain/zones.js does). Hijri dates are added with the
 * Hijri module (DSP-003).
 */

/** @typedef {import("./zones.js").LocalDateTime} LocalDateTime */

/**
 * @param {number} value A non-negative integer.
 * @returns {string} The value with at least two digits.
 */
function twoDigits(value) {
  return String(value).padStart(2, "0");
}

/**
 * @param {LocalDateTime} local
 * @returns {string} The Gregorian date as dd-mmm-yy, in English, for example `16-Nov-26` (DSP-001).
 */
export function formatDate(local) {
  const monthNames = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const month = monthNames.format(Date.UTC(2000, local.month - 1, 1));
  return `${twoDigits(local.day)}-${month}-${twoDigits(local.year % 100)}`;
}

/**
 * @param {LocalDateTime} local
 * @returns {string} The time as 12-hour text with an uppercase suffix, for example `9:25 AM`
 * (DSP-002).
 */
export function formatTime(local) {
  const suffix = local.hour < 12 ? "AM" : "PM";
  const hour = local.hour % 12 === 0 ? 12 : local.hour % 12;
  return `${hour}:${twoDigits(local.minute)} ${suffix}`;
}
