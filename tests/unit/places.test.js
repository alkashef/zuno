// @ts-check
/** @module places.test Unit tests for src/domain/places.js (SET-001, SET-008, PIN-003, PIN-004, SET-009, SET-010, SET-013, SET-015, SET-016, SET-018, MAP-001, MAP-002, HOL-006). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addPlace,
  createCustomPlace,
  createPlace,
  editPlace,
  isPlace,
  movePlace,
  moveToFirst,
  placeName,
  placeFacts,
  holidayCountries,
  placePin,
  removePlace,
  isUnusablePlace,
  restorePlace,
  withoutImport,
} from "../../src/domain/places.js";
import { listCountries } from "../../src/domain/cities.js";
import { placeWeekendDays } from "../../src/domain/weekends.js";
import { zoneRow } from "../../src/domain/zone-table.js";

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
  assert.equal(isUnusablePlace({ ...stored, cityId: "nairobi" }), true);
  assert.equal(isUnusablePlace(stored), false);
  assert.equal(isUnusablePlace({ ...stored, cityId: 7 }), false);
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

test("test_set_017_weekend_equal_to_the_countrys_stores_no_choice_ex_024", () => {
  const places = [createPlace("a", "london")];
  const own = editPlace(places, "a", { weekendDays: [5, 6] });
  assert.deepEqual(own[0].weekendDays, [5, 6]);
  const back = editPlace(own, "a", { weekendDays: [7, 6] });
  assert.equal(back[0].weekendDays, null);
});

test("test_set_017_edit_place_back_to_the_default_is_saved", () => {
  const places = [createPlace("a", "london")];
  const edited = editPlace(places, "a", { weekendDays: [6, 7], label: "Home" });
  assert.equal(edited[0].weekendDays, null);
  assert.equal(edited[0].label, "Home");
});

const sara = { name: "Sara", zone: "Europe/Lisbon", countryCode: "PT" };

test("test_set_018_custom_place_from_name_zone_and_country_ex_027", () => {
  const place = createCustomPlace("place-1", { ...sara, name: "  Sara " });
  assert.deepEqual(place, {
    id: "place-1",
    cityId: null,
    custom: sara,
    countryCode: "PT",
    zone: "Europe/Lisbon",
    label: "",
    region: "",
    weekendDays: null,
    hijriVariant: "umalqura",
    hijriAdjust: 0,
    vacations: [],
  });
  assert.ok(isPlace(place));
  assert.equal(placeName(place, false), "Sara");
  assert.equal(placeName(place, true), "Sara, Portugal");
  assert.deepEqual(placeFacts({ ...place, label: "S. K." }, true), {
    name: "S. K.",
    city: "Sara",
    country: "Portugal",
  });
  assert.equal(createPlace("a", "london").custom, null);
});

test("test_set_018_custom_place_with_an_empty_name_is_refused", () => {
  assert.throws(() => createCustomPlace("a", { ...sara, name: "   " }), RangeError);
  assert.throws(() => createCustomPlace("a", { ...sara, zone: "Mars/Olympus_Mons" }), RangeError);
  assert.throws(() => createCustomPlace("a", { ...sara, countryCode: "ZZ" }), RangeError);
  const place = createCustomPlace("a", sara);
  assert.equal(isPlace({ ...place, zone: "Asia/Tokyo" }), false);
  assert.equal(isPlace({ ...place, cityId: "london" }), false);
  assert.equal(isPlace({ ...place, custom: { ...sara, name: "" } }), false);
});

test("test_set_015_a_stored_custom_place_with_an_unknown_zone_is_dropped_ex_013", () => {
  const { countryCode, zone, ...stored } = createCustomPlace("a", sara);
  const bad = { ...stored, custom: { ...sara, zone: "Mars/Olympus_Mons" } };
  assert.equal(isUnusablePlace(bad), true);
  assert.equal(restorePlace(bad), null);
  assert.equal(isUnusablePlace({ ...stored, custom: { ...sara, countryCode: "ZZ" } }), true);
  assert.equal(isUnusablePlace({ ...stored, custom: { ...sara, name: " " } }), true);
  assert.deepEqual([countryCode, zone], ["PT", "Europe/Lisbon"]);
});

test("test_set_015_a_valid_stored_custom_place_is_kept_ex_013", () => {
  const place = createCustomPlace("a", sara);
  const { countryCode, zone, ...stored } = place;
  assert.deepEqual([countryCode, zone], [place.countryCode, place.zone]);
  assert.equal(isUnusablePlace(stored), false);
  assert.deepEqual(restorePlace(stored), place);
  assert.deepEqual(restorePlace({ ...stored, countryCode: "ES", zone: "Europe/Madrid" }), place);
  const { custom, ...olderCity } = createPlace("b", "london");
  assert.equal(custom, null);
  assert.deepEqual(restorePlace(olderCity), createPlace("b", "london"));
});

test("test_map_002_custom_place_pin_is_at_the_zones_reference_city", () => {
  const instant = Date.UTC(2026, 6, 1, 12);
  const pin = placePin(createCustomPlace("a", sara), instant);
  const lisbon = zoneRow("Europe/Lisbon");
  assert.ok(lisbon);
  assert.equal(pin.left, ((lisbon.longitude + 180) / 360) * 100);
  assert.equal(pin.top, ((90 - lisbon.latitude) / 180) * 100);
  assert.equal(pin.time, "1:00 PM");
  assert.equal(pin.date, "01-Jul-26");
});

test("test_set_016_custom_place_follows_the_weekend_of_its_country", () => {
  assert.deepEqual(placeWeekendDays(createCustomPlace("a", sara)), [6, 7]);
  const riyadh = createCustomPlace("b", { name: "Omar", zone: "Asia/Riyadh", countryCode: "SA" });
  assert.deepEqual(placeWeekendDays(riyadh), [5, 6]);
  const [edited] = editPlace([riyadh], "b", { weekendDays: [6, 7] });
  assert.deepEqual(edited.weekendDays, [6, 7]);
  assert.deepEqual(edited.custom, riyadh.custom);
});

test("test_hol_006_holiday_countries_include_the_country_of_a_custom_place", () => {
  const kenya = createCustomPlace("a", {
    name: "Amani",
    zone: "Africa/Nairobi",
    countryCode: "KE",
  });
  const countries = holidayCountries([createPlace("b", "london"), kenya]);
  assert.equal(countries.length, listCountries().length + 1);
  assert.ok(countries.some((country) => country.code === "KE" && country.name === "Kenya"));
  const names = countries.map((country) => country.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, "en")),
  );
  assert.deepEqual(holidayCountries([createPlace("c", "madrid")]), listCountries());
});

test("test_vac_006_vacations_are_saved_with_the_place_and_read_back", () => {
  const winter = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };
  const place = createPlace("a", "london");
  assert.deepEqual(place.vacations, []);
  const [withVacation] = editPlace([place], "a", { vacations: [winter] });
  assert.deepEqual(withVacation.vacations, [winter]);
  assert.deepEqual(restorePlace(JSON.parse(JSON.stringify(withVacation))), withVacation);
  const { vacations, ...oldRecord } = place;
  assert.deepEqual(vacations, []);
  assert.deepEqual(restorePlace(oldRecord)?.vacations, []);
  assert.deepEqual(removePlace([withVacation], "a"), []);
});

test("test_vac_006_an_invalid_vacation_is_dropped_and_its_place_stays", () => {
  const winter = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };
  const reversed = { start: "2026-12-31", end: "2026-12-21", label: "" };
  const stored = { ...createPlace("a", "london"), vacations: [reversed, winter, "text"] };
  assert.deepEqual(restorePlace(stored)?.vacations, [winter]);
  assert.deepEqual(restorePlace({ ...stored, vacations: "text" })?.vacations, []);
  const [edited] = editPlace([createPlace("a", "london")], "a", { vacations: [reversed] });
  assert.deepEqual(edited.vacations, []);
  assert.equal(isPlace({ ...createPlace("a", "london"), vacations: [reversed] }), false);
});

test("test_hol_022_without_import_drops_the_vacations_only_that_import_listed", () => {
  const day = { start: "2026-12-01", end: "2026-12-02" };
  const own = { ...day, label: "Own" };
  const onlyOne = { ...day, label: "One", sources: ["import-1"] };
  const shared = { ...day, label: "Shared", sources: ["import-1", "import-2"] };
  const sara = createCustomPlace("place-1", {
    name: "Sara",
    zone: "Europe/Lisbon",
    countryCode: "PT",
  });
  const london = createPlace("place-2", "london");
  const places = [{ ...sara, vacations: [own, onlyOne, shared] }, london];
  const after = withoutImport(places, "import-1");
  assert.deepEqual(after[0].vacations, [own, { ...shared, sources: ["import-2"] }]);
  assert.equal(after[1], london);
  assert.equal(withoutImport(after, "import-1")[0], after[0]);
  assert.deepEqual(places[0].vacations, [own, onlyOne, shared]);
});

/** @returns {ReturnType<typeof createPlace>[]} Four places a to d. */
function fourPlaces() {
  return ["a", "b", "c", "d"].map((id) => createPlace(id, "london"));
}

test("test_pin_003_move_to_first_puts_a_middle_place_first_and_keeps_the_order_of_the_others", () => {
  const places = fourPlaces();
  const moved = moveToFirst(places, "c");
  assert.deepEqual(
    moved?.map((place) => place.id),
    ["c", "a", "b", "d"],
  );
  assert.deepEqual(
    places.map((place) => place.id),
    ["a", "b", "c", "d"],
  );
});

test("test_pin_003_move_to_first_puts_the_last_place_first", () => {
  assert.deepEqual(
    moveToFirst(fourPlaces(), "d")?.map((place) => place.id),
    ["d", "a", "b", "c"],
  );
});

test("test_pin_004_move_to_first_of_the_first_place_gives_null", () => {
  assert.equal(moveToFirst(fourPlaces(), "a"), null);
});

test("test_pin_003_move_to_first_of_an_unknown_id_gives_null", () => {
  assert.equal(moveToFirst(fourPlaces(), "zz"), null);
});
