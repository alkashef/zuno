// @ts-check
/**
 * @module storage
 * The only module that uses `localStorage`. Reads and writes the one settings record under the
 * key from `config.js` (SET-004, DEC-008). Validation is passed in, so this module stays a leaf.
 */
import { config } from "./config.js";
import { log as pageLog } from "./log.js";

/** @typedef {Pick<Storage, "getItem" | "setItem">} Store */
/** @typedef {import("./domain/settings.js").Settings} Settings */

/**
 * @typedef {object} StorageDeps
 * @property {Store} store Where the record lives; tests pass a fake.
 * @property {(value: unknown) => Settings | null} parse Validates a stored value.
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
 * @param {StorageDeps} deps
 * @returns {{ load: () => Settings | null, save: (settings: Settings) => void }}
 */
export function createStorage({ store, parse, key = config.storageKey, log = pageLog }) {
  return {
    /** @returns {Settings | null} The saved settings; `null` when none or invalid (logged). */
    load() {
      const raw = store.getItem(key);
      if (raw === null) return null;
      const settings = parse(parseJson(raw));
      if (settings === null) log.warn(`Ignoring the saved settings under "${key}": invalid record`);
      return settings;
    },
    /** @param {Settings} settings */
    save(settings) {
      store.setItem(key, JSON.stringify(settings));
    },
  };
}
