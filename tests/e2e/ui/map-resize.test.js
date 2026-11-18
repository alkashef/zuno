// @ts-check
/** @module map-resize.test Headless-browser tests of the handle on the border between the map and the month grid in Chromium (LAY-004, LAY-005, DEC-028). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

/** @typedef {import("./page-fixture.js").PageBuild} PageBuild */
/** @typedef {import("./page-fixture.js").Browser} Browser */
/** @typedef {import("./page-fixture.js").Page} Page */
/** @typedef {{ x: number, y: number, width: number, height: number }} Box */

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

const handleName = "Change the height of the map";

/** @returns {Promise<Page>} The page with three invented places at 1280 by 900. */
async function openThreePlaces() {
  const places = ["tokyo", "cairo", "madrid"].map((cityId, index) =>
    createPlace(`place-${index + 1}`, cityId),
  );
  const { page } = await openPage(browser, built.url, {
    saved: { ...defaultSettings(540, 1020), places },
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('[data-role="pin"]').first().waitFor();
  await page.locator('[data-role="grid-row"]').first().waitFor();
  return page;
}

/**
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<Box>} The box of the first element the selector matches.
 */
async function boxOf(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  assert.ok(box !== null, `${selector} is shown`);
  return box;
}

/**
 * Drags the border handle by a number of pixels (negative: up).
 * @param {Page} page
 * @param {number} dy
 * @returns {Promise<void>}
 */
async function dragBorder(page, dy) {
  const box = await boxOf(page, `[aria-label="${handleName}"]`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 8 });
  await page.mouse.up();
}

/**
 * @param {Page} page
 * @returns {Promise<{ map: Box, grid: Box, picker: Box }>} The three cards.
 */
async function cardsOf(page) {
  return {
    map: await boxOf(page, '[data-role="map"]'),
    grid: await boxOf(page, '[data-role="month-grid"]'),
    picker: await boxOf(page, '[data-role="picker"]'),
  };
}

test("test_lay_004_dragging_the_border_resizes_the_map_and_the_grid_takes_the_rest", async () => {
  const page = await openThreePlaces();
  const before = await cardsOf(page);
  const handle = await boxOf(page, `[aria-label="${handleName}"]`);
  const border = before.map.y + before.map.height;
  assert.ok(Math.abs(handle.y + handle.height / 2 - border) <= 1, "the handle is on the border");
  await dragBorder(page, -80);
  const after = await cardsOf(page);
  assert.ok(Math.abs(after.map.height - (before.map.height - 80)) <= 1, `${after.map.height}`);
  assert.ok(Math.abs(after.map.y + after.map.height - after.grid.y) <= 1, "the cards still meet");
  const bottom = after.picker.y + after.picker.height;
  assert.ok(Math.abs(after.grid.y + after.grid.height - bottom) <= 1, "the grid takes the rest");
  assert.ok(after.grid.height > before.grid.height + 70, `${after.grid.height}`);
  await dragBorder(page, -2000);
  const lowest = await cardsOf(page);
  assert.ok(Math.abs(lowest.map.height - config.mapMinHeight) <= 1, `${lowest.map.height}`);
});

test("test_lay_004_arrow_keys_on_the_border_move_it", async () => {
  const page = await openThreePlaces();
  const before = (await cardsOf(page)).map.height;
  await page.getByRole("button", { name: handleName }).focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  const raised = (await cardsOf(page)).map.height;
  assert.ok(Math.abs(raised - (before - 2 * config.mapHeightStepPx)) <= 1, `${raised}`);
  await page.keyboard.press("ArrowDown");
  const lowered = (await cardsOf(page)).map.height;
  assert.ok(Math.abs(lowered - (raised + config.mapHeightStepPx)) <= 1, `${lowered}`);
});

test("test_lay_005_the_map_height_comes_back_after_a_reload", async () => {
  const page = await openThreePlaces();
  const before = (await cardsOf(page)).map.height;
  await dragBorder(page, -60);
  const moved = (await cardsOf(page)).map.height;
  assert.ok(Math.abs(moved - (before - 60)) <= 1, `${moved}`);
  await page.reload();
  await page.locator('[data-role="grid-row"]').first().waitFor();
  const restored = (await cardsOf(page)).map.height;
  assert.ok(Math.abs(restored - moved) <= 1, `${restored} after the reload, not ${moved}`);
});
