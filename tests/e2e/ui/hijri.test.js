// @ts-check
/** @module hijri.test Headless-browser tests of the Hijri calendar in the month grid, the picker and the information card, in Chromium (HIJ-001, HIJ-004, DSP-003, SET-011, EX-010). */
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
 * @param {boolean} showHijri
 * @param {number} [hijriAdjust] The first place's Hijri adjustment.
 * @returns {Promise<Page>} The page opened with a Saudi place and a British place.
 */
async function openWith(showHijri, hijriAdjust = 0) {
  const saudi = { ...createPlace("place-1", "riyadh"), hijriAdjust };
  const settings = {
    ...defaultSettings(540, 1020),
    places: [saudi, createPlace("place-2", "london")],
    showHijri,
  };
  const { page } = await openPage(browser, built.url, { saved: settings });
  await page.locator('[data-role="grid-row"]').first().waitFor();
  return page;
}

/**
 * @param {Page} page
 * @param {string} date `YYYY-MM-DD`.
 * @returns {import("playwright").Locator} The Hijri day inside the first place's cell of a date.
 */
function hijriDayOf(page, date) {
  return page
    .locator('[data-role="grid-row"]')
    .first()
    .locator(`[data-role="cell"][data-date="${date}"] [data-role="hijri-day"]`);
}

test("ui_hij_001_hijri_band_cell_days_and_picker_dates_only_when_on_ex_010", async () => {
  const off = await openWith(false);
  assert.equal(await off.locator('[data-role="hijri-day"]').count(), 0);
  assert.equal(await off.locator('[data-role="hijri-band"]').count(), 0);
  assert.equal(await off.locator('[data-role="local-hijri"]:not([hidden])').count(), 0);

  const on = await openWith(true);
  assert.equal(await hijriDayOf(on, "2026-11-16").textContent(), "06");
  assert.equal(await on.locator('[data-role="hijri-band"]').count(), 1);
  const band = (await on.locator('[data-role="hijri-band"]').textContent()) ?? "";
  assert.ok(band.includes("Jumada II-1448"), band);
  const picker = await on.locator('[data-role="local-hijri"]').allTextContents();
  assert.deepEqual(picker, ["06-Jumada II-1448", "06-Jumada II-1448"]);

  const adjusted = await openWith(true, 1);
  assert.equal(await hijriDayOf(adjusted, "2026-11-16").textContent(), "07");
  const adjustedPicker = await adjusted.locator('[data-role="local-hijri"]').allTextContents();
  assert.equal(adjustedPicker[0], "07-Jumada II-1448");
});

test("ui_hij_001_band_cells_span_exactly_the_days_of_the_month", async () => {
  const page = await openWith(true);
  const spans = await page
    .locator('[data-role="hijri-band"] th.month-grid-band')
    .evaluateAll((cells) =>
      cells.map((cell) => /** @type {HTMLTableCellElement} */ (cell).colSpan),
    );
  assert.equal(
    spans.reduce((sum, span) => sum + span, 0),
    30,
  );
});

test("ui_cal_001_one_column_per_day_and_same_cell_width_with_hijri_on", async () => {
  const off = await openWith(false);
  const on = await openWith(true);
  const dayColumns = await on.locator("th.month-grid-day").count();
  assert.equal(dayColumns, 30);
  const firstCell = '[data-role="grid-row"] [data-role="cell"]';
  const offWidth = (await off.locator(firstCell).first().boundingBox())?.width ?? 0;
  const onWidth = (await on.locator(firstCell).first().boundingBox())?.width ?? 0;
  assert.ok(offWidth > 0);
  assert.equal(Math.round(onWidth), Math.round(offWidth));
});

test("ui_hij_004_info_button_shows_calculated_date_note", async () => {
  const page = await openWith(true);
  const button = page.getByRole("button", { name: "About Hijri dates" });
  await button.click();
  const card = page.getByRole("dialog", { name: "About Hijri dates" });
  assert.match((await card.textContent()) ?? "", /calculated and may differ from official/);
  await page.keyboard.press("Escape");
  assert.equal(await card.isVisible(), false);
  assert.equal(await button.evaluate((node) => node === node.ownerDocument.activeElement), true);
});

test("ui_dsp_003_hijri_format_in_picker_and_card", async () => {
  const page = await openWith(true);
  assert.equal(
    await page.locator('[data-role="local-hijri"]').first().textContent(),
    "06-Jumada II-1448",
  );
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("heading", { name: "December 2026" }).waitFor();
  await page
    .getByRole("button", { name: /Invented Day/ })
    .first()
    .click();
  const card = page.locator('[data-role="card-hijri"]');
  assert.equal(await card.textContent(), "16-Rajab-1448");
});
