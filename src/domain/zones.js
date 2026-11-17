// @ts-check
/**
 * @module domain/zones
 * Gives the local date and time of an instant in a time zone, with the zone's daylight-saving rules
 * for any date (CLK-001, CLK-002, EX-001). It does not format the result (domain/format.js does)
 * and does not read the current time (clock.js does).
 */

/**
 * @typedef {object} LocalDateTime A wall-clock date and time in one time zone.
 * @property {number} year
 * @property {number} month 1 to 12.
 * @property {number} day 1 to 31.
 * @property {number} hour 0 to 23.
 * @property {number} minute 0 to 59.
 */

/**
 * @param {Intl.DateTimeFormatPart[]} parts
 * @param {Intl.DateTimeFormatPartTypes} type
 * @returns {number} The numeric value of the part of that type.
 */
function partValue(parts, type) {
  const part = parts.find((candidate) => candidate.type === type);
  if (part === undefined) {
    throw new Error(`Intl returned no ${type} part`);
  }
  return Number(part.value);
}

/**
 * The local date and time of an instant in a zone, through `Intl` (DEC-001).
 * @param {number} instant UTC milliseconds.
 * @param {string} zone IANA time-zone name, for example `Europe/London`.
 * @returns {LocalDateTime}
 * @throws {RangeError} When the zone is not a valid IANA name.
 */
export function localDateTime(instant, zone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    calendar: "gregory",
    numberingSystem: "latn",
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(instant);
  return {
    year: partValue(parts, "year"),
    month: partValue(parts, "month"),
    day: partValue(parts, "day"),
    hour: partValue(parts, "hour"),
    minute: partValue(parts, "minute"),
  };
}
