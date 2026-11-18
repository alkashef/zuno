// @ts-check
/** @module month-grid.test Headless-browser tests of the month-grid view in Chromium (CAL-001 to CAL-007, LAY-001, EX-007). */
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
 * @param {string[]} cityIds
 * @returns {Promise<Page>} The page opened with one invented place per country code, in order.
 */
async function openWith(cityIds) {
  const places = cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId));
  const { page } = await openPage(browser, built.url, {
    saved: { ...defaultSettings(540, 1020), places },
  });
  await page.locator('[data-role="grid-row"]').first().waitFor();
  return page;
}

/**
 * @param {Page} page
 * @param {number} rowIndex
 * @returns {import("playwright").Locator} The cells of one place's row.
 */
function cellsOf(page, rowIndex) {
  return page.locator('[data-role="grid-row"]').nth(rowIndex).locator('[data-role="cell"]');
}

/**
 * @param {import("playwright").Locator} cells
 * @param {string} kind A cell kind.
 * @returns {Promise<string[]>} The dates of the cells of that kind.
 */
function datesOfKind(cells, kind) {
  return cells.evaluateAll(
    (nodes, wanted) =>
      nodes
        .filter((node) => node.getAttribute("data-kind") === wanted)
        .map((node) => node.getAttribute("data-date") ?? ""),
    kind,
  );
}

/**
 * @param {Page} page
 * @param {string} token A colour token name without the `--color-` prefix.
 * @returns {Promise<string>} The computed `rgb(...)` of that token.
 */
function tokenColour(page, token) {
  return page.locator("body").evaluate((body, name) => {
    const probe = body.ownerDocument.createElement("div");
    probe.style.background = `var(--color-${name})`;
    body.append(probe);
    const colour = body.ownerDocument.defaultView?.getComputedStyle(probe).backgroundColor ?? "";
    probe.remove();
    return colour;
  }, token);
}

/**
 * @param {Page} page
 * @returns {Promise<void>} Shows December 2026, where the invented holiday (25 December) is.
 */
async function showDecember(page) {
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("heading", { name: "December 2026" }).waitFor();
}

test("ui_cal_001_grid_has_row_per_place_and_cell_per_day", async () => {
  const page = await openWith(["london", "washington-dc", "tokyo"]);
  assert.equal(await page.locator('[data-role="grid-row"]').count(), 3);
  assert.equal(await cellsOf(page, 0).count(), 30);
  assert.equal(await page.getByRole("heading", { name: "November 2026" }).count(), 1);
  await showDecember(page);
  assert.equal(await cellsOf(page, 2).count(), 31);
});

test("ui_cal_002_weekend_cells_marked", async () => {
  const page = await openWith(["riyadh", "london"]);
  assert.deepEqual(await datesOfKind(cellsOf(page, 0), "weekend"), [
    "2026-11-06",
    "2026-11-07",
    "2026-11-13",
    "2026-11-14",
    "2026-11-20",
    "2026-11-21",
    "2026-11-27",
    "2026-11-28",
  ]);
  const gb = await datesOfKind(cellsOf(page, 1), "weekend");
  assert.ok(gb.includes("2026-11-22") && !gb.includes("2026-11-20"));
  const colour = await cellsOf(page, 0)
    .locator("xpath=self::*[@data-kind='weekend']")
    .first()
    .evaluate((cell) => cell.ownerDocument.defaultView?.getComputedStyle(cell).backgroundColor);
  assert.equal(colour, await tokenColour(page, "weekend"));
});

test("ui_cal_003_holiday_cells_use_other_colour", async () => {
  const page = await openWith(["london"]);
  await showDecember(page);
  assert.deepEqual(await datesOfKind(cellsOf(page, 0), "holiday"), ["2026-12-25"]);
  const holiday = cellsOf(page, 0).nth(24);
  const colour = await holiday.evaluate(
    (cell) => cell.ownerDocument.defaultView?.getComputedStyle(cell).backgroundColor,
  );
  assert.equal(colour, await tokenColour(page, "holiday"));
  assert.notEqual(colour, await tokenColour(page, "weekend"));
});

test("ui_cal_004_today_column_highlighted", async () => {
  const page = await openWith(["london", "tokyo"]);
  for (const row of [0, 1]) {
    const today = await cellsOf(page, row).evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getAttribute("data-today") === "true")
        .map((node) => node.getAttribute("data-date")),
    );
    assert.deepEqual(today, ["2026-11-16"]);
  }
  const outline = await cellsOf(page, 0)
    .nth(15)
    .evaluate((cell) => cell.ownerDocument.defaultView?.getComputedStyle(cell).outlineColor);
  assert.equal(outline, await tokenColour(page, "today"));
});

test("ui_cal_005_previous_and_next_month_buttons", async () => {
  const page = await openWith(["london"]);
  await page.getByRole("button", { name: "Next month" }).click();
  assert.equal(await page.getByRole("heading", { name: "December 2026" }).count(), 1);
  await page.getByRole("button", { name: "Previous month" }).click();
  await page.getByRole("button", { name: "Previous month" }).click();
  assert.equal(await page.getByRole("heading", { name: "October 2026" }).count(), 1);
  assert.equal(await cellsOf(page, 0).count(), 31);
});

test("ui_cal_006_holiday_card_opens_and_closes", async () => {
  const page = await openWith(["london", "washington-dc"]);
  await showDecember(page);
  const card = page.getByRole("dialog", { name: "Holiday" });
  assert.equal(await card.count(), 0);
  await page.getByRole("button", { name: "Invented Day, 25-Dec-26" }).first().click();
  assert.equal(await card.count(), 1);
  assert.match((await card.textContent()) ?? "", /Invented Day/);
  assert.match((await card.textContent()) ?? "", /25-Dec-26/);
  const inFirstRow = await card.evaluate((node) => node.closest('[data-role="place"]') !== null);
  assert.equal(inFirstRow, true);
  await page.getByRole("button", { name: "Close holiday" }).click();
  assert.equal(await card.count(), 0);
});

test("ui_cal_007_weekend_holiday_cell_is_split", async () => {
  const page = await openWith(["cairo"]);
  await showDecember(page);
  assert.deepEqual(await datesOfKind(cellsOf(page, 0), "split"), ["2026-12-25"]);
  const image = await cellsOf(page, 0)
    .nth(24)
    .evaluate((cell) => cell.ownerDocument.defaultView?.getComputedStyle(cell).backgroundImage);
  assert.match(image ?? "", /linear-gradient/);
  assert.ok((image ?? "").includes(await tokenColour(page, "weekend")));
  assert.ok((image ?? "").includes(await tokenColour(page, "holiday")));
});

test("ui_lay_001_grid_rows_scroll_headers_stay_in_view", async () => {
  const page = await openWith([
    "london",
    "washington-dc",
    "tokyo",
    "riyadh",
    "berlin",
    "paris",
    "new-delhi",
    "brasilia",
    "canberra",
    "cairo",
    "bogota",
    "mexico-city",
  ]);
  await page.setViewportSize({ width: 1280, height: 500 });
  const scroller = page.locator('[data-role="grid-scroll"]');
  const sizes = await scroller.evaluate((el) => ({
    scroll: el.scrollHeight,
    client: el.clientHeight,
  }));
  assert.ok(sizes.scroll > sizes.client);
  await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  const box = await scroller.boundingBox();
  const head = await page.locator("th.month-grid-day").first().boundingBox();
  assert.ok(box !== null && head !== null);
  assert.ok(head.y >= box.y && head.y + head.height <= box.y + box.height);
});
