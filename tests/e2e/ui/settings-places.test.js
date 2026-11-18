// @ts-check
/** @module settings-places.test Headless-browser tests of the places part of the settings panel in Chromium (SET-001, SET-002, SET-004, SET-008, SET-009, SET-013). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
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
 * @param {string[]} cityIds
 * @returns {import("../../../src/domain/settings.js").Settings} Settings with one place per city id.
 */
function savedPlaces(cityIds) {
  const places = cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId));
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
 * @param {string} city The city and its country as the add list shows them.
 * @returns {Promise<void>} Adds a place through the panel's add form.
 */
async function addCity(page, city) {
  await page.getByRole("combobox", { name: "City", exact: true }).selectOption({ label: city });
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
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["washington-dc"]) });
  await openSettings(page);
  await addCity(page, "Riyadh, Saudi Arabia");
  assert.deepEqual(await listedNames(page), ["Washington, D.C.", "Riyadh"]);
  await page.getByRole("button", { name: "Remove Washington, D.C." }).click();
  assert.deepEqual(await listedNames(page), ["Riyadh"]);
});

test("ui_set_007_removing_all_seven_default_places_leaves_the_empty_page_after_reload", async () => {
  const { page } = await openPage(browser, built.url);
  await openSettings(page);
  const names = ["Tokyo", "Cairo", "New Delhi", "Madrid", "Bogotá", "Riyadh", "Islamabad"];
  for (const name of names) {
    await page.getByRole("button", { name: `Remove ${name}`, exact: true }).click();
  }
  await page.reload();
  assert.equal(await page.getByRole("button", { name: "Add a place" }).isVisible(), true);
  assert.equal(await page.getByRole("heading", { name: "No places yet" }).isVisible(), true);
});

test("ui_set_001_escape_closes_panel_and_returns_focus_to_its_button", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["washington-dc"]) });
  await openSettings(page);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  const opener = page.getByRole("button", { name: "Settings", exact: true });
  assert.equal(
    await opener.evaluate((button) => button === button.ownerDocument.activeElement),
    true,
  );
});

test("ui_set_002_new_place_shows_its_country_and_offset", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["washington-dc"]) });
  await openSettings(page);
  await addCity(page, "Riyadh, Saudi Arabia");
  const riyadh = page.locator(".settings-place", { hasText: "Riyadh" });
  assert.equal(await riyadh.locator('[data-role="facts"]').textContent(), "Saudi Arabia · UTC+3");
});

test("test_set_013_add_a_place_lists_the_55_cities_with_their_countries", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const options = page.getByRole("combobox", { name: "City", exact: true }).locator("option");
  const labels = await options.allTextContents();
  assert.equal(labels.length, 56);
  assert.equal(labels[0], "Choose a city");
  assert.equal(labels[1], "Buenos Aires, Argentina");
  assert.ok(labels.includes("Mumbai, India"));
  assert.ok(labels.includes("São Paulo, Brazil"));
  assert.ok(!labels.some((label) => label.startsWith("Nairobi")));
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  assert.equal(await page.getByRole("combobox", { name: "Time zone" }).count(), 0);
  await addCity(page, "Mumbai, India");
  assert.deepEqual(await listedNames(page), ["Riyadh", "Mumbai"]);
  const mumbai = page.locator(".settings-place", { hasText: "Mumbai" });
  assert.equal(await mumbai.locator('[data-role="facts"]').textContent(), "India · UTC+5:30");
});

test("ui_set_004_places_survive_reload", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces([]) });
  await page.getByRole("button", { name: "Add a place" }).click();
  await addCity(page, "Riyadh, Saudi Arabia");
  await page.reload();
  assert.equal(await page.getByRole("button", { name: "Add a place" }).count(), 0);
  await openSettings(page);
  assert.deepEqual(await listedNames(page), ["Riyadh"]);
});

test("ui_set_008_move_arrows_reorder_places", async () => {
  const { page } = await openPage(browser, built.url, {
    saved: savedPlaces(["washington-dc", "riyadh"]),
  });
  await openSettings(page);
  await page.getByRole("button", { name: "Move Riyadh up" }).click();
  assert.deepEqual(await listedNames(page), ["Riyadh", "Washington, D.C."]);
  await page.getByRole("button", { name: "Move Riyadh down" }).click();
  assert.deepEqual(await listedNames(page), ["Washington, D.C.", "Riyadh"]);
});

test("ui_set_009_display_name_shown_instead_of_city", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
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

test("test_set_016_editor_shows_seven_day_boxes_with_the_default_ticked", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  const group = page.getByRole("group", { name: "Weekend days" });
  const labels = await group.locator("label").allTextContents();
  assert.deepEqual(
    labels.map((text) => text.trim()),
    ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  );
  const ticked = async () =>
    group
      .locator("input:checked")
      .evaluateAll((boxes) =>
        boxes.map((box) => /** @type {HTMLInputElement} */ (box).getAttribute("aria-label")),
      );
  assert.deepEqual(await ticked(), ["Friday", "Saturday"]);
  const hint = "The default for Saudi Arabia is Friday and Saturday.";
  assert.equal(await page.getByText(hint).count(), 1);
  await group.getByRole("checkbox", { name: "Sunday" }).check();
  assert.deepEqual(await ticked(), ["Sunday", "Friday", "Saturday"]);
  const key = config.storageKey;
  const saved = () => page.evaluate((name) => localStorage.getItem(name) ?? "", key);
  assert.deepEqual(JSON.parse(await saved()).places[0].weekendDays, [5, 6, 7]);
  await group.getByRole("checkbox", { name: "Friday" }).uncheck();
  await group.getByRole("checkbox", { name: "Saturday" }).uncheck();
  await group.getByRole("checkbox", { name: "Sunday" }).click();
  assert.deepEqual(await ticked(), ["Sunday"]);
  assert.deepEqual(JSON.parse(await saved()).places[0].weekendDays, [7]);
});
