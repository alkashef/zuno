// @ts-check
/**
 * @module clock
 * The only reader of the current time and of the colour-scheme query (CLK-001, CLK-003, THM-001,
 * DEC-007). It keeps no state; the controller and its tests receive it as an argument so they can
 * use a fake.
 */

/** @returns {number} The current instant in UTC milliseconds. */
export function now() {
  return Date.now();
}

/** @returns {boolean} Whether the browser asks for a dark colour scheme. */
export function prefersDark() {
  return globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
}
