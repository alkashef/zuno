// @ts-check
/**
 * @module storage
 * The only module that uses `localStorage`. `createStorage` reads and writes one record under one
 * key; main.js makes one for the settings (SET-004, DEC-016) and one for the user's holidays
 * (HOL-009, DEC-017). Validation is passed in, so this module stays a leaf.
 */
import { config } from "./config.js";
import { log as pageLog } from "./log.js";

/** @typedef {Pick<Storage, "getItem" | "setItem">} Store */

/**
 * @template T
 * @typedef {object} StorageDeps
 * @property {Store} store Where the record lives; tests pass a fake.
 * @property {(value: unknown) => T | null} parse Validates a stored value.
 * @property {string} [key] Record key; defaults to `config.storageKey`.
 * @property {Pick<import("./log.js").Log, "warn">} [log]
 */

/**
 * @param {string} text
 * @returns {unknown} The parsed JSON, or `undefined` when the text is not JSON.
 */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * @template T
 * @param {StorageDeps<T>} deps
 * @returns {{ load: () => T | null, save: (record: T) => void }}
 */
export function createStorage({ store, parse, key = config.storageKey, log = pageLog }) {
  return {
    /** @returns {T | null} The saved record; `null` when none or invalid (logged). */
    load() {
      const raw = store.getItem(key);
      if (raw === null) return null;
      const record = parse(parseJson(raw));
      if (record === null) log.warn(`Ignoring the saved record under "${key}": invalid record`);
      return record;
    },
    /** @param {T} record */
    save(record) {
      store.setItem(key, JSON.stringify(record));
    },
  };
}
