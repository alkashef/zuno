// @ts-check
/** @module storage.test Unit tests for src/storage.js with a fake store (SET-004). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createPlace } from "../../src/domain/places.js";
import { defaultSettings, parseSettings } from "../../src/domain/settings.js";
import { createStorage } from "../../src/storage.js";

/** @returns {{ store: { getItem: (k: string) => string | null, setItem: (k: string, v: string) => void }, data: Map<string, string> }} */
function fakeStore() {
  /** @type {Map<string, string>} */
  const data = new Map();
  return {
    data,
    store: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => void data.set(key, value),
    },
  };
}

test("test_set_004_settings_round_trip_in_storage", () => {
  const { store, data } = fakeStore();
  const storage = createStorage({ store, parse: parseSettings, key: "k" });
  assert.equal(storage.load(), null);
  const settings = {
    ...defaultSettings(540, 1020),
    places: [createPlace("a", "riyadh")],
    showHijri: true,
  };
  storage.save(settings);
  assert.ok(data.has("k"));
  assert.deepEqual(storage.load(), settings);
});

test("test_set_004_invalid_record_loads_as_null_and_logs_warning", () => {
  for (const bad of ["not json", JSON.stringify({ version: 9 })]) {
    const { store, data } = fakeStore();
    data.set("k", bad);
    /** @type {string[]} */
    const warnings = [];
    const log = { warn: (/** @type {string} */ message) => void warnings.push(message) };
    const storage = createStorage({ store, parse: parseSettings, key: "k", log });
    assert.equal(storage.load(), null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /"k"/);
  }
});
