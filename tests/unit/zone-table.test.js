// @ts-check
/** @module zone-table.test Unit tests for src/domain/zone-table.js (SET-015, SET-018, MAP-002, DEC-029). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isKnownCountry,
  isKnownZone,
  listCountryCodes,
  listZones,
  zoneRow,
} from "../../src/domain/zone-table.js";

const regionNames = new Intl.DisplayNames("en", { type: "region" });

test("test_set_018_every_zone_has_a_known_country_and_coordinates_in_range", () => {
  const zones = listZones();
  assert.ok(zones.length > 300, String(zones.length));
  const names = zones.map((row) => row.zone);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(names, [...names].sort());
  for (const row of zones) {
    assert.ok(isKnownCountry(row.countryCode), row.zone);
    assert.ok(row.latitude >= -90 && row.latitude <= 90, row.zone);
    assert.ok(row.longitude >= -180 && row.longitude <= 180, row.zone);
  }
  const codes = listCountryCodes();
  assert.ok(codes.length > 200, String(codes.length));
  for (const code of codes) assert.notEqual(regionNames.of(code), code, code);
});

test("test_set_015_a_zone_or_country_outside_the_table_is_not_known", () => {
  assert.equal(isKnownZone("Europe/Lisbon"), true);
  assert.equal(isKnownZone("Mars/Olympus_Mons"), false);
  assert.equal(isKnownZone(""), false);
  assert.equal(isKnownZone(7), false);
  assert.equal(zoneRow("Mars/Olympus_Mons"), null);
  assert.equal(isKnownCountry("KE"), true);
  assert.equal(isKnownCountry("ZZ"), false);
  assert.equal(isKnownCountry(""), false);
  assert.equal(isKnownCountry(null), false);
});

test("test_map_002_zone_row_holds_the_principal_location_of_europe_lisbon", () => {
  assert.deepEqual(zoneRow("Europe/Lisbon"), {
    zone: "Europe/Lisbon",
    countryCode: "PT",
    latitude: 38.72,
    longitude: -9.13,
  });
});
