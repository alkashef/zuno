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

test("ui_cal_005_month_buttons_are_32_px_and_the_header_row_takes_40_px", async () => {
  const page = await openWith(["london"]);
  const earlier = await page.locator('[data-role="earlier"]').boundingBox();
  const later = await page.locator('[data-role="later"]').boundingBox();
  const header = page.locator(".month-grid-header");
  const box = await header.boundingBox();
  const margin = await header.evaluate((node) =>
    Number.parseFloat(node.ownerDocument.defaultView?.getComputedStyle(node).marginBottom ?? "-1"),
  );
  assert.deepEqual([earlier?.width, earlier?.height], [32, 32]);
  assert.deepEqual([later?.width, later?.height], [32, 32]);
  assert.equal((box?.height ?? 0) + margin, 40);
});

const winterBreak = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };

/**
 * @param {boolean} showHijri
 * @param {"light" | "dark"} [colorScheme]
 * @returns {Promise<Page>} December 2026 with a London place that has a vacation (21 to 31
 *   December) and a New York place with none, the settings record seeded.
 */
async function openVacation(showHijri, colorScheme = "light") {
  const london = {
    ...createPlace("place-1", "london"),
    vacations: [winterBreak],
  };
  const { page } = await openPage(browser, built.url, {
    colorScheme,
    saved: {
      ...defaultSettings(540, 1020),
      showHijri,
      places: [london, createPlace("place-2", "washington-dc")],
    },
  });
  await page.locator('[data-role="grid-row"]').first().waitFor();
  await showDecember(page);
  return page;
}

/**
 * @param {Page} page
 * @param {number} rowIndex
 * @param {number} dayIndex Zero-based index of the day in December.
 * @returns {Promise<{ fill: string, image: string, colour: string }>} The cell's `data-fill`,
 *   background image and background colour.
 */
function cellLook(page, rowIndex, dayIndex) {
  return cellsOf(page, rowIndex)
    .nth(dayIndex)
    .evaluate((cell) => {
      const style = /** @type {Window} */ (cell.ownerDocument.defaultView).getComputedStyle(cell);
      return {
        fill: cell.getAttribute("data-fill") ?? "",
        image: style.backgroundImage,
        colour: style.backgroundColor,
      };
    });
}

test("ui_vac_004_vacation_cells_have_their_own_colour_and_a_diagonal_split_on_a_holiday_or_weekend", async () => {
  const page = await openVacation(false);
  const vacation = await tokenColour(page, "vacation");
  assert.notEqual(vacation, await tokenColour(page, "weekend"));
  assert.notEqual(vacation, await tokenColour(page, "holiday"));
  const plain = await cellLook(page, 0, 20);
  assert.equal(plain.fill, "vacation");
  assert.equal(plain.colour, vacation);
  const christmas = await cellLook(page, 0, 24);
  assert.equal(christmas.fill, "vacation-holiday");
  assert.match(christmas.image, /linear-gradient/);
  assert.ok(christmas.image.includes(vacation));
  assert.ok(christmas.image.includes(await tokenColour(page, "holiday")));
  const saturday = await cellLook(page, 0, 25);
  assert.equal(saturday.fill, "vacation-weekend");
  assert.match(saturday.image, /linear-gradient/);
  assert.ok(saturday.image.includes(vacation));
  assert.ok(saturday.image.includes(await tokenColour(page, "weekend")));
  assert.equal((await cellLook(page, 0, 17)).fill, "plain");
  for (let day = 0; day < 31; day += 1) {
    assert.ok(!(await cellLook(page, 1, day)).fill.startsWith("vacation"), `New York ${day}`);
  }
});

test("ui_vac_004_the_hijri_day_on_a_vacation_cell_keeps_its_contrast_in_both_schemes", async () => {
  for (const colorScheme of /** @type {const} */ (["light", "dark"])) {
    const page = await openVacation(true, colorScheme);
    const probe = await cellsOf(page, 0)
      .nth(20)
      .evaluate((cell) => {
        const win = /** @type {Window} */ (cell.ownerDocument.defaultView);
        const text = win.getComputedStyle(
          /** @type {Element} */ (cell.querySelector('[data-role="hijri-day"]')),
        ).color;
        return { text, back: win.getComputedStyle(cell).backgroundColor };
      });
    /** @param {string} rgb @returns {number} The relative luminance. */
    const luminance = (rgb) => {
      const [red = 0, green = 0, blue = 0] = (rgb.match(/\d+/g) ?? []).map(Number);
      const linear = [red, green, blue].map((value) => {
        const unit = value / 255;
        return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const [high, low] = [luminance(probe.text), luminance(probe.back)].sort((a, b) => b - a);
    const ratio = (high + 0.05) / (low + 0.05);
    assert.ok(ratio >= 4.5, `${colorScheme}: Hijri day on vacation ${ratio.toFixed(2)}:1`);
  }
});

test("ui_vac_006_a_saved_vacation_shows_after_a_reload", async () => {
  const page = await openVacation(false);
  assert.equal((await cellLook(page, 0, 22)).fill, "vacation");
  await page.reload();
  await page.locator('[data-role="grid-row"]').first().waitFor();
  await showDecember(page);
  assert.equal((await cellLook(page, 0, 22)).fill, "vacation");
  assert.equal((await cellLook(page, 1, 22)).fill, "plain");
});
