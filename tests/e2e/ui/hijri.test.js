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
    .hover();
  const card = page.locator('[data-role="card-hijri"]');
  assert.equal(await card.textContent(), "16-Rajab-1448");
});

/**
 * @param {"light" | "dark"} colorScheme
 * @returns {Promise<Page>} The page opened on December 2026 with a Cairo place and a British place.
 */
async function openDecember(colorScheme) {
  const settings = {
    ...defaultSettings(540, 1020),
    places: [createPlace("place-1", "cairo"), createPlace("place-2", "london")],
    showHijri: true,
  };
  const { page } = await openPage(browser, built.url, { saved: settings, colorScheme });
  await page.locator('[data-role="grid-row"]').first().waitFor();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("heading", { name: "December 2026" }).waitFor();
  return page;
}

/**
 * @param {string} css A computed `rgb(...)` colour.
 * @returns {number} Its WCAG relative luminance.
 */
function luminanceOf(css) {
  const channels = (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const [r = 0, g = 0, b = 0] = channels.map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {string} first
 * @param {string} second
 * @returns {number} The WCAG contrast ratio of two `rgb(...)` colours.
 */
function ratioOf(first, second) {
  const [high = 0, low = 0] = [luminanceOf(first), luminanceOf(second)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

/**
 * @typedef {object} HijriLook
 * @property {string} kind The cell's kind.
 * @property {string} colour The Hijri day's colour.
 * @property {string} background The Hijri day's own background colour.
 * @property {string} weight The Hijri day's font weight.
 * @property {string[]} under The colours the Hijri day sits on.
 */

/**
 * @param {Page} page
 * @returns {Promise<HijriLook[]>} The look of the Hijri day in each kind of cell, over all places.
 */
async function readHijriLooks(page) {
  const [first = []] = await page.locator("body").evaluateAll((bodies) => {
    const row = bodies[0];
    const win = /** @type {Window} */ (row.ownerDocument.defaultView);
    /** @param {Element} cell @returns {string[]} The colours behind a cell. */
    const under = (cell) => {
      for (let node = cell; node.parentElement !== null; node = node.parentElement) {
        const style = win.getComputedStyle(node);
        if (style.backgroundImage.includes("rgb")) {
          return style.backgroundImage.match(/rgba?\([^)]*\)/g) ?? [];
        }
        if (/^rgb\(|, 1\)$/.test(style.backgroundColor)) return [style.backgroundColor];
      }
      return [];
    };
    const kinds = new Set();
    /** @type {HijriLook[]} */
    const looks = [];
    for (const cell of row.querySelectorAll('[data-role="grid-row"] [data-role="cell"]')) {
      const kind = cell.getAttribute("data-kind") ?? "";
      const day = cell.querySelector('[data-role="hijri-day"]');
      if (day === null || kinds.has(kind)) continue;
      kinds.add(kind);
      const style = win.getComputedStyle(day);
      const [background = "", ...rest] = [style.backgroundColor, ...under(cell)];
      looks.push({
        kind,
        colour: style.color,
        background,
        weight: style.fontWeight,
        under: rest,
      });
    }
    return [looks];
  });
  return first;
}

test("ui_hij_001_hijri_day_has_no_background_and_regular_weight", async () => {
  for (const colorScheme of /** @type {const} */ (["light", "dark"])) {
    const looks = await readHijriLooks(await openDecember(colorScheme));
    assert.deepEqual(looks.map((look) => look.kind).sort(), [
      "holiday",
      "plain",
      "split",
      "weekend",
    ]);
    for (const look of looks) {
      assert.equal(look.background, "rgba(0, 0, 0, 0)", `${colorScheme} ${look.kind}: background`);
      assert.equal(look.weight, "400", `${colorScheme} ${look.kind}: weight`);
    }
  }
});

test("ui_hij_001_hijri_day_colour_on_weekend_and_holiday_cells", async () => {
  const onTint = { light: "rgb(143, 26, 91)", dark: "rgb(43, 20, 100)" };
  const plain = { light: "rgb(192, 38, 124)", dark: "rgb(199, 174, 255)" };
  const minimum = { light: 3, dark: 4.5 };
  for (const colorScheme of /** @type {const} */ (["light", "dark"])) {
    for (const look of await readHijriLooks(await openDecember(colorScheme))) {
      const expected = look.kind === "plain" ? plain[colorScheme] : onTint[colorScheme];
      assert.equal(look.colour, expected, `${colorScheme} ${look.kind}: colour`);
      const ratios = look.under.map((under) => ratioOf(look.colour, under));
      const floor = look.kind === "plain" || look.kind === "weekend" ? 4.5 : minimum[colorScheme];
      for (const ratio of ratios)
        assert.ok(ratio >= floor, `${colorScheme} ${look.kind}: ${ratio}`);
    }
  }
});

test("ui_cal_001_corner_label_reads_day_with_hijri_on_and_off", async () => {
  const on = await openDecember("light");
  assert.equal(await on.locator(".month-grid-corner").last().textContent(), "Day");
  const off = await openWith(false);
  assert.equal(await off.locator(".month-grid-corner").last().textContent(), "Day");
});
