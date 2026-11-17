// @ts-check
/** @module settings.test Unit tests for src/domain/settings.js (SET-005, SET-007, SET-010, SET-011). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "../../src/config.js";
import { createPlace } from "../../src/domain/places.js";
import { defaultSettings, parseSettings, withWorkingHours } from "../../src/domain/settings.js";

const fresh = () => defaultSettings(config.defaultWorkStartMinutes, config.defaultWorkEndMinutes);

test("test_set_005_default_hours_9am_to_5pm_and_start_before_end", () => {
  const settings = fresh();
  assert.equal(settings.workStartMinutes, 9 * 60);
  assert.equal(settings.workEndMinutes, 17 * 60);
  assert.equal(withWorkingHours(settings, 600, 600), null);
  assert.equal(withWorkingHours(settings, 700, 600), null);
  assert.equal(withWorkingHours(settings, 600, 1500), null);
  assert.equal(withWorkingHours(settings, 480, 960)?.workEndMinutes, 960);
});

test("test_set_007_no_saved_places_means_empty_state", () => {
  assert.deepEqual(fresh().places, []);
});

test("test_set_010_country_names_off_by_default", () => {
  assert.equal(fresh().showCountry, false);
});

test("test_set_011_hijri_off_by_default", () => {
  assert.equal(fresh().showHijri, false);
});

test("test_set_004_parse_accepts_valid_and_refuses_invalid", () => {
  const valid = { ...fresh(), places: [createPlace("a", "SA")] };
  assert.deepEqual(parseSettings(valid), valid);
  assert.equal(parseSettings({ ...valid, version: 2 }), null);
  assert.equal(parseSettings({ ...valid, showHijri: "yes" }), null);
  assert.equal(parseSettings({ ...valid, places: [valid.places[0], valid.places[0]] }), null);
  assert.equal(parseSettings({ ...valid, places: [{ id: "x" }] }), null);
  assert.equal(parseSettings("text"), null);
});
