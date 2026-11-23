// @ts-check
/**
 * @module domain/csv
 * Reads and writes CSV text (HOL-010, HOL-012, DEC-032): `format` turns rows of fields into text,
 * `parse` turns text back into rows. It follows RFC 4180. It knows nothing of holidays
 * (domain/holidays-file.js does) and reads or saves no file (files.js does).
 */

/**
 * One field and what ends it: a quoted field, or a run of characters without a comma, a quote or a
 * line break; then a comma, a line break or the end of the text.
 */
const fieldPattern = /("(?:[^"]|"")*"|[^",\r\n]*)(,|\r\n|\n|\r|$)/y;

/**
 * @param {string} field
 * @returns {string} The field, in quotes with each quote doubled when it holds a comma, a quote or a
 *   line break; else the field as it is.
 */
function quoteField(field) {
  return /[",\r\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

/**
 * Writes rows as CSV text.
 * @param {string[][]} rows
 * @returns {string} One line per row, each ended by `\r\n`; a field is quoted only when it must be.
 */
export function format(rows) {
  return rows.map((row) => `${row.map(quoteField).join(",")}\r\n`).join("");
}

/**
 * @param {string} field A field as written in the text, quoted or not.
 * @returns {string} The field's value.
 */
function unquote(field) {
  return field.startsWith('"') ? field.slice(1, -1).replaceAll('""', '"') : field;
}

/**
 * Reads CSV text.
 * @param {string} text Lines ended by `\n`, `\r\n` or `\r`; a leading byte-order mark is ignored.
 * @returns {string[][] | null} The rows, or `null` when the text is not CSV: a quote left open, or
 *   text after a closing quote.
 */
export function parse(text) {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const pattern = new RegExp(fieldPattern);
  /** @type {string[][]} */
  const rows = [];
  let row = /** @type {string[]} */ ([]);
  while (pattern.lastIndex < source.length) {
    const match = pattern.exec(source);
    if (match === null) return null;
    row = [...row, unquote(match[1])];
    if (match[2] === ",") continue;
    rows.push(row);
    row = [];
  }
  return row.length > 0 ? [...rows, [...row, ""]] : rows;
}
