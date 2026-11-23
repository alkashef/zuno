// @ts-check
/** @module make-zone-table.test Unit tests for scripts/make-zone-table.mjs (SET-018, DEC-029). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { countryCodesOf, parseCoordinates, zoneRows } from "../../scripts/make-zone-table.mjs";

const zoneTab = [
  "# tzdb timezone descriptions (deprecated version)",
  "#country-",
  "#code\tcoordinates\tTZ\tcomments",
  "US\t+404251-0740023\tAmerica/New_York\tEastern (most areas)",
  "PT\t+3843-00908\tEurope/Lisbon\tPortugal (mainland)",
  "AU\t-3352+15113\tAustralia/Sydney\tNew South Wales (most areas)",
  "",
].join("\n");

test("test_set_018_zone_tab_rows_become_zone_rows_with_degrees", () => {
  assert.deepEqual(parseCoordinates("+3843-00908"), { latitude: 38.72, longitude: -9.13 });
  assert.deepEqual(parseCoordinates("+404251-0740023"), { latitude: 40.71, longitude: -74.01 });
  assert.deepEqual(parseCoordinates("-3352+15113"), { latitude: -33.87, longitude: 151.22 });
  assert.deepEqual(zoneRows(zoneTab, []), [
    { zone: "America/New_York", countryCode: "US", latitude: 40.71, longitude: -74.01 },
    { zone: "Australia/Sydney", countryCode: "AU", latitude: -33.87, longitude: 151.22 },
    { zone: "Europe/Lisbon", countryCode: "PT", latitude: 38.72, longitude: -9.13 },
  ]);
  assert.deepEqual(
    zoneRows(zoneTab, ["Australia/Sydney"]).map((row) => row.zone),
    ["America/New_York", "Europe/Lisbon"],
  );
  const isoTab = "# ISO 3166 alpha-2 country codes\n#code\tname\nPT\tPortugal\nAD\tAndorra\n";
  assert.deepEqual(countryCodesOf(isoTab), ["AD", "PT"]);
});
