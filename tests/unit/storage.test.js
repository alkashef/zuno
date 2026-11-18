// @ts-check
/** @module storage.test Unit tests for src/storage.js with a fake store (SET-004). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createPlace } from "../../src/domain/places.js";
import { defaultSettings, parseSettings } from "../../src/domain/settings.js";
import { parseUserHolidays } from "../../src/domain/user-holidays.js";
import { createStorage } from "../../src/storage.js";

/** The whole day only: 24, 24, 24. */
const wholeDay = { defaultHours: 24, minHours: 24, maxHours: 24 };

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
  const storage = createStorage({
    store,
    parse: (value) => parseSettings(value, wholeDay),
    key: "k",
  });
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

test("test_hol_009_user_holidays_round_trip_under_their_own_key", () => {
  const { store, data } = fakeStore();
  const settings = createStorage({
    store,
    parse: (value) => parseSettings(value, wholeDay),
    key: "settings",
  });
  const holidays = createStorage({ store, parse: parseUserHolidays, key: "holidays" });
  assert.equal(holidays.load(), null);
  const record = {
    version: /** @type {const} */ (1),
    added: [{ countryCode: "IN", date: "2026-11-08", name: "Diwali" }],
    hidden: [{ countryCode: "US", date: "2026-12-25", name: "Christmas Day" }],
  };
  holidays.save(record);
  assert.deepEqual([...data.keys()], ["holidays"]);
  assert.deepEqual(holidays.load(), record);
  assert.equal(settings.load(), null);
});

test("test_set_004_invalid_record_loads_as_null_and_logs_warning", () => {
  for (const bad of ["not json", JSON.stringify({ version: 9 })]) {
    const { store, data } = fakeStore();
    data.set("k", bad);
    /** @type {string[]} */
    const warnings = [];
    const log = { warn: (/** @type {string} */ message) => void warnings.push(message) };
    const storage = createStorage({
      store,
      parse: (value) => parseSettings(value, wholeDay),
      key: "k",
      log,
    });
    assert.equal(storage.load(), null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /"k"/);
  }
});
