// @ts-check
/** @module cities.test Unit tests for src/domain/cities.js and data/cities.js (SET-013, NFR-003, DEC-015). */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { cityTable } from "../../data/cities.js";
import {
  cityOf,
  countryName,
  isListedCountry,
  listCities,
  listCountries,
} from "../../src/domain/cities.js";
import { zoneOffset } from "../../src/domain/zones.js";

/** The ISO 3166-1 code of each country or territory named in the spec's section 9. */
const specCountryCodes = Object.freeze({
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Belgium: "BE",
  Brazil: "BR",
  China: "CN",
  "Hong Kong": "HK",
  Colombia: "CO",
  Czechia: "CZ",
  Denmark: "DK",
  Ecuador: "EC",
  Egypt: "EG",
  Finland: "FI",
  France: "FR",
  Germany: "DE",
  India: "IN",
  Indonesia: "ID",
  Ireland: "IE",
  Israel: "IL",
  Italy: "IT",
  Japan: "JP",
  Malaysia: "MY",
  Mexico: "MX",
  Netherlands: "NL",
  Pakistan: "PK",
  Poland: "PL",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  "South Korea": "KR",
  Spain: "ES",
  Sweden: "SE",
  Switzerland: "CH",
  Taiwan: "TW",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
});

/**
 * @returns {{ city: string, country: string, offset: string }[]} The rows of the city list in
 *   section 9 of docs/spec.md, in order.
 */
function specCityRows() {
  const spec = readFileSync(new URL("../../docs/spec.md", import.meta.url), "utf8");
  const section = spec.slice(spec.indexOf("## 9. City list"));
  return section
    .split("\n")
    .filter((line) => /^\| .+ \| [+-]\d\d:\d\d \|$/.test(line))
    .map((line) => {
      const [city, country, offset] = line.slice(2, -2).split(" | ");
      return { city, country, offset };
    });
}

/**
 * @param {string} zone IANA time-zone name.
 * @returns {string} The smaller of the zone's offsets on 1 January and 1 July 2026, as `+hh:mm`.
 */
function standardOffset(zone) {
  const minutes =
    Math.min(zoneOffset(Date.UTC(2026, 0, 1), zone), zoneOffset(Date.UTC(2026, 6, 1), zone)) /
    60000;
  const sign = minutes < 0 ? "-" : "+";
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0");
  return `${sign}${hours}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`;
}

test("test_set_013_city_table_has_the_55_cities_of_the_spec", () => {
  const rows = specCityRows();
  assert.equal(rows.length, 55);
  assert.equal(cityTable.length, 55);
  rows.forEach((row, index) => {
    const city = cityTable[index];
    assert.equal(city.name, row.city);
    const code = specCountryCodes[/** @type {keyof typeof specCountryCodes} */ (row.country)];
    assert.equal(city.countryCode, code, row.city);
    assert.equal(standardOffset(city.zone), row.offset, `${row.city} ${city.zone}`);
    assert.ok(Math.abs(city.latitude) <= 90 && Math.abs(city.longitude) <= 180, row.city);
  });
  const ids = cityTable.map((city) => city.id);
  assert.equal(new Set(ids).size, 55);
  assert.ok(ids.every((id) => /^[a-z]+(-[a-z]+)*$/.test(id)));
});

test("test_set_013_list_cities_in_table_order_with_their_countries", () => {
  const cities = listCities();
  assert.deepEqual(
    cities.map((city) => city.id),
    cityTable.map((city) => city.id),
  );
  assert.deepEqual(
    cities.find((city) => city.id === "mumbai"),
    { id: "mumbai", name: "Mumbai", country: "India" },
  );
  assert.equal(cityOf("new-delhi")?.zone, "Asia/Kolkata");
  assert.equal(cityOf("nairobi"), null);
});

test("test_nfr_003_country_names_are_english", () => {
  assert.equal(countryName("SA"), "Saudi Arabia");
  assert.equal(countryName("GB"), "United Kingdom");
  assert.equal(countryName("TW"), "Taiwan");
  assert.throws(() => countryName("ZZ"), RangeError);
});

test("test_dsp_004_every_country_name_matches_the_city_list", () => {
  const rows = specCityRows();
  assert.equal(rows.length, 55);
  rows.forEach((row, index) => {
    assert.equal(countryName(cityTable[index].countryCode), row.country, row.city);
  });
});

test("test_dsp_004_hong_kong_ex_025", () => {
  assert.equal(countryName("HK"), "Hong Kong");
  assert.deepEqual(
    listCities().find((city) => city.id === "hong-kong"),
    { id: "hong-kong", name: "Hong Kong", country: "Hong Kong" },
  );
});

test("test_hol_006_country_list_has_each_country_of_the_city_table_once_by_name", () => {
  const countries = listCountries();
  assert.equal(countries.length, Object.keys(specCountryCodes).length);
  assert.equal(new Set(countries.map((country) => country.code)).size, countries.length);
  const names = countries.map((country) => country.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, "en")),
  );
  assert.deepEqual(countries[0], { code: "AR", name: "Argentina" });
  assert.ok(
    countries.some((country) => country.code === "HK" && country.name === countryName("HK")),
  );
  assert.equal(isListedCountry("IN"), true);
  assert.equal(isListedCountry("KE"), false);
});
