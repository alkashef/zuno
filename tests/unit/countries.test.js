// @ts-check
/** @module countries.test Unit tests for src/domain/countries.js and data/countries.js (SET-002, SET-003, NFR-003, DEC-004). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { capitalZone, countryName, listCountries, otherZones } from "../../src/domain/countries.js";

test("test_set_002_adding_country_uses_capital_zone", () => {
  assert.equal(capitalZone("SA").zone, "Asia/Riyadh");
  assert.equal(capitalZone("SA").label, "Riyadh");
  assert.equal(capitalZone("JP").zone, "Asia/Tokyo");
  assert.equal(capitalZone("GB").zone, "Europe/London");
  assert.equal(capitalZone("US").zone, "America/New_York");
  assert.equal(capitalZone("US").label, "Washington, D.C.");
  assert.equal(capitalZone("AU").zone, "Australia/Sydney");
  assert.equal(capitalZone("BR").zone, "America/Sao_Paulo");
  assert.throws(() => capitalZone("ZZ"), RangeError);
});

test("test_set_003_multi_zone_country_lists_other_city_zones", () => {
  const us = otherZones("US").map((entry) => entry.zone);
  assert.ok(us.includes("America/Los_Angeles"));
  assert.ok(us.includes("America/Chicago"));
  assert.ok(!us.includes("America/New_York"));
  assert.equal(
    otherZones("US").find((e) => e.zone === "America/Los_Angeles")?.label,
    "Los Angeles",
  );
  assert.ok(otherZones("BR").some((entry) => entry.zone === "America/Manaus"));
  assert.deepEqual(otherZones("SA"), []);
  assert.throws(() => otherZones("ZZ"), RangeError);
});

test("test_dec_004_every_zone_valid_and_every_country_has_capital", () => {
  const countries = listCountries();
  assert.ok(countries.length > 230);
  const seen = new Set();
  for (const { code } of countries) {
    assert.match(code, /^[A-Z]{2}$/);
    assert.ok(!seen.has(code), `duplicate ${code}`);
    seen.add(code);
    const capital = capitalZone(code);
    assert.ok(capital.label.length > 0, `${code} has no capital label`);
    for (const entry of [capital, ...otherZones(code)]) {
      assert.doesNotThrow(
        () => new Intl.DateTimeFormat("en-US", { timeZone: entry.zone }),
        `${code} ${entry.zone}`,
      );
      assert.ok(Math.abs(entry.latitude) <= 90 && Math.abs(entry.longitude) <= 180);
    }
    assert.ok(!otherZones(code).some((entry) => entry.zone === capital.zone), `${code} repeats`);
  }
});

test("test_nfr_003_country_names_are_english_and_sorted", () => {
  assert.equal(countryName("SA"), "Saudi Arabia");
  assert.equal(countryName("GB"), "United Kingdom");
  const names = listCountries().map((country) => country.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, "en")),
  );
  assert.ok(
    names.every((name) => /^[\x20-\x7eÀ-ɏ’]+$/.test(name)),
    "non-English name",
  );
  assert.throws(() => countryName("ZZ"), RangeError);
});
