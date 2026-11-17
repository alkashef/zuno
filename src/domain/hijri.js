// @ts-check
/**
 * @module domain/hijri
 * Hijri calendar rules (HIJ-001 to HIJ-003). For now it holds only the fixed vocabularies that
 * places validate against; the date logic arrives with the Hijri milestone.
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
