// @ts-check
/** @module legend-notices.test Headless-browser tests of the legend and the notices card in Chromium (LEG-001, REF-002, HOL-004). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

/** @typedef {import("./page-fixture.js").PageBuild} PageBuild */
/** @typedef {import("./page-fixture.js").Browser} Browser */

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
 * @param {import("../../../src/domain/places.js").Place[]} places
 * @returns {import("../../../src/domain/settings.js").Settings} Settings with the given places.
 */
function withPlaces(places) {
  return { ...defaultSettings(540, 1020), places };
}

/**
 * @param {import("playwright").Locator} legend One legend part.
 * @returns {Promise<{ names: string[], swatches: { colour: string, image: string, ring: string }[] }>}
 *   The names and the swatch styles of the part.
 */
async function readLegend(legend) {
  const names = await legend.locator('[data-role="legend-name"]').allTextContents();
  const swatches = await legend.locator('[data-role="legend-swatch"]').evaluateAll((all) =>
    all.map((swatch) => {
      const style = /** @type {Window} */ (swatch.ownerDocument.defaultView).getComputedStyle(
        swatch,
      );
      return {
        colour: style.backgroundColor,
        image: style.backgroundImage,
        ring: style.outlineStyle,
      };
    }),
  );
  return { names, swatches };
}

test("ui_leg_001_month_grid_and_picker_each_show_their_own_legend", async () => {
  const saved = withPlaces([createPlace("place-1", "riyadh"), createPlace("place-2", "london")]);
  const { page } = await openPage(browser, built.url, { saved });
  await page.locator('[data-role="legend"]').first().waitFor();
  const parts = page.locator('[data-role="legend"]');
  assert.equal(await parts.count(), 2);
  const month = page.locator('[data-role="month-grid"] [data-role="legend"]');
  const picker = page.locator('[data-role="picker"] [data-role="legend"]');
  const inMonth = await readLegend(month);
  const inPicker = await readLegend(picker);
  assert.deepEqual(inMonth.names, ["Weekend", "Public holiday", "Weekend and holiday", "Today"]);
  assert.deepEqual(inPicker.names, [
    "Working hours",
    "Non-working hours",
    "Day off: weekend or holiday",
  ]);
  const plain = [inMonth.swatches[0], inMonth.swatches[1], ...inPicker.swatches];
  const colours = plain.map((swatch) => swatch.colour);
  assert.equal(new Set(colours).size, 5, colours.join(" | "));
  assert.match(inMonth.swatches[2].image, /linear-gradient/);
  assert.equal(inMonth.swatches[3].ring, "solid");
  const named = await page.locator('[data-role="legend-name"]').allTextContents();
  assert.equal(new Set(named).size, 7, "every colour is named exactly once on the page");
});

test("ui_leg_001_legend_parts_sit_at_the_bottom_of_their_cards_with_no_page_banner", async () => {
  const saved = withPlaces([createPlace("place-1", "riyadh"), createPlace("place-2", "london")]);
  const { page } = await openPage(browser, built.url, { saved });
  await page.locator('[data-role="legend"]').first().waitFor();
  assert.equal(await page.locator("body > [data-role='legend']").count(), 0);
  for (const card of ['[data-role="month-grid"]', '[data-role="picker"]']) {
    const legend = page.locator(`${card} [data-role="legend"]`);
    const box = await legend.boundingBox();
    const cardBox = await page.locator(card).boundingBox();
    assert.ok(box !== null && cardBox !== null);
    assert.ok(box.y + box.height <= cardBox.y + cardBox.height, `${card}: inside the card`);
    assert.ok(cardBox.y + cardBox.height - (box.y + box.height) <= 24, `${card}: at the bottom`);
    const style = await legend.evaluate((element) => {
      const view = /** @type {Window} */ (element.ownerDocument.defaultView);
      const { position, borderTopWidth } = view.getComputedStyle(element);
      return { position, borderTopWidth };
    });
    assert.equal(style.borderTopWidth, "1px", `${card}: a hairline above`);
    assert.equal(style.position, "static", `${card}: not fixed to the page`);
  }
  const empty = await openPage(browser, built.url, {
    saved: { ...defaultSettings(540, 1020), places: [] },
  });
  await empty.page.locator('[data-role="empty"]').waitFor();
  assert.equal(await empty.page.locator('[data-role="legend"]').count(), 0);
});

test("ui_ref_002_failed_service_lists_countries_with_no_data_and_keeps_times", async () => {
  const saved = withPlaces([createPlace("place-1", "cairo"), createPlace("place-2", "london")]);
  const { page } = await openPage(browser, built.url, { saved, failingCountries: ["EG", "GB"] });
  const badge = page.locator('[data-role="notices-badge"]');
  await badge.waitFor();
  assert.equal(await badge.textContent(), "2");
  const card = page.locator('[data-role="notices-card"]');
  assert.equal(await card.isHidden(), true);
  await page.locator('[data-action="toggleNotices"]').click();
  await card.waitFor();
  const text = (await card.textContent()) ?? "";
  assert.ok(text.includes("Egypt") && text.includes("United Kingdom"), text);
  const pins = page.locator('[data-role="pin"]');
  assert.equal(await pins.count(), 2);
  assert.ok(((await pins.first().textContent()) ?? "").includes("11:25 AM"));
  await page.keyboard.press("Escape");
  assert.equal(await card.isHidden(), true);
});

test("ui_hol_004_missing_region_listed_with_national_shown", async () => {
  const regional = { ...createPlace("place-1", "washington-dc"), region: "US-CA" };
  const saved = withPlaces([regional, createPlace("place-2", "london")]);
  const { page } = await openPage(browser, built.url, { saved });
  const badge = page.locator('[data-role="notices-badge"]');
  await badge.waitFor();
  assert.equal(await badge.textContent(), "1");
  await page.locator('[data-action="toggleNotices"]').click();
  const items = page.locator('[data-role="notice-item"]');
  assert.equal(await items.count(), 1);
  const placeName = await page.locator('[data-role="pin-name"]').first().textContent();
  const text = (await items.first().textContent()) ?? "";
  assert.ok(
    text.includes(placeName ?? "?") && /regional/i.test(text) && /national/i.test(text),
    text,
  );
});
