// @ts-check
/** @module holidays-file.test Headless-browser tests of the holidays file (export, import, refusal, no network request), in Chromium, Firefox, WebKit and Edge under the page's Content-Security-Policy (HOL-010 to HOL-012, NFR-001, EX-017, EX-018, DEC-018). */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { browserNames, buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

/** @typedef {import("./page-fixture.js").PageBuild} PageBuild */
/** @typedef {import("./page-fixture.js").Browser} Browser */
/** @typedef {import("./page-fixture.js").Page} Page */

/** @type {PageBuild} */
let built;
/** @type {Map<string, Browser>} */
const browsers = new Map();

const diwali = Object.freeze({ countryCode: "IN", date: "2026-11-08", name: "Diwali" });
const iqbalDay = Object.freeze({ countryCode: "PK", date: "2026-11-09", name: "Iqbal Day" });
const refusal = "The file was refused: it is not a Zuno holidays file. Nothing was changed.";

before(async () => {
  built = await buildToScratch();
  await Promise.all(
    browserNames.map(async (name) => browsers.set(name, await launchBrowser(name))),
  );
});

after(async () => {
  await Promise.all([...browsers.values()].map((browser) => browser.close()));
  await built.remove();
});

/**
 * @param {string} name One of `browserNames`.
 * @returns {Promise<{ page: Page, requestUrls: string[], section: import("playwright").Locator }>}
 *   The page with the settings panel open on its Holidays section.
 */
async function openHolidays(name) {
  const browser = browsers.get(name);
  if (browser === undefined) throw new Error(`Browser ${name} did not launch.`);
  const places = ["mumbai", "islamabad"].map((id, index) => createPlace(`place-${index + 1}`, id));
  const saved = { ...defaultSettings(540, 1020), places };
  const { page, requestUrls } = await openPage(browser, built.url, { saved });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Holidays and vacations", exact: true }).click();
  const section = page.getByRole("tabpanel", { name: "Holidays and vacations", exact: true });
  await section.waitFor();
  return { page, requestUrls, section };
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
 * @param {import("playwright").Locator} section
 * @returns {Promise<unknown>} The JSON of the file that "Export" downloads, after checking its name.
 */
async function exportedFile(page, section) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    section.getByRole("button", { name: "Export", exact: true }).click(),
  ]);
  assert.equal(download.suggestedFilename(), config.holidaysFileName);
  return JSON.parse(await readFile(await download.path(), "utf8"));
}

/**
 * @param {import("playwright").Locator} section
 * @param {string | object} content The text of the file to pick, or a value to write as JSON.
 * @returns {Promise<void>} Picks a file with `content` in the Import control.
 */
async function importFile(section, content) {
  const text = typeof content === "string" ? content : JSON.stringify(content);
  await section.getByLabel("Import", { exact: true }).setInputFiles({
    name: "holidays.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
}

/**
 * Reads the rows one by one: `allInnerTexts` crashes the page in headless Firefox.
 * @param {import("playwright").Locator} section
 * @returns {Promise<string[]>} The added holidays listed in the section.
 */
async function addedList(section) {
  const rows = section.locator('[data-role="added"] [data-role="holiday-text"]');
  const count = await rows.count();
  return Promise.all(Array.from({ length: count }, (_, index) => rows.nth(index).innerText()));
}

test("test_hol_010_export_saves_the_added_and_hidden_holidays_to_a_file", async () => {
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name);
    await addHoliday(section, { country: "India", date: diwali.date, name: diwali.name });
    const exported = await exportedFile(page, section);
    assert.deepEqual(exported, { version: 1, added: [diwali], hidden: [] }, name);
  }
});

test("test_hol_011_import_adds_the_files_holidays_to_the_saved_ones", async () => {
  for (const name of browserNames) {
    const { section } = await openHolidays(name);
    await addHoliday(section, { country: "India", date: diwali.date, name: diwali.name });
    await importFile(section, { version: 1, added: [iqbalDay, diwali], hidden: [] });
    const expected = ["08-Nov-26 · India · Diwali", "09-Nov-26 · Pakistan · Iqbal Day"];
    await section.getByText(expected[1]).waitFor();
    assert.deepEqual(await addedList(section), expected, name);
    assert.equal(await section.getByRole("alert").count(), 0, name);
  }
});

test("test_hol_012_invalid_file_changes_nothing_and_is_reported", async () => {
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name);
    await addHoliday(section, { country: "India", date: diwali.date, name: diwali.name });
    const stored = () =>
      page.evaluate((key) => localStorage.getItem(key), config.holidaysStorageKey);
    const before = await stored();
    await importFile(section, "hello");
    await section.getByRole("alert").waitFor();
    assert.equal(await section.getByRole("alert").innerText(), refusal, name);
    await importFile(section, { version: 1, added: "yes" });
    assert.equal(await section.getByRole("alert").innerText(), refusal, name);
    assert.equal(await stored(), before, name);
    assert.deepEqual(await addedList(section), ["08-Nov-26 · India · Diwali"], name);
    await importFile(section, { version: 1, added: [], hidden: [] });
    await section.getByRole("alert").waitFor({ state: "hidden" });
  }
});

test("test_nfr_001_export_and_import_make_no_network_request", async () => {
  for (const name of browserNames) {
    const { page, section, requestUrls } = await openHolidays(name);
    await addHoliday(section, { country: "India", date: diwali.date, name: diwali.name });
    await exportedFile(page, section);
    await importFile(section, { version: 1, added: [iqbalDay], hidden: [] });
    await section.getByText("09-Nov-26 · Pakistan · Iqbal Day").waitFor();
    const holidayPrefix = `${config.holidayServiceBaseUrl}/Holidays/`;
    const others = requestUrls.filter((url) => !url.startsWith(holidayPrefix) && url !== built.url);
    assert.deepEqual(others, [], `${name}: requests other than the holiday service`);
  }
});
