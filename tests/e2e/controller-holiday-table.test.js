// @ts-check
/** @module controller-holiday-table.test The built-in holiday table through src/controller.js with a fake api that records its requests (HOL-013, HOL-001, HOL-008, EX-022, EX-023). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createController } from "../../src/controller.js";
import { isTableCountry, tableHolidays } from "../../src/domain/holiday-table.js";
import { createPlace } from "../../src/domain/places.js";
import { defaultSettings } from "../../src/domain/settings.js";

/**
 * @param {string[]} cityIds
 * @param {Date} start The fake clock's instant.
 * @returns {{ controller: ReturnType<typeof createController>, requests: string[] }}
 */
function setup(cityIds, start) {
  const places = cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId));
  const settings = { ...defaultSettings(540, 1020), places };
  /** @type {string[]} */
  const requests = [];
  const controller = createController({
    api: {
      getHolidays: async (countryCode, year) => {
        requests.push(`${countryCode}-${year}`);
        return { status: "loaded", holidays: [] };
      },
    },
    holidayTable: { isTableCountry, tableHolidays },
    storage: { load: () => settings, save: () => {} },
    holidayStorage: { load: () => null, save: () => {} },
    files: { saveText: () => {}, readJson: async () => ({ status: "unreadable" }) },
    holidaysFileName: "zuno-holidays.json",
    clock: { now: () => start.getTime() },
    defaultHours: { start: 540, end: 1020 },
    pickerLimits: { defaultHours: 24, minHours: 24, maxHours: 48 },
    mapLimits: { minHeight: 240, maxHeight: 900 },
    defaultCityIds: [],
  });
  return { controller, requests };
}

/**
 * @param {ReturnType<typeof createController>} controller
 * @returns {string[]} The holidays of the shown month's grid, as `date name`.
 */
function shownHolidays(controller) {
  return controller
    .getState()
    .grid.flat()
    .filter((day) => day.holidayName !== null)
    .map((day) => `${day.date} ${day.holidayName}`);
}

test("test_hol_013_table_country_shows_table_holidays_ex_022", async () => {
  const riyadh = setup(["riyadh"], new Date("2026-09-10T09:00:00Z"));
  await riyadh.controller.dispatch({ type: "open" });
  assert.ok(shownHolidays(riyadh.controller).includes("2026-09-23 National Day"));
  const delhi = setup(["new-delhi"], new Date("2026-01-10T09:00:00Z"));
  await delhi.controller.dispatch({ type: "open" });
  assert.ok(shownHolidays(delhi.controller).includes("2026-01-26 Republic Day"));
  assert.deepEqual(delhi.controller.getState().notices.countries, []);
});

test("test_hol_001_no_service_request_for_a_table_country", async () => {
  const { controller, requests } = setup(
    ["riyadh", "new-delhi", "london"],
    new Date("2026-09-10T09:00:00Z"),
  );
  await controller.dispatch({ type: "open" });
  await controller.dispatch({ type: "showMonth", offset: 1 });
  await controller.dispatch({ type: "refresh" });
  assert.ok(requests.length > 0);
  assert.ok(
    requests.every((request) => request.startsWith("GB-")),
    requests.join(),
  );
});

test("test_hol_008_hide_a_table_holiday", async () => {
  const { controller } = setup(["riyadh"], new Date("2026-09-10T09:00:00Z"));
  await controller.dispatch({ type: "open" });
  const nationalDay = { countryCode: "SA", date: "2026-09-23", name: "National Day" };
  await controller.dispatch({ type: "hideHoliday", ...nationalDay });
  assert.ok(!shownHolidays(controller).includes("2026-09-23 National Day"));
  await controller.dispatch({ type: "showHoliday", ...nationalDay });
  assert.ok(shownHolidays(controller).includes("2026-09-23 National Day"));
});

test("test_hol_013_year_after_the_table_is_unavailable_ex_023", async () => {
  const { controller, requests } = setup(["riyadh"], new Date("2029-01-10T09:00:00Z"));
  await controller.dispatch({ type: "open" });
  assert.deepEqual(shownHolidays(controller), []);
  assert.deepEqual(controller.getState().notices.countries, ["SA"]);
  assert.deepEqual(requests, []);
});

test("test_hol_014_riyadh_2029_before_and_after_adding_ex_023", async () => {
  const { controller } = setup(["riyadh"], new Date("2029-01-10T09:00:00Z"));
  await controller.dispatch({ type: "open" });
  assert.deepEqual(controller.getState().notices.countries, ["SA"]);
  await controller.dispatch({
    type: "addHoliday",
    countryCode: "SA",
    date: "2029-02-22",
    name: "Founding Day",
  });
  assert.deepEqual(controller.getState().notices.countries, []);
});
