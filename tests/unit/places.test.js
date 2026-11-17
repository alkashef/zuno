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
  placeClock,
  placeName,
  placePin,
  removePlace,
  zonesOf,
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

test("test_set_003_zones_of_lists_capital_first_then_other_zones", () => {
  const zones = zonesOf("US").map((city) => city.zone);
  assert.equal(zones[0], "America/New_York");
  assert.ok(zones.length > 1);
  assert.deepEqual(
    zonesOf("SA").map((city) => city.zone),
    ["Asia/Riyadh"],
  );
});

test("test_set_002_place_clock_shows_local_time_of_capital_zone", () => {
  const place = createPlace("a", "SA");
  assert.equal(placeClock(place, Date.UTC(2026, 10, 16, 9, 25)), "12:25 PM");
});

test("test_map_001_place_pin_gives_map_percentages_time_and_date", () => {
  const place = createPlace("a", "SA");
  const pin = placePin(place, Date.UTC(2026, 10, 16, 21, 30));
  assert.equal(pin.time, "12:30 AM");
  assert.equal(pin.date, "17-Nov-26");
  assert.ok(pin.left > 50 && pin.left < 70, String(pin.left));
  assert.ok(pin.top > 30 && pin.top < 40, String(pin.top));
});

test("test_map_001_place_pin_uses_the_chosen_zone_coordinates", () => {
  const capital = createPlace("a", "US");
  const west = { ...capital, zone: "America/Los_Angeles" };
  const instant = Date.UTC(2026, 10, 16, 9, 25);
  assert.ok(placePin(west, instant).left < placePin(capital, instant).left);
});
