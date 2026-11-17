// @ts-check
/** @module places.test Unit tests for src/domain/places.js (SET-001, SET-008, SET-009, SET-010). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addPlace,
  createPlace,
  editPlace,
  isPlace,
  movePlace,
  placeName,
  removePlace,
} from "../../src/domain/places.js";

test("test_set_001_add_and_remove_places", () => {
  const sa = createPlace("a", "SA");
  const gb = createPlace("b", "GB");
  const added = addPlace(addPlace([], sa), gb);
  assert.deepEqual(
    added.map((place) => place.id),
    ["a", "b"],
  );
  assert.deepEqual(addPlace(added, sa), added);
  assert.deepEqual(
    removePlace(added, "a").map((place) => place.id),
    ["b"],
  );
});

test("test_set_001_new_place_has_capital_zone_and_defaults", () => {
  const place = createPlace("a", "GB");
  assert.equal(place.zone, "Europe/London");
  assert.equal(place.label, "");
  assert.equal(place.region, "");
  assert.equal(place.hijriVariant, "umalqura");
  assert.equal(place.hijriAdjust, 0);
  assert.ok(isPlace(place));
});

test("test_set_001_invalid_places_are_refused", () => {
  assert.equal(isPlace({ ...createPlace("a", "GB"), zone: "Asia/Tokyo" }), false);
  assert.equal(isPlace({ ...createPlace("a", "GB"), countryCode: "ZZ" }), false);
  assert.equal(isPlace({ ...createPlace("a", "GB"), hijriAdjust: 2 }), false);
  assert.equal(isPlace(null), false);
  assert.deepEqual(addPlace([], { ...createPlace("a", "GB"), zone: "Asia/Tokyo" }), []);
});

test("test_set_008_move_place_changes_order", () => {
  const places = ["a", "b", "c"].map((id) => createPlace(id, "GB"));
  const ids = (/** @type {typeof places} */ list) => list.map((place) => place.id);
  assert.deepEqual(ids(movePlace(places, "b", -1)), ["b", "a", "c"]);
  assert.deepEqual(ids(movePlace(places, "b", 1)), ["a", "c", "b"]);
  assert.deepEqual(ids(movePlace(places, "a", -1)), ["a", "b", "c"]);
  assert.deepEqual(ids(places), ["a", "b", "c"]);
});

test("test_set_009_display_name_overrides_city_name", () => {
  const place = createPlace("a", "GB");
  assert.equal(placeName(place, false), "London");
  const [named] = editPlace([place], "a", { label: "Head office" });
  assert.equal(placeName(named, false), "Head office");
});

test("test_set_010_country_names_off_by_default_and_added_when_on", () => {
  const place = createPlace("a", "GB");
  assert.equal(placeName(place, false), "London");
  assert.equal(placeName(place, true), "London, United Kingdom");
});

test("test_set_003_edit_zone_must_belong_to_country", () => {
  const place = createPlace("a", "GB");
  assert.deepEqual(editPlace([place], "a", { zone: "Asia/Tokyo" }), [place]);
  assert.deepEqual(editPlace([place], "a", { region: "GB-SCT" })[0].region, "GB-SCT");
});
