// @ts-check
/** @module picker-resize-hover.test Headless-browser tests of the picker's resize handle and its hover time in Chromium (LAY-002, LAY-003, PCK-008, EX-019, EX-021). */
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

const handleName = "Change the width of the meeting-time picker";

/**
 * @param {string[]} cityIds The first is the reference place.
 * @returns {Promise<Page>} The page opened on 2026-11-20 with one place per city, in order.
 */
async function openOnNov20(cityIds) {
  const places = cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId));
  const { page } = await openPage(browser, built.url, {
    saved: { ...defaultSettings(540, 1020), places },
  });
  await page.locator('[data-role="row"]').first().waitFor();
  for (let day = 16; day < 20; day += 1) {
    await page.getByRole("button", { name: "Next day" }).click();
  }
  return page;
}

/**
 * @param {Page} page
 * @param {number} index The row.
 * @returns {Promise<{ x: number, y: number, width: number, height: number }>} The row's band.
 */
async function bandOf(page, index) {
  const box = await page.locator('[data-role="track"]').nth(index).boundingBox();
  assert.ok(box !== null);
  return box;
}

/**
 * @param {Page} page
 * @param {number} hours The number of hour slots the first row's band should show.
 * @param {number} slot The width of one slot.
 * @returns {Promise<void>} Waits until the band is that many slots wide.
 */
async function expectSlots(page, hours, slot) {
  const band = await bandOf(page, 0);
  assert.ok(Math.abs(band.width / slot - hours) < 0.1, `${band.width / slot} slots, not ${hours}`);
}

/**
 * Drags the resize handle by a number of pixels (negative: left).
 * @param {Page} page
 * @param {number} dx
 * @returns {Promise<void>}
 */
async function dragHandle(page, dx) {
  const box = await page.getByRole("button", { name: handleName }).boundingBox();
  assert.ok(box !== null);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 6 });
  await page.mouse.up();
}

test("test_lay_002_dragging_the_left_edge_adds_and_removes_hour_slots", async () => {
  const page = await openOnNov20(["tokyo", "london"]);
  const slot = (await bandOf(page, 0)).width / config.pickerMinHours;
  await dragHandle(page, -6 * slot);
  await expectSlots(page, 30, slot);
  assert.equal(await page.locator('[data-role="date"]').textContent(), "20–21-Nov-26");
  await page.reload();
  await page.locator('[data-role="row"]').first().waitFor();
  await expectSlots(page, 30, slot);
  await dragHandle(page, 4 * slot);
  await expectSlots(page, 26, slot);
  await dragHandle(page, 20 * slot);
  await expectSlots(page, config.pickerMinHours, slot);
  await dragHandle(page, -40 * slot);
  const widest = (await bandOf(page, 0)).width / slot;
  assert.ok(widest <= config.pickerMaxHours + 0.1, `${widest} slots`);
  const map = await page.locator('[data-role="page"] > .map').boundingBox();
  assert.ok(map !== null && map.width >= 320 - 1, `the map is ${map?.width} px wide`);
});

test("test_lay_002_arrow_keys_on_the_handle_change_the_width_by_one_slot", async () => {
  const page = await openOnNov20(["tokyo", "london"]);
  const slot = (await bandOf(page, 0)).width / config.pickerMinHours;
  const handle = page.getByRole("button", { name: handleName });
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await expectSlots(page, 25, slot);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expectSlots(page, config.pickerMinHours, slot);
});

test("test_lay_002_the_handle_is_hidden_in_the_one_column_layout", async () => {
  const page = await openOnNov20(["tokyo"]);
  assert.equal(await page.getByRole("button", { name: handleName }).isVisible(), true);
  await page.setViewportSize({ width: 800, height: 900 });
  assert.equal(await page.getByRole("button", { name: handleName }).isVisible(), false);
});

/**
 * @param {Page} page
 * @param {number} index The row.
 * @param {number} fraction Where on the band, 0 to 1.
 * @returns {Promise<void>} Moves the pointer there.
 */
async function pointAt(page, index, fraction) {
  const band = await bandOf(page, index);
  await page.mouse.move(band.x + band.width * fraction, band.y + band.height / 2);
}

const label = '[data-role="hover"]:not([hidden])';

test("test_pck_008_pointer_over_a_row_shows_that_places_local_time_and_date", async () => {
  const page = await openOnNov20(["tokyo", "bogota"]);
  await pointAt(page, 1, 10 / 24);
  assert.equal(await page.locator(label).textContent(), "8:00 PM · 19-Nov-26");
  await pointAt(page, 0, 10 / 24);
  assert.equal(await page.locator(label).textContent(), "10:00 AM · 20-Nov-26");
});

test("test_pck_008_the_label_goes_when_the_pointer_leaves", async () => {
  const page = await openOnNov20(["tokyo", "bogota"]);
  await pointAt(page, 1, 0.5);
  assert.equal(await page.locator(label).count(), 1);
  await page.mouse.move(2, 2);
  assert.equal(await page.locator(label).count(), 0);
});

test("test_pck_008_the_label_stays_inside_the_panel_at_both_ends", async () => {
  const page = await openOnNov20(["tokyo", "bogota"]);
  const band = await bandOf(page, 1);
  for (const fraction of [0.001, 0.999]) {
    await pointAt(page, 1, fraction);
    const box = await page.locator(label).boundingBox();
    assert.ok(box !== null);
    assert.ok(box.x >= band.x - 0.5 && box.x + box.width <= band.x + band.width + 0.5);
    assert.ok(box.y + box.height <= band.y + 0.5, "the label sits above the band");
  }
});

test("test_lay_002_the_panel_stops_widening_when_the_map_would_get_too_narrow", async () => {
  const page = await openOnNov20(["tokyo", "london"]);
  await page.setViewportSize({ width: 1000, height: 800 });
  const handle = page.getByRole("button", { name: handleName });
  await handle.focus();
  for (let press = 0; press < 30; press += 1) await page.keyboard.press("ArrowLeft");
  const map = await page.locator('[data-role="page"] > .map').boundingBox();
  assert.ok(map !== null);
  assert.ok(map.width >= 319 && map.width < 320 + 17.5 + 1, `the map is ${map.width} px wide`);
});
