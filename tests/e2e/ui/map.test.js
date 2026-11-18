// @ts-check
/** @module map.test Headless-browser tests of the world map in Chromium (MAP-001, CLK-001, CLK-003). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
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
 * @param {boolean} [showCountry]
 * @returns {import("../../../src/domain/settings.js").Settings} Settings with a Saudi and a British place.
 */
function twoPlaces(showCountry = false) {
  const labelled = { ...createPlace("place-1", "riyadh"), label: "Riyadh HQ" };
  return {
    ...defaultSettings(540, 1020),
    places: [labelled, createPlace("place-2", "london")],
    showCountry,
  };
}

test("ui_map_001_pin_per_place_with_name_time_and_date", async () => {
  const { page } = await openPage(browser, built.url, { saved: twoPlaces() });
  const pins = page.locator('[data-role="pin"]');
  await pins.first().waitFor();
  assert.equal(await pins.count(), 2);
  assert.equal(await pins.nth(0).locator('[data-role="pin-name"]').textContent(), "Riyadh HQ");
  assert.equal(await pins.nth(1).locator('[data-role="pin-name"]').textContent(), "London");
  const first = (await pins.nth(0).textContent()) ?? "";
  assert.ok(first.includes("12:25 PM") && first.includes("16-Nov-26"), first);

  const withCountry = await openPage(browser, built.url, { saved: twoPlaces(true) });
  const name = withCountry.page.locator('[data-role="pin"] [data-role="pin-name"]');
  await name.first().waitFor();
  assert.equal(await name.nth(1).textContent(), "London, United Kingdom");
  const empty = await openPage(browser, built.url, {
    saved: { ...defaultSettings(540, 1020), places: [] },
  });
  assert.equal(await empty.page.locator('[data-role="map"]').count(), 0);
});

test("ui_clk_001_pin_shows_current_local_time_and_date", async () => {
  const { page } = await openPage(browser, built.url, { saved: twoPlaces() });
  const pin = page.locator('[data-role="pin"]').nth(1);
  await pin.waitFor();
  assert.equal(await pin.locator('[data-role="pin-time"]').textContent(), "9:25 AM");
  assert.equal(await pin.locator('[data-role="pin-date"]').textContent(), "16-Nov-26");
});

test("ui_clk_003_pin_time_updates_each_tick", async () => {
  const { page } = await openPage(browser, built.url, { saved: twoPlaces() });
  const time = page.locator('[data-role="pin"]').nth(1).locator('[data-role="pin-time"]');
  await time.waitFor();
  await page.clock.setFixedTime(new Date("2026-11-16T09:26:00Z"));
  await page.clock.runFor(config.clockTickMs);
  assert.equal(await time.textContent(), "9:26 AM");
});

test("ui_map_001_outline_is_drawn_and_pins_stay_on_their_places", async () => {
  const { page, requestUrls } = await openPage(browser, built.url, { saved: twoPlaces() });
  const pins = page.locator('[data-role="pin"]');
  await pins.first().waitFor();
  const land = page.locator("path.map-land");
  assert.equal(await land.count(), 1);
  const outline = (await land.getAttribute("d")) ?? "";
  assert.ok(outline.length > 20000, "the outline is the real coastline, not a sketch");
  const box = await land.evaluate((element) => {
    const { x, y, width, height } = /** @type {SVGGraphicsElement} */ (element).getBBox();
    return { left: x, top: y, right: x + width, bottom: y + height };
  });
  assert.ok(box.left < 5 && box.right > 715, "the land spans the whole grid");
  assert.ok(box.top < 60 && box.bottom > 290, "the land reaches the view's top and bottom");
  const view = await page.locator('[data-role="map-view"]').boundingBox();
  const tip = await pins.nth(0).locator(".map-pin-icon").boundingBox();
  assert.ok(view && tip);
  const riyadh = { x: (46.68 + 180) / 360, y: (90 - 24.71) / 180 };
  const world = { width: view.width, height: view.height * (360 / 276) };
  const top = view.y - world.height * (20 / 360);
  assert.ok(Math.abs(tip.x + tip.width / 2 - (view.x + riyadh.x * world.width)) < 2);
  assert.ok(Math.abs(tip.y + tip.height - (top + riyadh.y * world.height)) < 2);
  assert.deepEqual(
    requestUrls.filter(
      (url) =>
        !url.startsWith("file:") &&
        !url.startsWith("data:") &&
        !url.startsWith(config.holidayServiceBaseUrl),
    ),
    [],
  );
});
