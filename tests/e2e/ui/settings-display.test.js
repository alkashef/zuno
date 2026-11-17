// @ts-check
/** @module settings-display.test Headless-browser tests of the hours, display and Hijri parts of the settings panel in Chromium (SET-005, SET-006, SET-010, SET-011, HIJ-002, HIJ-003). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { serviceRecord } from "../../unit/holiday-fixtures.js";
import { buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

/** @typedef {import("./page-fixture.js").PageBuild} PageBuild */
/** @typedef {import("./page-fixture.js").Browser} Browser */
/** @typedef {import("./page-fixture.js").Page} Page */

/** @type {PageBuild} */
let built;
/** @type {Browser} */
let browser;

before(async () => {
  built = await buildToScratch();
  browser = await launchBrowser();
});

after(async () => {
  await browser.close();
  await built.remove();
});

/**
 * @param {string[]} countryCodes
 * @returns {import("../../../src/domain/settings.js").Settings} Settings with one place per code.
 */
function savedPlaces(countryCodes) {
  const places = countryCodes.map((code, index) => createPlace(`place-${index + 1}`, code));
  return { ...defaultSettings(540, 1020), places };
}

/**
 * @param {Page} page
 * @returns {Promise<void>} Opens the settings panel from the header.
 */
async function openSettings(page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("dialog").waitFor();
}

/**
 * @param {Page} page
 * @returns {Promise<import("../../../src/domain/settings.js").Settings>} The settings in storage.
 */
function storedSettings(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), config.storageKey);
}

test("ui_set_005_working_hours_default_and_invalid_end_refused", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["US"]) });
  await openSettings(page);
  const start = page.getByLabel("Working hours start");
  const end = page.getByLabel("Working hours end");
  assert.equal(await start.inputValue(), "09:00");
  assert.equal(await end.inputValue(), "17:00");
  await end.fill("08:00");
  assert.equal(await end.getAttribute("aria-invalid"), "true");
  assert.equal((await storedSettings(page)).workEndMinutes, 1020);
  await end.fill("18:30");
  assert.equal(await end.getAttribute("aria-invalid"), "false");
  assert.equal((await storedSettings(page)).workEndMinutes, 1110);
});

test("ui_set_006_region_listed_by_code_and_empty_means_national", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["US"]) });
  await page.route(`${config.holidayServiceBaseUrl}/Holidays/US/**`, (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify([serviceRecord("2026-12-25", "Regional Day", ["Public"], ["US-CA"])]),
    }),
  );
  await page.getByRole("button", { name: "Refresh" }).click();
  await openSettings(page);
  await page.getByRole("button", { name: "Edit Washington, D.C." }).click();
  const region = page.getByLabel("Region");
  assert.deepEqual(await region.locator("option").allTextContents(), [
    "National holidays only",
    "US-CA",
  ]);
  assert.equal(await region.inputValue(), "");
  await region.selectOption("US-CA");
  assert.equal((await storedSettings(page)).places[0].region, "US-CA");
  await region.selectOption("");
  assert.equal((await storedSettings(page)).places[0].region, "");
});

test("ui_set_010_country_names_toggle", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["SA"]) });
  await openSettings(page);
  const toggle = page.getByLabel("Show names of countries");
  assert.equal(await toggle.isChecked(), false);
  await toggle.check();
  assert.deepEqual(await page.locator(".settings-place-name").allTextContents(), [
    "Riyadh, Saudi Arabia",
  ]);
  await toggle.uncheck();
  assert.deepEqual(await page.locator(".settings-place-name").allTextContents(), ["Riyadh"]);
});

test("ui_set_011_hijri_toggle_off_by_default", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["SA"]) });
  await openSettings(page);
  const toggle = page.getByLabel("Show Hijri calendar");
  assert.equal(await toggle.isChecked(), false);
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  assert.equal(await page.getByLabel("Hijri variant").count(), 0);
  await toggle.check();
  assert.equal(await page.getByLabel("Hijri variant").isVisible(), true);
  assert.equal((await storedSettings(page)).showHijri, true);
});

test("ui_hij_002_variant_choice_per_place", async () => {
  const saved = { ...savedPlaces(["SA", "US"]), showHijri: true };
  const { page } = await openPage(browser, built.url, { saved });
  await openSettings(page);
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  const variant = page
    .locator(".settings-place", { hasText: "Riyadh" })
    .getByLabel("Hijri variant");
  assert.equal(await variant.inputValue(), "umalqura");
  await variant.selectOption({ label: "Tabular" });
  const places = (await storedSettings(page)).places;
  assert.deepEqual(
    places.map((place) => place.hijriVariant),
    ["tabular", "umalqura"],
  );
});

test("ui_hij_003_adjustment_range_minus_one_to_plus_one", async () => {
  const saved = { ...savedPlaces(["SA"]), showHijri: true };
  const { page } = await openPage(browser, built.url, { saved });
  await openSettings(page);
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  const adjust = page.getByLabel("Hijri adjustment");
  assert.deepEqual(await adjust.locator("option").allTextContents(), ["-1", "0", "+1"]);
  assert.equal(await adjust.inputValue(), "0");
  await adjust.selectOption("1");
  assert.equal((await storedSettings(page)).places[0].hijriAdjust, 1);
  await adjust.selectOption("-1");
  assert.equal((await storedSettings(page)).places[0].hijriAdjust, -1);
});
