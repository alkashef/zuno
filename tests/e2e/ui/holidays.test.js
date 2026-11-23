// @ts-check
/** @module holidays.test Headless-browser tests of the holidays a user adds and hides, in Chromium (HOL-006 to HOL-009, EX-015, EX-016, DEC-017). */
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

test("test_hol_008_holiday_card_hides_a_service_holiday_and_removes_an_added_one", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["new-york"]) });
  await showDecember(page);
  const card = page.getByRole("dialog", { name: "Holiday" });
  const invented = page.getByRole("button", { name: "Invented Day, 25-Dec-26" });
  await invented.click();
  assert.equal(await card.getByRole("button", { name: "Remove", exact: true }).count(), 0);
  await card.getByRole("button", { name: "Hide", exact: true }).click();
  assert.equal(await card.count(), 0);
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
  await addHoliday(section, { country: "United States", date: "2026-12-01", name: "Team Day" });
  await page.keyboard.press("Escape");
  assert.equal(await invented.count(), 1);
  await page.getByRole("button", { name: "Team Day, 01-Dec-26" }).click();
  assert.equal(await card.getByRole("button", { name: "Hide", exact: true }).count(), 0);
  await card.getByRole("button", { name: "Remove", exact: true }).click();
  assert.equal(await card.count(), 0);
  assert.equal(await page.getByRole("button", { name: "Team Day, 01-Dec-26" }).count(), 0);
  const emptied = { version: 1, added: [], hidden: [] };
  assert.deepEqual(await storedRecord(page, config.holidaysStorageKey), emptied);
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
