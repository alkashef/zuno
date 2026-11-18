// @ts-check
/** @module settings-places.test Headless-browser tests of the places part of the settings panel in Chromium (SET-001 to SET-004, SET-008, SET-009). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
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
 * @param {string} country English country name.
 * @returns {Promise<void>} Adds a place through the panel's add form.
 */
async function addCountry(page, country) {
  await page
    .getByRole("combobox", { name: "Country", exact: true })
    .selectOption({ label: country });
  await page.getByRole("button", { name: "Add place" }).click();
}

/**
 * @param {Page} page
 * @returns {Promise<string[]>} The names of the places in the panel, in order.
 */
function listedNames(page) {
  return page.locator(".settings-place-name").allTextContents();
}

test("ui_set_001_add_and_remove_a_place", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["US"]) });
  await openSettings(page);
  await addCountry(page, "Saudi Arabia");
  assert.deepEqual(await listedNames(page), ["Washington, D.C.", "Riyadh"]);
  await page.getByRole("button", { name: "Remove Washington, D.C." }).click();
  assert.deepEqual(await listedNames(page), ["Riyadh"]);
});

test("ui_set_001_escape_closes_panel_and_returns_focus_to_its_button", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["US"]) });
  await openSettings(page);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  const opener = page.getByRole("button", { name: "Settings", exact: true });
  assert.equal(
    await opener.evaluate((button) => button === button.ownerDocument.activeElement),
    true,
  );
});

test("ui_set_002_new_place_shows_capital_zone_offset", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["US"]) });
  await openSettings(page);
  await addCountry(page, "Saudi Arabia");
  const riyadh = page.locator(".settings-place", { hasText: "Riyadh" });
  assert.equal(await riyadh.locator('[data-role="facts"]').textContent(), "Saudi Arabia · UTC+3");
});

test("ui_set_003_choose_another_city_zone", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["US"]) });
  await openSettings(page);
  await page.getByRole("button", { name: "Edit Washington, D.C." }).click();
  const zone = page.getByRole("combobox", { name: "Time zone", exact: true });
  const options = await zone.locator("option").allTextContents();
  assert.equal(options[0], "Washington, D.C., capital (UTC−5)");
  assert.match(
    (await page.locator('[data-role="zone-hint"]').textContent()) ?? "",
    /^United States has more than one time zone\./,
  );
  await zone.selectOption({ label: "Chicago (UTC−6)" });
  assert.equal(await page.locator('[data-role="facts"]').textContent(), "United States · UTC−6");
  assert.deepEqual(await listedNames(page), ["Chicago"]);
});

test("ui_set_004_places_survive_reload", async () => {
  const { page } = await openPage(browser, built.url);
  await page.getByRole("button", { name: "Add a place" }).click();
  await addCountry(page, "Saudi Arabia");
  await page.reload();
  assert.equal(await page.getByRole("button", { name: "Add a place" }).count(), 0);
  await openSettings(page);
  assert.deepEqual(await listedNames(page), ["Riyadh"]);
});

test("ui_set_008_move_arrows_reorder_places", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["US", "SA"]) });
  await openSettings(page);
  await page.getByRole("button", { name: "Move Riyadh up" }).click();
  assert.deepEqual(await listedNames(page), ["Riyadh", "Washington, D.C."]);
  await page.getByRole("button", { name: "Move Riyadh down" }).click();
  assert.deepEqual(await listedNames(page), ["Washington, D.C.", "Riyadh"]);
});

test("ui_set_009_display_name_shown_instead_of_city", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["SA"]) });
  await openSettings(page);
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  assert.equal(await page.getByRole("button", { name: "Collapse Riyadh" }).count(), 1);
  await page.getByLabel("Display name").fill("Team HQ");
  await page.getByLabel("Display name").press("Tab");
  assert.deepEqual(await listedNames(page), ["Team HQ"]);
  await page.getByLabel("Display name").fill("");
  await page.getByLabel("Display name").press("Tab");
  assert.deepEqual(await listedNames(page), ["Riyadh"]);
});
