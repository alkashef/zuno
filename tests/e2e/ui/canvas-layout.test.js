// @ts-check
/** @module canvas-layout.test Headless-browser tests of the main page layout against the "Zuno UI" canvas in Chromium (MAP-001, PCK-001, PCK-002, CAL-001, LAY-001, DEC-020). */
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
    const margin = viewport.width - (picker.x + picker.width);
    assert.ok(Math.abs(margin) <= 1, `the picker card is flush to the page edge at ${size}`);
    assert.ok(Math.abs(map.x) <= 1, `the map is flush to the page edge at ${size}`);
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

/**
 * @param {Page} page
 * @param {string} selector
 * @param {string} property A camel-case computed style property.
 * @returns {Promise<string>} That property of the first element the selector matches.
 */
function styleOf(page, selector, property) {
  return page
    .locator(selector)
    .first()
    .evaluate((element, name) => {
      const view = /** @type {Window} */ (element.ownerDocument.defaultView);
      const style = /** @type {Record<string, string>} */ (
        /** @type {unknown} */ (view.getComputedStyle(element))
      );
      return style[name];
    }, property);
}

/** @returns {import("../../../src/domain/settings.js").Settings} Three places, Hijri on. */
function withHijri() {
  const places = ["tokyo", "cairo", "madrid"].map((code, index) =>
    createPlace(`place-${index + 1}`, code),
  );
  return { ...defaultSettings(540, 1020), places, showHijri: true };
}

test("ui_dec_020_picker_is_a_card_with_no_heading_and_the_date_sits_beside_the_time", async () => {
  const { page } = await openPage(browser, built.url, { saved: withHijri() });
  await page.setViewportSize(viewports[1]);
  await page.locator('[data-role="row"]').first().waitFor();
  assert.equal(await page.getByRole("heading", { name: "Meeting time" }).count(), 0);
  assert.equal(await page.getByRole("region", { name: "Meeting time" }).count(), 1);
  const [map] = await boxesOf(page, '[data-role="map"]');
  const [picker] = await boxesOf(page, '[data-role="picker"]');
  const [area] = await boxesOf(page, '[data-role="page"]');
  const padding = Number.parseFloat(await styleOf(page, '[data-role="page"]', "paddingRight"));
  for (const side of ["Top", "Right", "Bottom", "Left"]) {
    assert.equal(await styleOf(page, ".picker", `border${side}Width`), "1px", side);
  }
  assert.equal(padding, 0);
  assert.ok(Math.abs(picker.x + picker.width - viewports[1].width) <= 1);
  assert.ok(Math.abs(picker.x - (map.x + map.width)) <= 1, "no gap between the cards");
  assert.ok(Math.abs(area.y + area.height - (picker.y + picker.height)) <= 1, "page bottom");
  const [handle] = await boxesOf(page, '[data-role="resize"]');
  assert.ok(Math.abs(handle.x + handle.width / 2 - (picker.x + 0.5)) <= 1, "handle on the border");
  const [row] = await boxesOf(page, '[data-role="row"]');
  const [time] = await boxesOf(page, '[data-role="local-time"]');
  const [date] = await boxesOf(page, '[data-role="local-date"]');
  const [hijri] = await boxesOf(page, '[data-role="local-hijri"]');
  assert.ok(Math.abs(time.y + time.height / 2 - (date.y + date.height / 2)) <= 4, "same line");
  assert.ok(date.x >= time.x + time.width && date.x - (time.x + time.width) <= 12);
  assert.ok(hijri.y >= time.y + time.height - 1, "the Hijri date is below");
  assert.equal(await styleOf(page, '[data-role="local-time"]', "fontWeight"), "700");
  for (const property of ["fontSize", "color"]) {
    const sameAs = await styleOf(page, '[data-role="zone"]', property);
    assert.equal(await styleOf(page, '[data-role="local-date"]', property), sameAs, property);
  }
  assert.equal(await styleOf(page, '[data-role="row"]', "paddingTop"), "8px");
  assert.equal(await styleOf(page, '[data-role="row"]', "paddingBottom"), "8px");
  assert.equal(await styleOf(page, '[data-role="row"]', "paddingLeft"), "10px");
  const [band] = await boxesOf(page, ".picker-band");
  assert.equal(band.height, 28);
  const [info] = await boxesOf(page, '[data-role="info"]');
  assert.ok(Math.abs(band.y - (info.y + info.height) - 6) <= 1, "6 px between text and band");
  assert.ok(Math.abs(row.height - (1 + 8 + info.height + 6 + 28 + 8)) <= 1, "row height");
  const [who] = await boxesOf(page, '[data-role="who"]');
  const [mark] = await boxesOf(page, '[data-role="mark"]');
  assert.ok(Math.abs(info.height - Math.max(who.height, mark.height)) <= 1, "as tall as the text");
  const reference = await styleOf(page, '[data-role="row"]', "backgroundColor");
  const other = await styleOf(page, '[data-role="row"][data-reference="false"]', "backgroundColor");
  assert.notEqual(reference, other);
});

test("ui_dec_020_month_grid_weekday_sits_above_the_day_number", async () => {
  const { page } = await openPage(browser, built.url, { saved: withHijri() });
  await page.locator("th.month-grid-day").first().waitFor();
  const [weekday] = await boxesOf(page, ".month-grid-weekday");
  const [number] = await boxesOf(page, ".month-grid-day-number");
  assert.ok(weekday.y + weekday.height <= number.y + 1, "the weekday is above the number");
});

test("ui_dec_021_each_place_is_a_location_icon_with_its_tip_on_the_place", async () => {
  const page = await openSixPlaces(viewports[1]);
  const pins = await page.locator('[data-role="pin"]').evaluateAll((all) =>
    all.map((pin) => {
      const view = /** @type {Window} */ (pin.ownerDocument.defaultView);
      const point = pin.getBoundingClientRect();
      const icon = /** @type {SVGElement} */ (pin.querySelector(".map-pin-icon"));
      const box = icon.getBoundingClientRect();
      const rect = /** @type {HTMLElement} */ (
        pin.querySelector(".map-pin-label")
      ).getBoundingClientRect();
      const body = view.getComputedStyle(/** @type {Element} */ (icon.querySelector("path")));
      return {
        tip: { x: point.x, y: point.y },
        icon: { x: box.x, y: box.y, width: box.width, height: box.height },
        label: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        side: /** @type {HTMLElement} */ (pin).dataset.side ?? "",
        fill: body.fill,
        stroke: body.stroke,
        holes: icon.querySelectorAll("circle").length,
      };
    }),
  );
  const marker = await page.locator("body").evaluate((body) => {
    const probe = body.ownerDocument.createElement("span");
    probe.style.color = "var(--color-marker)";
    body.append(probe);
    const view = /** @type {Window} */ (body.ownerDocument.defaultView);
    const colour = view.getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  assert.equal(pins.length, 6);
  const wanted = { right: 18, left: 18, above: 28, below: 8 };
  for (const pin of pins) {
    assert.deepEqual([pin.icon.width, pin.icon.height], [24, 22]);
    assert.ok(Math.abs(pin.icon.x + 12 - pin.tip.x) <= 0.5, "the tip is on the place");
    assert.ok(Math.abs(pin.icon.y + 22 - pin.tip.y) <= 0.5, "the tip is on the place");
    assert.equal(pin.fill, marker);
    assert.equal(pin.stroke, "rgb(255, 255, 255)");
    assert.equal(pin.holes, 1);
    const offsets = {
      right: pin.label.x - pin.tip.x,
      left: pin.tip.x - (pin.label.x + pin.label.width),
      above: pin.tip.y - (pin.label.y + pin.label.height),
      below: pin.label.y - pin.tip.y,
    };
    const side = /** @type {keyof typeof wanted} */ (pin.side);
    assert.ok(Math.abs(offsets[side] - wanted[side]) <= 0.5, `${side}: ${offsets[side]}`);
  }
  for (const [index, pin] of pins.entries()) {
    const others = pins.filter((_, other) => other !== index).map((other) => other.icon);
    assert.ok(!others.some((icon) => overlaps(pin.label, icon)), "a label covers another icon");
    assert.ok(!overlaps(pin.label, pin.icon), "a label covers its own icon");
  }
});

test("ui_dec_020_cards_run_edge_to_edge_and_month_cells_are_32_px", async () => {
  const page = await openSixPlaces(viewports[0]);
  const [area] = await boxesOf(page, '[data-role="page"]');
  const [map] = await boxesOf(page, '[data-role="map"]');
  const [grid] = await boxesOf(page, '[data-role="month-grid"]');
  const [picker] = await boxesOf(page, '[data-role="picker"]');
  assert.ok(Math.abs(map.x) <= 1 && Math.abs(grid.x) <= 1, "left edge");
  assert.ok(Math.abs(picker.x + picker.width - viewports[0].width) <= 1, "right edge");
  assert.ok(Math.abs(picker.x - (map.x + map.width)) <= 1, "no gap before the picker");
  const bottom = area.y + area.height;
  assert.ok(Math.abs(grid.y + grid.height - bottom) <= 1, "the grid reaches the page bottom");
  assert.ok(Math.abs(picker.y + picker.height - bottom) <= 1, "the picker reaches the bottom");
  const [cell] = await boxesOf(page, '[data-role="cell"]');
  assert.ok(Math.abs(cell.height - 32) <= 0.5, `a cell is ${cell.height} px tall`);
  const header = await page.locator('[data-role="header"]').evaluate((element) => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    return [style?.paddingLeft, style?.paddingRight];
  });
  assert.deepEqual(header, ["32px", "32px"]);
});
