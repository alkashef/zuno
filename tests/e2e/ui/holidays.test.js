// @ts-check
/** @module holidays.test Headless-browser tests of the holidays a user adds and hides, in Chromium (HOL-006 to HOL-009, HOL-015, HOL-019, CAL-006, EX-015, EX-016, EX-028, EX-030, DEC-017, DEC-031). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createCustomPlace, createPlace } from "../../../src/domain/places.js";
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
 * @returns {import("../../../src/domain/settings.js").Settings} Settings with one place per city.
 */
function savedPlaces(cityIds) {
  const places = cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId));
  return { ...defaultSettings(540, 1020), places };
}

/**
 * @param {Page} page
 * @param {string} key A `localStorage` key.
 * @returns {Promise<unknown>} The parsed record under that key, or `null`.
 */
async function storedRecord(page, key) {
  const text = await page.evaluate((name) => localStorage.getItem(name), key);
  return text === null ? null : JSON.parse(text);
}

/**
 * @param {Page} page
 * @returns {Promise<import("playwright").Locator>} The Holidays section of the opened panel.
 */
async function openHolidays(page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Holidays and vacations", exact: true }).click();
  const section = page.getByRole("tabpanel", { name: "Holidays and vacations", exact: true });
  await section.waitFor();
  return section;
}

/**
 * @param {import("playwright").Locator} section
 * @param {{ country: string, date: string, name: string }} holiday
 * @returns {Promise<void>} Fills the add form and presses "Add holiday".
 */
async function addHoliday(section, { country, date, name }) {
  await section.getByRole("combobox", { name: "Country" }).selectOption({ label: country });
  await section.getByLabel("Date").fill(date);
  await section.getByRole("textbox", { name: "Name" }).fill(name);
  await section.getByRole("button", { name: "Add holiday" }).click();
}

/**
 * @param {Page} page
 * @returns {Promise<void>} Shows December 2026, where the invented service holiday is.
 */
async function showDecember(page) {
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("heading", { name: "December 2026" }).waitFor();
}

test("test_hol_006_holidays_section_adds_and_lists_a_holiday", async () => {
  const saved = savedPlaces(["mumbai", "pune"]);
  const { page } = await openPage(browser, built.url, { saved });
  const section = await openHolidays(page);
  assert.equal(await section.getByText("No holidays added.").isVisible(), true);
  assert.equal(await section.getByText("No holidays hidden.").isVisible(), true);
  await section.getByRole("button", { name: "Add holiday" }).click();
  for (const field of ["Country", "Date", "Name"]) {
    assert.equal(await section.getByLabel(field).getAttribute("aria-invalid"), "true", field);
  }
  assert.equal(await storedRecord(page, config.holidaysStorageKey), null);
  await addHoliday(section, { country: "India", date: "2026-11-08", name: "Diwali" });
  const rows = section.locator('[data-role="added"] li');
  assert.deepEqual(await rows.locator('[data-role="holiday-text"]').allTextContents(), [
    "08-Nov-26 · India · Diwali",
  ]);
  assert.equal(await section.getByText("No holidays added.").isVisible(), false);
  const diwali = { countryCode: "IN", date: "2026-11-08", name: "Diwali" };
  const record = { version: 1, added: [diwali], hidden: [] };
  assert.deepEqual(await storedRecord(page, config.holidaysStorageKey), record);
  assert.deepEqual(await storedRecord(page, config.storageKey), saved);
  const cells = page.getByRole("button", { name: "Diwali, 08-Nov-26" });
  assert.equal(await cells.count(), 2);
  await page.reload();
  const again = await openHolidays(page);
  await again.getByRole("button", { name: "Remove Diwali, India, 08-Nov-26" }).click();
  assert.equal(await again.getByText("No holidays added.").isVisible(), true);
  assert.equal(await cells.count(), 0);
});

/**
 * @param {Page} page
 * @param {number} row The place's position.
 * @param {string} date `YYYY-MM-DD`.
 * @returns {import("playwright").Locator} The cell of that day in that place's row.
 */
function cellOf(page, row, date) {
  return page
    .locator('[data-role="grid-row"]')
    .nth(row)
    .locator(`[data-role="cell"][data-date="${date}"]`);
}

/**
 * @param {Page} page
 * @returns {Promise<void>} Right-clicks the 2026-12-25 cell of the first row, then waits for the menu.
 */
async function openMenuOnChristmas(page) {
  await cellOf(page, 0, "2026-12-25").click({ button: "right" });
  await page.getByRole("menu").waitFor();
}

test("ui_cal_006_hovering_a_holiday_cell_shows_its_card_and_leaving_removes_it_ex_030", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["new-york"]) });
  await showDecember(page);
  assert.equal(await page.getByRole("tooltip").count(), 0);
  await cellOf(page, 0, "2026-12-25").hover();
  const card = page.getByRole("tooltip");
  await card.waitFor();
  const text = await card.innerText();
  assert.match(text, /Invented Day/);
  assert.match(text, /25-Dec-26/);
  assert.equal(await card.locator("button").count(), 0);
  assert.equal(
    await card.evaluate(
      (element) => element.ownerDocument.defaultView?.getComputedStyle(element).pointerEvents,
    ),
    "none",
  );
  const place = page.locator('[data-role="place"]').first();
  assert.equal(await place.locator('[role="tooltip"]').count(), 1);
  await page.mouse.move(0, 0);
  assert.equal(await page.getByRole("tooltip").count(), 0);
});

test("ui_cal_006_keyboard_focus_on_a_holiday_cell_shows_its_card", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["new-york"]) });
  await showDecember(page);
  const button = page.getByRole("button", { name: "Invented Day, 25-Dec-26" });
  await button.focus();
  assert.match(await page.getByRole("tooltip").innerText(), /Invented Day/);
  await button.blur();
  assert.equal(await page.getByRole("tooltip").count(), 0);
});

test("ui_cal_006_a_vacation_cell_card_shows_the_label_and_the_dates", async () => {
  const trip = { start: "2026-11-18", end: "2026-11-20", label: "Trip" };
  const saved = savedPlaces(["new-york"]);
  saved.places = [{ ...saved.places[0], vacations: [trip] }];
  const { page } = await openPage(browser, built.url, { saved });
  await cellOf(page, 0, "2026-11-19").hover();
  const text = await page.getByRole("tooltip").innerText();
  assert.match(text, /Trip/);
  assert.match(text, /18-Nov-26/);
  assert.match(text, /20-Nov-26/);
  await page.mouse.move(0, 0);
  assert.equal(await page.getByRole("tooltip").count(), 0);
});

test("ui_hol_015_right_click_add_public_holiday_presets_the_clicked_day_ex_028", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["mumbai", "pune"]) });
  await cellOf(page, 0, "2026-11-08").click({ button: "right" });
  const menu = page.getByRole("menu");
  await menu.waitFor();
  assert.equal(await menu.getByRole("menuitem", { name: /Hide public holiday/ }).count(), 0);
  await menu.getByRole("menuitem", { name: /Add public holiday/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add public holiday" });
  await dialog.waitFor();
  assert.equal(await dialog.getByLabel("Date").inputValue(), "2026-11-08");
  await dialog.getByRole("button", { name: "Add holiday" }).click();
  assert.equal(await dialog.getByLabel("Name").getAttribute("aria-invalid"), "true");
  assert.equal(await dialog.isVisible(), true);
  await dialog.getByLabel("Name").fill("Diwali");
  await dialog.getByRole("button", { name: "Add holiday" }).click();
  assert.equal(await dialog.isVisible(), false);
  assert.equal(await page.getByRole("button", { name: "Diwali, 08-Nov-26" }).count(), 2);
  const diwali = { countryCode: "IN", date: "2026-11-08", name: "Diwali" };
  const record = { version: 1, added: [diwali], hidden: [] };
  assert.deepEqual(await storedRecord(page, config.holidaysStorageKey), record);
});

test("ui_hol_019_the_day_menu_hides_a_holiday_and_the_settings_show_it_again_ex_016", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["new-york"]) });
  await showDecember(page);
  await openMenuOnChristmas(page);
  const menu = page.getByRole("menu");
  assert.equal(await menu.getByRole("menuitem", { name: /Remove public holiday/ }).count(), 0);
  await menu.getByRole("menuitem", { name: /Hide public holiday/ }).click();
  assert.equal(await page.getByRole("menu").count(), 0);
  const invented = page.getByRole("button", { name: "Invented Day, 25-Dec-26" });
  assert.equal(await invented.count(), 0);
  const hidden = { countryCode: "US", date: "2026-12-25", name: "Invented Day" };
  const stored = { version: 1, added: [], hidden: [hidden] };
  assert.deepEqual(await storedRecord(page, config.holidaysStorageKey), stored);
  const section = await openHolidays(page);
  const shownText = section.locator('[data-role="hidden"] [data-role="holiday-text"]');
  assert.deepEqual(await shownText.allTextContents(), ["25-Dec-26 · United States · Invented Day"]);
  await section
    .getByRole("button", { name: "Show Invented Day, United States, 25-Dec-26" })
    .click();
  assert.equal(await section.getByText("No holidays hidden.").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await invented.count(), 1);
});

test("ui_hol_019_the_day_menu_removes_an_added_holiday", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["new-york"]) });
  await showDecember(page);
  await cellOf(page, 0, "2026-12-01").click({ button: "right" });
  await page.getByRole("menuitem", { name: /Add public holiday/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add public holiday" });
  await dialog.getByLabel("Name").fill("Team Day");
  await dialog.getByRole("button", { name: "Add holiday" }).click();
  const team = page.getByRole("button", { name: "Team Day, 01-Dec-26" });
  assert.equal(await team.count(), 1);
  await cellOf(page, 0, "2026-12-01").click({ button: "right" });
  const menu = page.getByRole("menu");
  assert.equal(await menu.getByRole("menuitem", { name: /Hide public holiday/ }).count(), 0);
  await menu.getByRole("menuitem", { name: /Remove public holiday/ }).click();
  assert.equal(await team.count(), 0);
  const emptied = { version: 1, added: [], hidden: [] };
  assert.deepEqual(await storedRecord(page, config.holidaysStorageKey), emptied);
});

test("ui_hol_019_escape_and_a_click_outside_close_the_day_menu", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["new-york"]) });
  await showDecember(page);
  await openMenuOnChristmas(page);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("menu").count(), 0);
  await openMenuOnChristmas(page);
  await page.getByRole("heading", { name: "Zuno" }).click();
  assert.equal(await page.getByRole("menu").count(), 0);
});

test("ui_hol_013_riyadh_holiday_and_credit_line_ex_022", async () => {
  const { page, holidayRequests } = await openPage(browser, built.url, {
    saved: savedPlaces(["riyadh"]),
  });
  const previous = page.getByRole("button", { name: "Previous month" });
  await previous.click();
  await previous.click();
  await page.getByRole("heading", { name: "September 2026" }).waitFor();
  const nationalDay = page.getByRole("button", { name: "National Day, 23-Sep-26" });
  assert.equal(await nationalDay.count(), 1);
  assert.deepEqual(holidayRequests, []);
  const section = await openHolidays(page);
  const credit = section.locator('[data-role="holiday-table-credit"]');
  assert.match(await credit.innerText(), /date-holidays.*CC BY-SA 3\.0/s);
});

/** @returns {import("../../../src/domain/settings.js").Settings} Settings with Sara of EX-027. */
function savedSara() {
  const sara = createCustomPlace("place-1", {
    name: "Sara",
    zone: "Europe/Lisbon",
    countryCode: "PT",
  });
  return { ...defaultSettings(540, 1020), places: [createPlace("place-2", "mumbai"), sara] };
}

test("ui_hol_006_country_list_of_the_holidays_section_has_the_country_of_a_custom_place", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedSara() });
  const section = await openHolidays(page);
  const countries = section.getByRole("combobox", { name: "Country" });
  const labels = await countries.locator("option").allTextContents();
  assert.ok(labels.includes("Portugal"));
  assert.ok(labels.includes("India"));
  assert.ok(!labels.includes("Kenya"));
  assert.deepEqual(
    labels.slice(1),
    [...labels.slice(1)].sort((a, b) => a.localeCompare(b, "en")),
  );
});

test("ui_hol_006_holiday_added_for_a_custom_places_country_shows_in_its_row", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedSara() });
  const section = await openHolidays(page);
  await addHoliday(section, { country: "Portugal", date: "2026-11-20", name: "Sara Day" });
  const rows = section.locator('[data-role="added"] li [data-role="holiday-text"]');
  assert.deepEqual(await rows.allTextContents(), ["20-Nov-26 · Portugal · Sara Day"]);
  const cells = page.getByRole("button", { name: "Sara Day, 20-Nov-26" });
  assert.equal(await cells.count(), 1);
});
