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

test("ui_leg_001_legend_names_every_colour", async () => {
  const saved = withPlaces([createPlace("place-1", "riyadh"), createPlace("place-2", "london")]);
  const { page } = await openPage(browser, built.url, { saved });
  const legend = page.locator('[data-role="legend"]');
  await legend.waitFor();
  const names = await legend.locator('[data-role="legend-name"]').allTextContents();
  assert.deepEqual(names, [
    "Working hours (picker)",
    "Non-working hours (picker)",
    "Day off: weekend or holiday (picker)",
    "Weekend (month view)",
    "Public holiday (month view)",
    "Weekend and holiday (month view)",
    "Today (month view)",
  ]);
  const swatches = await legend.locator('[data-role="legend-swatch"]').evaluateAll((all) =>
    all.map((swatch) => {
      const style = swatch.ownerDocument.defaultView?.getComputedStyle(swatch);
      return {
        colour: style?.backgroundColor,
        image: style?.backgroundImage,
        ring: style?.outlineStyle,
      };
    }),
  );
  const colours = swatches.slice(0, 5).map((swatch) => swatch.colour);
  assert.equal(new Set(colours).size, 5, colours.join(" | "));
  assert.match(swatches[5].image ?? "", /linear-gradient/);
  assert.equal(swatches[6].ring, "solid");
  const box = await legend.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box !== null && viewport !== null);
  assert.equal(Math.round(box.x), 0);
  assert.equal(Math.round(box.width), viewport.width);
  assert.equal(Math.round(box.y + box.height), viewport.height);
});

test("ui_ref_002_failed_service_lists_countries_with_no_data_and_keeps_times", async () => {
  const saved = withPlaces([createPlace("place-1", "riyadh"), createPlace("place-2", "london")]);
  const { page } = await openPage(browser, built.url, { saved, failingCountries: ["SA", "GB"] });
  const badge = page.locator('[data-role="notices-badge"]');
  await badge.waitFor();
  assert.equal(await badge.textContent(), "2");
  const card = page.locator('[data-role="notices-card"]');
  assert.equal(await card.isHidden(), true);
  await page.locator('[data-action="toggleNotices"]').click();
  await card.waitFor();
  const text = (await card.textContent()) ?? "";
  assert.ok(text.includes("Saudi Arabia") && text.includes("United Kingdom"), text);
  const pins = page.locator('[data-role="pin"]');
  assert.equal(await pins.count(), 2);
  assert.ok(((await pins.first().textContent()) ?? "").includes("12:25 PM"));
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
