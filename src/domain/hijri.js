// @ts-check
/**
 * @module domain/hijri
 * Hijri calendar rules (HIJ-001 to HIJ-003, DEC-003): the variants and adjustment range that places
 * validate against, and the Hijri date of a Gregorian date through `Intl`. It does not format the
 * date as text (domain/format.js does) and does not decide whether Hijri is shown (settings do).
 */

/** @typedef {{ year: number, month: number, day: number }} CalendarDate A Gregorian date. */

/**
 * @typedef {object} HijriDate A date in the Hijri calendar.
 * @property {number} day 1 to 30.
 * @property {string} month The English month name, for example `Jumada II`.
 * @property {number} year The Hijri year, for example 1448.
 */

/** The Hijri calendar variants a place can use (HIJ-002). */
export const HijriVariant = Object.freeze({ umalqura: "umalqura", tabular: "tabular" });

/** @typedef {keyof typeof HijriVariant} HijriVariantName */

/** The smallest and largest Hijri adjustment in days (HIJ-003). */
export const HijriAdjustRange = Object.freeze({ min: -1, max: 1 });

/**
 * @param {unknown} value
 * @returns {value is HijriVariantName} Whether it names a Hijri variant.
 */
export function isHijriVariant(value) {
  return typeof value === "string" && Object.hasOwn(HijriVariant, value);
}

/**
 * @param {unknown} value
 * @returns {boolean} Whether it is a whole number of days within the adjustment range.
 */
export function isHijriAdjust(value) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= HijriAdjustRange.min &&
    value <= HijriAdjustRange.max
  );
}

/** The `Intl` calendar that implements each Hijri variant (DEC-003). */
const intlCalendar = Object.freeze({ umalqura: "islamic-umalqura", tabular: "islamic-civil" });

/**
 * @param {Intl.DateTimeFormatPart[]} parts
 * @param {Intl.DateTimeFormatPartTypes} type
 * @returns {string} The text of the part of that type.
 */
function partText(parts, type) {
  const part = parts.find((candidate) => candidate.type === type);
  if (part === undefined) {
    throw new Error(`Intl returned no ${type} part`);
  }
  return part.value;
}

/**
 * The Hijri date of a Gregorian date. The adjustment moves the Gregorian date by whole days before
 * it is converted (HIJ-003).
 * @param {CalendarDate} date A Gregorian date.
 * @param {HijriVariantName} variant The Hijri calendar variant (HIJ-002).
 * @param {number} adjust Whole days, from -1 to +1.
 * @returns {HijriDate}
 * @throws {RangeError} When the variant is unknown or the adjustment is out of range.
 */
export function hijriDate(date, variant, adjust) {
  if (!isHijriVariant(variant) || !isHijriAdjust(adjust)) {
    throw new RangeError(`Invalid Hijri variant ${String(variant)} or adjustment ${adjust}`);
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    calendar: intlCalendar[variant],
    numberingSystem: "latn",
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(Date.UTC(date.year, date.month - 1, date.day + adjust));
  return {
    day: Number(partText(parts, "day")),
    month: partText(parts, "month"),
    year: Number(partText(parts, "year")),
  };
}
