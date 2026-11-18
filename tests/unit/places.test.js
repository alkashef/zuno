// @ts-check
/** @module places.test Unit tests for src/domain/places.js (SET-001, SET-008, SET-009, SET-010, SET-013, MAP-001). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addPlace,
  createPlace,
  editPlace,
  isPlace,
  movePlace,
  placeName,
  placeFacts,
  placePin,
  removePlace,
  isUnlistedPlace,
  restorePlace,
} from "../../src/domain/places.js";

test("test_set_001_add_and_remove_places", () => {
  const sa = createPlace("a", "riyadh");
  const gb = createPlace("b", "london");
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

test("test_set_001_new_place_has_its_citys_zone_and_defaults", () => {
  const place = createPlace("a", "london");
  assert.equal(place.cityId, "london");
  assert.equal(place.countryCode, "GB");
  assert.equal(place.zone, "Europe/London");
  assert.equal(place.label, "");
  assert.equal(place.region, "");
  assert.equal(place.hijriVariant, "umalqura");
  assert.equal(place.hijriAdjust, 0);
  assert.ok(isPlace(place));
});

test("test_set_001_invalid_places_are_refused", () => {
  assert.equal(isPlace({ ...createPlace("a", "london"), zone: "Asia/Tokyo" }), false);
  assert.equal(isPlace({ ...createPlace("a", "london"), countryCode: "ZZ" }), false);
  assert.equal(isPlace({ ...createPlace("a", "london"), hijriAdjust: 2 }), false);
  assert.equal(isPlace(null), false);
  assert.deepEqual(addPlace([], { ...createPlace("a", "london"), zone: "Asia/Tokyo" }), []);
});

test("test_set_013_only_listed_cities_make_places", () => {
  assert.throws(() => createPlace("a", "nairobi"), RangeError);
  assert.equal(isPlace({ ...createPlace("a", "london"), cityId: "nairobi" }), false);
});

test("test_set_015_restored_place_gets_its_citys_country_and_zone", () => {
  const { countryCode, zone, ...stored } = createPlace("a", "mumbai");
  assert.deepEqual(restorePlace(stored), { ...stored, countryCode, zone });
  assert.deepEqual(restorePlace({ ...stored, zone: "Europe/London" }), {
    ...stored,
    countryCode,
    zone,
  });
  assert.equal(restorePlace({ ...stored, cityId: "nairobi" }), null);
  assert.equal(restorePlace({ ...stored, label: 3 }), null);
  assert.equal(restorePlace("text"), null);
  assert.equal(isUnlistedPlace({ ...stored, cityId: "nairobi" }), true);
  assert.equal(isUnlistedPlace(stored), false);
  assert.equal(isUnlistedPlace({ ...stored, cityId: 7 }), false);
});

test("test_set_008_move_place_changes_order", () => {
  const places = ["a", "b", "c"].map((id) => createPlace(id, "london"));
  const ids = (/** @type {typeof places} */ list) => list.map((place) => place.id);
  assert.deepEqual(ids(movePlace(places, "b", -1)), ["b", "a", "c"]);
  assert.deepEqual(ids(movePlace(places, "b", 1)), ["a", "c", "b"]);
  assert.deepEqual(ids(movePlace(places, "a", -1)), ["a", "b", "c"]);
  assert.deepEqual(ids(places), ["a", "b", "c"]);
});

test("test_set_009_display_name_overrides_city_name", () => {
  const place = createPlace("a", "london");
  assert.equal(placeName(place, false), "London");
  const [named] = editPlace([place], "a", { label: "Head office" });
  assert.equal(placeName(named, false), "Head office");
});

test("test_set_010_country_names_off_by_default_and_added_when_on", () => {
  const place = createPlace("a", "london");
  assert.equal(placeName(place, false), "London");
  assert.equal(placeName(place, true), "London, United Kingdom");
});

test("test_map_001_place_pin_gives_map_percentages_time_and_date", () => {
  const place = createPlace("a", "riyadh");
  const pin = placePin(place, Date.UTC(2026, 10, 16, 21, 30));
  assert.equal(pin.time, "12:30 AM");
  assert.equal(pin.date, "17-Nov-26");
  assert.ok(pin.left > 50 && pin.left < 70, String(pin.left));
  assert.ok(pin.top > 30 && pin.top < 40, String(pin.top));
});

test("test_map_001_pin_sits_at_the_citys_own_coordinates", () => {
  const instant = Date.UTC(2026, 10, 16, 9, 25);
  const delhi = placePin(createPlace("a", "new-delhi"), instant);
  assert.equal(delhi.left, ((77.21 + 180) / 360) * 100);
  assert.equal(delhi.top, ((90 - 28.61) / 180) * 100);
  const mumbai = placePin(createPlace("b", "mumbai"), instant);
  assert.ok(mumbai.left < delhi.left && mumbai.top > delhi.top);
  assert.equal(mumbai.time, delhi.time);
});

test("test_set_009_place_facts_split_name_city_and_country", () => {
  const riyadh = { ...createPlace("a", "riyadh"), label: "Sam K." };
  assert.deepEqual(placeFacts(riyadh, false), { name: "Sam K.", city: "Riyadh", country: null });
  assert.deepEqual(placeFacts(createPlace("b", "london"), true), {
    name: "London",
    city: null,
    country: "United Kingdom",
  });
});

test("test_set_016_edit_refuses_an_empty_out_of_range_or_repeated_weekend_list", () => {
  const places = [createPlace("a", "riyadh")];
  const chosen = editPlace(places, "a", { weekendDays: [6, 7] });
  assert.deepEqual(chosen[0].weekendDays, [6, 7]);
  for (const weekendDays of [[], [0], [8], [5, 5], [1.5]]) {
    assert.deepEqual(editPlace(chosen, "a", { weekendDays }), chosen);
  }
  assert.equal(editPlace(chosen, "a", { weekendDays: null })[0].weekendDays, null);
});

test("test_set_016_restored_place_without_weekend_days_gets_null", () => {
  const { countryCode, zone, weekendDays, ...stored } = createPlace("a", "riyadh");
  assert.equal(weekendDays, null);
  assert.equal(restorePlace(stored)?.weekendDays, null);
  assert.deepEqual(restorePlace({ ...stored, weekendDays: [6, 7] })?.weekendDays, [6, 7]);
  assert.equal(restorePlace({ ...stored, weekendDays: [] }), null);
  assert.equal(countryCode, "SA");
  assert.equal(zone, "Asia/Riyadh");
});
