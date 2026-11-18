// @ts-check
/** @module canvas-layout.test Headless-browser tests of the main page layout against the "Zuno UI" canvas in Chromium (MAP-001, PCK-001, PCK-002, CAL-001, LAY-001). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

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

/** The two window sizes checked: a common laptop and a large desktop screen. */
const viewports = Object.freeze([
  { width: 1280, height: 720 },
  { width: 1870, height: 990 },
]);

/**
 * @param {{ width: number, height: number }} viewport
 * @returns {Promise<Page>} The page with six invented places, four of them close together on the
 *   map (Cairo, Riyadh, Islamabad, New Delhi), at that window size.
 */
async function openSixPlaces(viewport) {
  const chicago = { ...createPlace("place-1", "chicago"), label: "Jesse" };
  const others = ["cairo", "islamabad", "new-delhi", "tokyo", "riyadh"].map((code, index) =>
    createPlace(`place-${index + 2}`, code),
  );
  const saved = { ...defaultSettings(540, 1020), places: [chicago, ...others] };
  const { page } = await openPage(browser, built.url, { saved });
  await page.setViewportSize(viewport);
  await page.locator('[data-role="pin"]').first().waitFor();
  await page.locator('[data-role="row"]').first().waitFor();
  return page;
}

/**
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<Box[]>} The boxes of every element the selector matches.
 */
function boxesOf(page, selector) {
  return page.locator(selector).evaluateAll((all) =>
    all.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
}

/**
 * @param {Box} a
 * @param {Box} b
 * @returns {boolean} Whether the two boxes share any area.
 */
function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/**
 * @param {Box[]} boxes
 * @returns {string[]} The index pairs of the boxes that overlap.
 */
function overlappingPairs(boxes) {
  return boxes.flatMap((a, i) =>
    boxes.slice(i + 1).flatMap((b, offset) => (overlaps(a, b) ? [`${i}-${i + 1 + offset}`] : [])),
  );
}

test("ui_map_001_map_and_month_grid_share_the_left_column_without_a_gap", async () => {
  for (const viewport of viewports) {
    const page = await openSixPlaces(viewport);
    const [map] = await boxesOf(page, '[data-role="map"]');
    const [grid] = await boxesOf(page, '[data-role="month-grid"]');
    const [picker] = await boxesOf(page, '[data-role="picker"]');
    const [header] = await boxesOf(page, '[data-role="header"]');
    const size = `${viewport.width}x${viewport.height}`;
    assert.ok(Math.abs(map.y + map.height - grid.y) <= 1, `map meets the month grid at ${size}`);
    assert.ok(Math.abs(map.x - grid.x) <= 1 && Math.abs(map.width - grid.width) <= 1, size);
    assert.ok(Math.abs(picker.x + picker.width - viewport.width) <= 1, `picker at right ${size}`);
    assert.ok(Math.abs(picker.y - (header.y + header.height)) <= 1, `picker under header ${size}`);
    assert.ok(Math.abs(map.y - picker.y) <= 1, `map starts level with the picker at ${size}`);
    assert.ok(grid.y + grid.height >= picker.y + picker.height - 1, `no gap under grid ${size}`);
  }
});

test("ui_map_001_pin_labels_do_not_overlap_and_stay_on_the_map", async () => {
  for (const viewport of viewports) {
    const page = await openSixPlaces(viewport);
    const labels = await boxesOf(page, ".map-pin-label");
    const [view] = await boxesOf(page, ".map-view");
    const size = `${viewport.width}x${viewport.height}`;
    assert.equal(labels.length, 6);
    assert.deepEqual(overlappingPairs(labels), [], `labels overlap at ${size}`);
    for (const label of labels) {
      assert.ok(label.x >= view.x - 1 && label.x + label.width <= view.x + view.width + 1, size);
      assert.ok(label.y >= view.y - 1 && label.y + label.height <= view.y + view.height + 1, size);
    }
  }
});

test("ui_pck_001_axis_labels_do_not_overlap", async () => {
  for (const viewport of viewports) {
    const page = await openSixPlaces(viewport);
    const ticks = await boxesOf(page, '[data-role="tick"]');
    const [axis] = await boxesOf(page, '[data-role="axis"]');
    assert.equal(ticks.length, 5);
    assert.deepEqual(overlappingPairs(ticks), [], `${viewport.width}x${viewport.height}`);
    assert.ok(Math.abs(ticks[0].x - axis.x) <= 1);
    assert.ok(Math.abs(ticks[4].x + ticks[4].width - (axis.x + axis.width)) <= 1);
  }
});

test("ui_pck_002_marker_time_sits_beside_the_marker_clear_of_the_name", async () => {
  const page = await openSixPlaces(viewports[0]);
  const [axis] = await boxesOf(page, '[data-role="axis"]');
  for (const fraction of [0.02, 0.3, 0.5, 2 / 3, 0.85, 0.98]) {
    await page.mouse.click(axis.x + axis.width * fraction, axis.y + axis.height / 2);
    const [line] = await boxesOf(page, ".picker-line");
    const names = await boxesOf(page, '[data-role="who"]');
    const marks = await boxesOf(page, '[data-role="mark"]');
    assert.equal(names.length, 6);
    assert.equal(marks.length, 6);
    names.forEach((name, index) => {
      const mark = marks[index];
      assert.ok(!overlaps(name, mark), `row ${index}: name and time overlap`);
      assert.ok(!overlaps(mark, line), `row ${index}: the time crosses the marker line`);
      assert.ok(!overlaps(name, line), `row ${index}: the name crosses the marker line`);
    });
  }
});

test("ui_cal_001_month_grid_fills_its_card", async () => {
  const page = await openSixPlaces(viewports[1]);
  const [table] = await boxesOf(page, ".month-grid-table");
  const width = await page
    .locator('[data-role="grid-scroll"]')
    .evaluate((element) => element.clientWidth);
  const padding = await page.locator('[data-role="grid-scroll"]').evaluate((element) => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    return (
      Number.parseFloat(style?.paddingLeft ?? "0") + Number.parseFloat(style?.paddingRight ?? "0")
    );
  });
  assert.ok(Math.abs(table.width - (width - padding)) <= 1, `${table.width} vs ${width - padding}`);
});
