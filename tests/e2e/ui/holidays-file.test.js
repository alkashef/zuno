// @ts-check
/** @module holidays-file.test Headless-browser tests of the holidays file (export, import, refusal, no network request), in Chromium, Firefox, WebKit and Edge under the page's Content-Security-Policy (HOL-010 to HOL-012, HOL-016 to HOL-018, HOL-020 to HOL-023, NFR-001, EX-017, EX-018, EX-031, EX-032, EX-034, DEC-032, DEC-035). */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { listAllCountries } from "../../../src/domain/cities.js";
import { createCustomPlace, createPlace } from "../../../src/domain/places.js";
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
const christmas = Object.freeze({ countryCode: "US", date: "2026-12-25", name: "Christmas Day" });
const refusal =
  "The file was refused: it is not a Zuno holidays and vacations file. Nothing was changed.";

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
 * @param {import("./page-fixture.js").OpenOptions} [options] Extra saved data.
 * @returns {Promise<{ page: Page, requestUrls: string[], section: import("playwright").Locator }>}
 *   The page with the settings panel open on its Holidays section.
 */
async function openHolidays(name, options = {}) {
  const browser = browsers.get(name);
  if (browser === undefined) throw new Error(`Browser ${name} did not launch.`);
  const places = ["mumbai", "islamabad"].map((id, index) => createPlace(`place-${index + 1}`, id));
  const saved = options.saved ?? { ...defaultSettings(540, 1020), places };
  const { page, requestUrls } = await openPage(browser, built.url, { ...options, saved });
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
 * @returns {Promise<string>} The text of the file that "Export" downloads, after checking its name.
 */
async function exportedFile(page, section) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    section.getByRole("button", { name: "Export", exact: true }).click(),
  ]);
  assert.equal(download.suggestedFilename(), config.holidaysFileName);
  return readFile(await download.path(), "utf8");
}

/**
 * @param {...string} lines The data rows of a file.
 * @returns {string} The text of a file with the header row and those rows.
 */
function csvOf(...lines) {
  return ["Type,Country,Place,Start date,End date,Name", ...lines, ""].join("\r\n");
}

/**
 * @param {import("playwright").Locator} section
 * @param {string} text The text of the file to pick.
 * @param {string} [fileName]
 * @returns {Promise<void>} Picks a CSV file with that text in the Import control.
 */
async function importFile(section, text, fileName = "holidays.csv") {
  await section.getByLabel("Import", { exact: true }).setInputFiles({
    name: fileName,
    mimeType: "text/csv",
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

/** @returns {import("../../../src/domain/settings.js").Settings} Settings with Sara and her winter break (EX-031). */
function savedWithSara() {
  const sara = createCustomPlace("place-1", {
    name: "Sara",
    zone: "Europe/Lisbon",
    countryCode: "PT",
  });
  const winter = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };
  return { ...defaultSettings(540, 1020), places: [{ ...sara, vacations: [winter] }] };
}

test("ui_hol_010_export_downloads_the_three_rows_of_ex_031", async () => {
  const savedHolidays = { version: /** @type {const} */ (1), added: [diwali], hidden: [christmas] };
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name, { saved: savedWithSara(), savedHolidays });
    const text = await exportedFile(page, section);
    assert.equal(
      text,
      [
        String.fromCharCode(0xfeff) + "Type,Country,Place,Start date,End date,Name",
        "holiday,India,,08-Nov-26,,Diwali",
        "hidden holiday,United States,,25-Dec-26,,Christmas Day",
        "vacation,,Sara,21-Dec-26,31-Dec-26,Winter break",
        "",
      ].join("\r\n"),
      name,
    );
  }
});

test("ui_hol_016_the_page_describes_the_columns_the_date_format_and_an_example_beside_the_buttons", async () => {
  for (const name of browserNames) {
    const { section } = await openHolidays(name);
    const card = section.locator('[data-role="file"]');
    await card.getByRole("button", { name: "Export", exact: true }).waitFor();
    const description = await card.locator('[data-role="file-format"]').innerText();
    for (const column of ["Type", "Country", "Place", "Start date", "End date", "Name"]) {
      assert.match(description, new RegExp(column), `${name}: describes ${column}`);
    }
    assert.match(description, /dd-mmm-yy/, name);
    const example = await card.locator('[data-role="file-example"]').innerText();
    assert.match(example, /^Type,Country,Place,Start date,End date,Name\n/, name);
    assert.match(example, /vacation,,Sara,21-Dec-26,31-Dec-26,Winter break/, name);
  }
});

/** @returns {import("playwright").Locator} The import dialog of a page. */
function importDialog(/** @type {Page} */ page) {
  return page.getByRole("dialog", { name: "Import holidays and vacations" });
}

/**
 * @param {Page} page
 * @returns {Promise<{ holidays: string | null, settings: string | null }>} What the page has saved.
 */
function savedRecords(page) {
  return page.evaluate(
    ({ holidaysKey, settingsKey }) => ({
      holidays: localStorage.getItem(holidaysKey),
      settings: localStorage.getItem(settingsKey),
    }),
    { holidaysKey: config.holidaysStorageKey, settingsKey: config.storageKey },
  );
}

/** @returns {import("../../../src/domain/settings.js").Settings} Sara (EX-032) and London. */
function savedWithSaraAndLondon() {
  const sara = createCustomPlace("place-1", {
    name: "Sara",
    zone: "Europe/Lisbon",
    countryCode: "PT",
  });
  const london = createPlace("place-2", "london");
  return { ...defaultSettings(540, 1020), places: [sara, london] };
}

/** The four rows of EX-032: a holiday, two vacations of Sara and one of a place named Omar. */
const ex032File = csvOf(
  "holiday,India,,08-Nov-26,,Diwali",
  "vacation,,Sara,21-Dec-26,31-Dec-26,Winter break",
  "vacation,,Sara,01-Aug-26,15-Aug-26,Summer",
  "vacation,,Omar,01-Jan-27,05-Jan-27,Trip",
);

test("ui_hol_017_the_dialog_says_n_of_m_rows_can_be_imported_and_names_the_missing_place_ex_032", async () => {
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name, { saved: savedWithSaraAndLondon() });
    const dialog = importDialog(page);
    assert.equal(await dialog.isVisible(), false, `${name}: no dialog before a file is picked`);
    await importFile(section, ex032File);
    await dialog.waitFor();
    const text = await dialog.innerText();
    assert.match(text, /3 of 4 rows can be imported\./, name);
    assert.match(text, /Missing places: Omar\./, name);
    assert.doesNotMatch(text, /not valid/, name);
    const add = dialog.getByRole("button", { name: "Add 3 rows", exact: true });
    assert.equal(await add.isEnabled(), true, name);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).waitFor();
  }
});

test("ui_hol_017_the_dialog_shows_on_a_file_where_nothing_is_missing_and_disables_add_for_zero_rows", async () => {
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name);
    await importFile(section, csvOf("holiday,India,,08-Nov-26,,Diwali"));
    await importDialog(page).waitFor();
    assert.match(await importDialog(page).innerText(), /1 of 1 rows can be imported\./, name);
    assert.doesNotMatch(await importDialog(page).innerText(), /Missing places/, name);
    await importDialog(page).getByRole("button", { name: "Cancel", exact: true }).click();
    await importFile(section, csvOf("party,India,,08-Nov-26,,Diwali"));
    await importDialog(page).waitFor();
    const text = await importDialog(page).innerText();
    assert.match(text, /0 of 1 rows can be imported\./, name);
    assert.match(text, /1 row is not valid\./, name);
    const add = importDialog(page).getByRole("button", { name: "Add 0 rows", exact: true });
    assert.equal(await add.isDisabled(), true, name);
  }
});

test("ui_hol_011_add_adds_the_rows", async () => {
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name, { saved: savedWithSaraAndLondon() });
    await importFile(section, ex032File);
    await importDialog(page).getByRole("button", { name: "Add 3 rows", exact: true }).click();
    await importDialog(page).waitFor({ state: "hidden" });
    assert.deepEqual(await addedList(section), ["08-Nov-26 · India · Diwali"], name);
    const text = await exportedFile(page, section);
    assert.equal(
      text,
      [
        String.fromCharCode(0xfeff) + "Type,Country,Place,Start date,End date,Name",
        "holiday,India,,08-Nov-26,,Diwali",
        "vacation,,Sara,21-Dec-26,31-Dec-26,Winter break",
        "vacation,,Sara,01-Aug-26,15-Aug-26,Summer",
        "",
      ].join("\r\n"),
      name,
    );
    const places = await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key) ?? "{}").places.map(
          (/** @type {{ id: string }} */ place) => place.id,
        ),
      config.storageKey,
    );
    assert.deepEqual(places, ["place-1", "place-2"], `${name}: no place was added`);
  }
});

test("ui_hol_018_cancel_changes_nothing", async () => {
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name, { saved: savedWithSaraAndLondon() });
    await addHoliday(section, { country: "India", date: iqbalDay.date, name: "Own day" });
    const before = await savedRecords(page);
    await importFile(section, ex032File);
    await importDialog(page).getByRole("button", { name: "Cancel", exact: true }).click();
    await importDialog(page).waitFor({ state: "hidden" });
    assert.deepEqual(await savedRecords(page), before, name);
    assert.deepEqual(await addedList(section), ["09-Nov-26 · India · Own day"], name);
    await importFile(section, ex032File);
    await importDialog(page).waitFor();
    await page.keyboard.press("Escape");
    await importDialog(page).waitFor({ state: "hidden" });
    assert.deepEqual(await savedRecords(page), before, `${name}: Escape cancels too`);
  }
});

test("ui_hol_012_a_refused_file_shows_the_message_ex_018", async () => {
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name);
    await addHoliday(section, { country: "India", date: diwali.date, name: diwali.name });
    const before = await savedRecords(page);
    await importFile(section, "hello");
    await section.getByRole("alert").waitFor();
    assert.equal(await section.getByRole("alert").innerText(), refusal, name);
    assert.equal(await importDialog(page).isVisible(), false, name);
    await importFile(section, JSON.stringify({ version: 1, added: [], hidden: [] }));
    assert.equal(await section.getByRole("alert").innerText(), refusal, name);
    assert.deepEqual(await savedRecords(page), before, name);
    assert.deepEqual(await addedList(section), ["08-Nov-26 · India · Diwali"], name);
    await importFile(section, csvOf());
    await importDialog(page).waitFor();
    await section.getByRole("alert").waitFor({ state: "hidden" });
  }
});

test("ui_hol_017_country_names_as_chromium_writes_them_import_in_every_browser", async () => {
  const chromium = browsers.get("chromium");
  if (chromium === undefined) throw new Error("Chromium did not launch.");
  const { page: source } = await openPage(chromium, built.url);
  const codes = listAllCountries().map((country) => country.code);
  const names = await source.evaluate((list) => {
    const regions = new Intl.DisplayNames("en", { type: "region" });
    return list.map((code) => regions.of(code) ?? code);
  }, codes);
  const rows = names.map(
    (country, index) => `holiday,${JSON.stringify(country)},,08-Nov-26,,Day ${index}`,
  );
  for (const name of browserNames) {
    const { page, section } = await openHolidays(name);
    await importFile(section, csvOf(...rows));
    await importDialog(page).waitFor();
    const text = await importDialog(page).innerText();
    assert.match(
      text,
      new RegExp(`${codes.length} of ${codes.length} rows can be imported\\.`),
      name,
    );
  }
});

test("test_nfr_001_export_and_import_make_no_network_request", async () => {
  for (const name of browserNames) {
    const { page, section, requestUrls } = await openHolidays(name);
    await addHoliday(section, { country: "India", date: diwali.date, name: diwali.name });
    await exportedFile(page, section);
    await importFile(section, csvOf("holiday,Pakistan,,09-Nov-26,,Iqbal Day"));
    await importDialog(page).getByRole("button", { name: "Add 1 row", exact: true }).click();
    await section.getByText("09-Nov-26 · Pakistan · Iqbal Day").waitFor();
    const holidayPrefix = `${config.holidayServiceBaseUrl}/Holidays/`;
    const others = requestUrls.filter((url) => !url.startsWith(holidayPrefix) && url !== built.url);
    assert.deepEqual(others, [], `${name}: requests other than the holiday service`);
  }
});

const testDay = Object.freeze({ country: "India", date: "2026-11-10", name: "Test day" });
const diwaliRow = "holiday,India,,08-Nov-26,,Diwali";
const foundersRow = "holiday,India,,12-Nov-26,,Founders Day";
const vacationRow = (/** @type {string} */ label, /** @type {string} */ day) =>
  `vacation,,Sara,${day}-Dec-26,${day}-Dec-26,${label}`;
const fileA = csvOf(diwaliRow, foundersRow, vacationRow("V1", "01"), vacationRow("V2", "02"));
const fileB = csvOf(diwaliRow, vacationRow("V3", "03"));

/**
 * @param {Page} page
 * @param {import("playwright").Locator} section
 * @param {string} fileName
 * @param {string} text The text of the file.
 * @returns {Promise<void>} Picks the file and presses Add in the preview.
 */
async function importAndAdd(page, section, fileName, text) {
  await importFile(section, text, fileName);
  await importDialog(page)
    .getByRole("button", { name: /^Add \d+ rows?$/ })
    .click();
  await importDialog(page).waitFor({ state: "hidden" });
}

/**
 * Reads the rows one by one: `allInnerTexts` crashes the page in headless Firefox.
 * @param {import("playwright").Locator} section
 * @returns {Promise<string[][]>} The lines of each imported file in the list: the name, the time and
 *   date, then the counts.
 */
async function importedList(section) {
  const rows = section.locator('[data-role="import-list"] [data-role="import-text"]');
  const count = await rows.count();
  const texts = await Promise.all(
    Array.from({ length: count }, (_, index) => rows.nth(index).innerText()),
  );
  return texts.map((text) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

/**
 * @param {string} name One of `browserNames`.
 * @returns {Promise<{ page: Page, section: import("playwright").Locator }>} The page of EX-034 after
 *   the hand-typed holiday Y and the files A then B, with the settings open on the Holidays tab.
 */
async function openAfterFilesAAndB(name) {
  const { page, section } = await openHolidays(name, { saved: savedWithSaraAndLondon() });
  await addHoliday(section, testDay);
  await importAndAdd(page, section, "a.csv", fileA);
  await importAndAdd(page, section, "b.csv", fileB);
  return { page, section };
}

/** @returns {import("playwright").Locator} The delete dialog of a page. */
function deleteDialog(/** @type {Page} */ page) {
  return page.getByRole("dialog", { name: "Delete imported file" });
}

const countsOfA = "2 holidays, 0 hidden holidays, 2 vacations";
const countsOfB = "1 holiday, 0 hidden holidays, 1 vacation";

test("ui_hol_020_the_list_shows_each_file_with_its_time_and_counts_ex_034", async () => {
  for (const name of browserNames) {
    const { section } = await openHolidays(name, { saved: savedWithSaraAndLondon() });
    await section.getByText("No files imported.").waitFor();
    const page = section.page();
    await addHoliday(section, testDay);
    await importAndAdd(page, section, "a.csv", fileA);
    await importAndAdd(page, section, "b.csv", fileB);
    assert.deepEqual(
      await importedList(section),
      [
        ["a.csv", "9:25 AM · 16-Nov-26", countsOfA],
        ["b.csv", "9:25 AM · 16-Nov-26", countsOfB],
      ],
      name,
    );
    assert.equal(await section.getByText("No files imported.").isVisible(), false, name);
  }
});

test("ui_hol_021_the_delete_dialog_says_how_many_entries_go_and_stay_and_cancel_changes_nothing", async () => {
  for (const name of browserNames) {
    const { page, section } = await openAfterFilesAAndB(name);
    const before = await savedRecords(page);
    const dialog = deleteDialog(page);
    assert.equal(await dialog.isVisible(), false, `${name}: no dialog before Delete`);
    await section.getByRole("button", { name: "Delete a.csv", exact: true }).click();
    await dialog.waitFor();
    const text = await dialog.innerText();
    assert.match(text, /3 entries go\./, name);
    assert.match(text, /1 entry stays because another file also lists it\./, name);
    await dialog.getByRole("button", { name: "Delete 3 entries", exact: true }).waitFor();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(await savedRecords(page), before, name);
    await section.getByRole("button", { name: "Delete a.csv", exact: true }).click();
    await dialog.waitFor();
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(await savedRecords(page), before, `${name}: Escape cancels too`);
    assert.equal((await importedList(section)).length, 2, name);
  }
});

test("ui_hol_022_deleting_a_removes_z_v1_and_v2_and_keeps_x_ex_034", async () => {
  for (const name of browserNames) {
    const { page, section } = await openAfterFilesAAndB(name);
    await section.getByRole("button", { name: "Delete a.csv", exact: true }).click();
    await deleteDialog(page).getByRole("button", { name: "Delete 3 entries", exact: true }).click();
    await deleteDialog(page).waitFor({ state: "hidden" });
    assert.deepEqual(
      await importedList(section),
      [["b.csv", "9:25 AM · 16-Nov-26", countsOfB]],
      name,
    );
    assert.deepEqual(
      await addedList(section),
      ["10-Nov-26 · India · Test day", "08-Nov-26 · India · Diwali"],
      name,
    );
    const afterA = await exportedFile(page, section);
    assert.match(afterA, /vacation,,Sara,03-Dec-26,03-Dec-26,V3/, name);
    assert.doesNotMatch(afterA, /V1|V2|Founders/, name);
    await section.getByRole("button", { name: "Delete b.csv", exact: true }).click();
    await deleteDialog(page).getByRole("button", { name: "Delete 2 entries", exact: true }).click();
    await deleteDialog(page).waitFor({ state: "hidden" });
    assert.deepEqual(await importedList(section), [], name);
    assert.deepEqual(await addedList(section), ["10-Nov-26 · India · Test day"], name);
    assert.doesNotMatch(await exportedFile(page, section), /vacation/, name);
    await section.getByText("No files imported.").waitFor();
  }
});

test("ui_hol_023_the_list_is_the_same_after_a_reload_ex_034", async () => {
  for (const name of browserNames) {
    const { page, section } = await openAfterFilesAAndB(name);
    await section.getByRole("button", { name: "Delete a.csv", exact: true }).click();
    await deleteDialog(page).getByRole("button", { name: "Delete 3 entries", exact: true }).click();
    await deleteDialog(page).waitFor({ state: "hidden" });
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("tab", { name: "Holidays and vacations", exact: true }).click();
    const reopened = page.getByRole("tabpanel", { name: "Holidays and vacations", exact: true });
    assert.deepEqual(
      await importedList(reopened),
      [["b.csv", "9:25 AM · 16-Nov-26", countsOfB]],
      name,
    );
    assert.deepEqual(
      await addedList(reopened),
      ["10-Nov-26 · India · Test day", "08-Nov-26 · India · Diwali"],
      name,
    );
  }
});
