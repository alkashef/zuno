// @ts-check
/**
 * @module domain/zones
 * Gives the local date and time of an instant in a time zone, with the zone's daylight-saving rules
 * for any date (CLK-001, CLK-002, EX-001), and the reverse: the instant of a local date and time
 * (PCK-006, PCK-007). It does not format the result (domain/format.js does) and does not read the
 * current time (clock.js does).
 */

const msPerMinute = 60 * 1000;
const msPerDay = 24 * 60 * msPerMinute;

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

/**
 * @param {LocalDateTime} local
 * @returns {number} The wall-clock time read as if it were UTC, in milliseconds.
 */
function wallMillis(local) {
  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
}

/**
 * @param {number} instant UTC milliseconds.
 * @param {string} zone IANA time-zone name.
 * @returns {number} The zone's offset from UTC at that instant, in milliseconds, with daylight
 *   saving applied (CLK-002); east of UTC is positive.
 * @throws {RangeError} When the zone is not a valid IANA name.
 */
export function zoneOffset(instant, zone) {
  const minute = Math.floor(instant / msPerMinute) * msPerMinute;
  return wallMillis(localDateTime(minute, zone)) - minute;
}

/**
 * The instant a zone's offset changes between two instants. It assumes at most one change between
 * them, which holds for spans of up to a few days.
 * @param {string} zone IANA time-zone name.
 * @param {number} from UTC milliseconds.
 * @param {number} to UTC milliseconds, after `from`.
 * @returns {number | null} The first instant with the new offset, to the minute, or `null`.
 * @throws {RangeError} When the zone is not a valid IANA name.
 */
export function offsetChange(zone, from, to) {
  const before = zoneOffset(from, zone);
  if (zoneOffset(to, zone) === before) return null;
  let low = Math.floor(from / msPerMinute);
  let high = Math.floor(to / msPerMinute);
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (zoneOffset(middle * msPerMinute, zone) === before) low = middle;
    else high = middle;
  }
  return high * msPerMinute;
}

/**
 * The first instant at which a zone's clock shows a local date and time or later. A time that
 * repeats when the clock goes back gives its first occurrence. A time the clock skips gives the
 * instant the clock jumps forward.
 * @param {string} zone IANA time-zone name.
 * @param {LocalDateTime} local
 * @returns {number} UTC milliseconds.
 * @throws {RangeError} When the zone is not a valid IANA name.
 */
export function instantAtLocal(zone, local) {
  const wall = wallMillis(local);
  const before = zoneOffset(wall - msPerDay, zone);
  const change = offsetChange(zone, wall - msPerDay, wall + msPerDay);
  if (change === null || wall < change + before) return wall - before;
  const after = zoneOffset(change, zone);
  return wall < change + after ? change : wall - after;
}
