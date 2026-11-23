// @ts-check
/** @module settings-places.test Headless-browser tests of the places part of the settings panel in Chromium (SET-001, SET-002, SET-004, SET-008, SET-009, SET-013, SET-018). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { listZones } from "../../../src/domain/zone-table.js";
import { browserNames, buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

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
 * @returns {Promise<void>} Opens the settings panel from the header and selects the Places tab,
 *   which holds the add form and the list (SET-019).
 */
async function openSettings(page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("tab", { name: "Places", exact: true }).click();
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

test("ui_set_013_add_a_place_or_person_lists_the_55_cities_and_offers_a_custom_place_ex_012", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  await page.getByRole("heading", { name: "Add a place or person" }).waitFor();
  const options = page.getByRole("combobox", { name: "City", exact: true }).locator("option");
  const labels = await options.allTextContents();
  assert.equal(labels.length, 56);
  assert.equal(labels[0], "Choose a city");
  assert.equal(labels[1], "Buenos Aires, Argentina");
  assert.ok(labels.includes("Mumbai, India"));
  assert.ok(labels.includes("São Paulo, Brazil"));
  assert.ok(!labels.some((label) => label.startsWith("Nairobi")));
  const fromList = page.getByRole("button", { name: "A city from the list" });
  const custom = page.getByRole("button", { name: "A person or another city" });
  assert.equal(await fromList.getAttribute("aria-pressed"), "true");
  assert.equal(await custom.getAttribute("aria-pressed"), "false");
  assert.equal(await page.getByRole("combobox", { name: "Time zone" }).count(), 0);
  await custom.click();
  assert.equal(await custom.getAttribute("aria-pressed"), "true");
  assert.equal(await page.getByRole("combobox", { name: "City", exact: true }).count(), 0);
  await page.getByRole("textbox", { name: "Name" }).waitFor();
  await page.getByRole("combobox", { name: "Time zone" }).waitFor();
  const countries = page.getByRole("combobox", { name: "Country or territory" });
  assert.ok(
    (await countries.locator("option").allTextContents()).includes("Kenya"),
    "every country is offered",
  );
  await fromList.click();
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  assert.equal(await page.getByRole("combobox", { name: "Time zone" }).count(), 0);
  await addCity(page, "Mumbai, India");
  assert.deepEqual(await listedNames(page), ["Riyadh", "Mumbai"]);
  const mumbai = page.locator(".settings-place", { hasText: "Mumbai" });
  assert.equal(await mumbai.locator('[data-role="facts"]').textContent(), "India · UTC+5:30");
});

/**
 * @param {Page} page
 * @returns {Promise<void>} Shows the form of a custom place.
 */
async function openCustomForm(page) {
  await page.getByRole("button", { name: "A person or another city" }).click();
}

/**
 * @param {Page} page
 * @param {{ name: string, zone: string, country?: string }} entry
 * @returns {Promise<void>} Fills the form of a custom place and presses "Add place". The country is
 *   left to the preset when not given.
 */
async function addCustom(page, { name, zone, country }) {
  await page.getByRole("textbox", { name: "Name" }).fill(name);
  await page.getByRole("combobox", { name: "Time zone" }).fill(zone);
  if (country !== undefined) {
    await page
      .getByRole("combobox", { name: "Country or territory" })
      .selectOption({ label: country });
  }
  await page.getByRole("button", { name: "Add place" }).click();
}

test("ui_set_018_custom_place_form_adds_sara_to_the_grid_the_picker_and_the_map_ex_027", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  await openCustomForm(page);
  await addCustom(page, { name: "Sara", zone: "Europe/Lisbon", country: "Portugal" });
  assert.deepEqual(await listedNames(page), ["Riyadh", "Sara"]);
  const sara = page.locator(".settings-place", { hasText: "Sara" });
  assert.equal(await sara.locator('[data-role="facts"]').textContent(), "Portugal · UTC+0");
  const record = JSON.parse(
    await page.evaluate((key) => localStorage.getItem(key) ?? "", config.storageKey),
  );
  assert.deepEqual(record.places[1].custom, {
    name: "Sara",
    zone: "Europe/Lisbon",
    countryCode: "PT",
  });
  assert.equal(await page.getByRole("textbox", { name: "Name" }).inputValue(), "");
  await page.keyboard.press("Escape");
  const names = (/** @type {string} */ role) => page.locator(`[data-role="${role}"]`);
  assert.deepEqual(await names("grid-row").locator(".month-grid-place-name").allTextContents(), [
    "Riyadh",
    "Sara",
  ]);
  assert.deepEqual(await page.locator(".picker-name").allTextContents(), ["Riyadh", "Sara"]);
  assert.deepEqual(await names("pin-name").allTextContents(), ["Riyadh", "Sara"]);
});

test("ui_set_018_form_marks_an_empty_name_an_unknown_zone_or_no_country_invalid_and_adds_nothing", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  await openCustomForm(page);
  const name = page.getByRole("textbox", { name: "Name" });
  const zone = page.getByRole("combobox", { name: "Time zone" });
  const country = page.getByRole("combobox", { name: "Country or territory" });
  const invalid = async () => [
    await name.getAttribute("aria-invalid"),
    await zone.getAttribute("aria-invalid"),
    await country.getAttribute("aria-invalid"),
  ];
  await page.getByRole("button", { name: "Add place" }).click();
  assert.deepEqual(await invalid(), ["true", "true", "true"]);
  await name.fill("   ");
  await zone.fill("Mars/Olympus");
  await page.getByRole("button", { name: "Add place" }).click();
  assert.deepEqual(await invalid(), ["true", "true", "true"]);
  await name.fill("Sara");
  await zone.fill("Europe/Lisbon");
  await country.selectOption({ value: "" });
  await page.getByRole("button", { name: "Add place" }).click();
  assert.deepEqual(await invalid(), ["false", "false", "true"]);
  assert.deepEqual(await listedNames(page), ["Riyadh"]);
  const record = JSON.parse(
    await page.evaluate((key) => localStorage.getItem(key) ?? "null", config.storageKey),
  );
  assert.equal(record.places.length, 1);
});

test("ui_set_018_a_full_zone_name_typed_into_the_zone_field_is_accepted", async () => {
  for (const browserName of browserNames) {
    const each = await launchBrowser(browserName);
    const { page } = await openPage(each, built.url, { saved: savedPlaces(["riyadh"]) });
    await openSettings(page);
    await openCustomForm(page);
    const zone = page.getByRole("combobox", { name: "Time zone" });
    await zone.pressSequentially("Asia/Tokyo");
    const country = page.getByRole("combobox", { name: "Country or territory" });
    assert.equal(await country.inputValue(), "JP", browserName);
    await page.getByRole("textbox", { name: "Name" }).fill("Aiko");
    await page.getByRole("button", { name: "Add place" }).click();
    assert.deepEqual(await listedNames(page), ["Riyadh", "Aiko"], browserName);
    await each.close();
  }
});

test("ui_set_004_places_survive_reload", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces([]) });
  await page.getByRole("button", { name: "Add a place" }).click();
  await page.getByRole("tab", { name: "Places", exact: true }).click();
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

test("ui_set_018_every_zone_of_the_table_is_known_to_the_browser", async () => {
  const zones = listZones().map((row) => row.zone);
  for (const name of browserNames) {
    const each = await launchBrowser(name);
    const { page } = await openPage(each, built.url, { saved: savedPlaces(["riyadh"]) });
    const refused = await page.evaluate((names) => {
      /** @param {string} zone @returns {boolean} Whether the browser refuses the zone. */
      const isRefused = (zone) => {
        try {
          return new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(0) === "";
        } catch {
          return true;
        }
      };
      return names.filter(isRefused);
    }, zones);
    await each.close();
    assert.deepEqual(refused, [], name);
  }
});
