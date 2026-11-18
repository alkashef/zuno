// @ts-check
/** @module picker.test Headless-browser tests of the picker view and its day selector in Chromium (PCK-001 to PCK-007, PCK-009, LAY-001, DSP-001, DSP-002, EX-003, EX-019). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace, placeName } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { buildToScratch, launchBrowser, openPage, startInstant } from "./page-fixture.js";

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
  await page.locator('[data-role="row"]').first().waitFor();
  return page;
}

/**
 * @param {Page} page
 * @returns {import("playwright").Locator} The marker handle.
 */
function handleOf(page) {
  return page.getByRole("slider", { name: "Chosen time" });
}

/**
 * @param {Page} page
 * @returns {Promise<number>} The marker's instant, UTC milliseconds.
 */
async function markerInstant(page) {
  return Number(await handleOf(page).getAttribute("aria-valuenow"));
}

/**
 * @param {Page} page
 * @returns {Promise<{ name: string, date: string, time: string }[]>} What each row shows on top.
 */
function rowFacts(page) {
  return page.locator('[data-role="row"]').evaluateAll((rows) =>
    rows.map((row) => {
      const text = (/** @type {string} */ role) =>
        row.querySelector(`[data-role="${role}"]`)?.textContent ?? "";
      return { name: text("name"), date: text("local-date"), time: text("local-time") };
    }),
  );
}

/**
 * Drags the marker with the mouse to a fraction of the axis width.
 * @param {Page} page
 * @param {number} fraction 0 to 1.
 * @returns {Promise<void>}
 */
async function dragMarkerTo(page, fraction) {
  const box = await page.locator('[data-role="axis"]').boundingBox();
  assert.ok(box !== null);
  const handle = await handleOf(page).boundingBox();
  assert.ok(handle !== null);
  const y = box.y + box.height / 2;
  await page.mouse.move(handle.x + handle.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * fraction, y, { steps: 4 });
  await page.mouse.up();
}

/**
 * @param {Page} page
 * @param {number} rowIndex
 * @returns {Promise<{ kind: string, colour: string } | null>} The kind and background colour of the
 *   stretch of the row that lies under the marker.
 */
function segmentUnderMarker(page, rowIndex) {
  return page.locator("body").evaluate((body, index) => {
    const doc = body.ownerDocument;
    const handle = doc.querySelector('[data-role="handle"]')?.getBoundingClientRect();
    const row = doc.querySelectorAll('[data-role="row"]')[index];
    if (handle === undefined || row === undefined) return null;
    const x = handle.left + handle.width / 2;
    const hit = [...row.querySelectorAll('[data-role="segment"]')].find((segment) => {
      const box = segment.getBoundingClientRect();
      return box.left <= x && x < box.right;
    });
    if (hit === undefined) return null;
    const colour = doc.defaultView?.getComputedStyle(hit).backgroundColor ?? "";
    return { kind: hit.getAttribute("data-kind") ?? "", colour };
  }, rowIndex);
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
 * @param {import("playwright").Locator} element
 * @returns {Promise<boolean>} Whether the element has the keyboard focus.
 */
function hasFocus(element) {
  return element.evaluate((node) => node.ownerDocument.activeElement === node);
}

test("ui_pck_001_one_row_per_place", async () => {
  const codes = ["london", "washington-dc", "tokyo"];
  const page = await openWith(codes);
  const facts = await rowFacts(page);
  const expected = codes.map((code) => placeName(createPlace("x", code), false));
  assert.deepEqual(
    facts.map((row) => row.name),
    expected,
  );
  assert.equal(await handleOf(page).count(), 1);
});

test("ui_pck_002_moving_marker_updates_row_times_ex_003", async () => {
  const page = await openWith(["london", "washington-dc", "tokyo"]);
  await dragMarkerTo(page, 15 / 24);
  assert.deepEqual(
    (await rowFacts(page)).map(({ date, time }) => [date, time]),
    [
      ["16-Nov-26", "3:00 PM"],
      ["16-Nov-26", "10:00 AM"],
      ["17-Nov-26", "12:00 AM"],
    ],
  );
});

test("ui_pck_002_arrow_keys_move_the_marker_one_step", async () => {
  const page = await openWith(["london"]);
  const stepMs = config.pickerStepMinutes * 60 * 1000;
  const next = (Math.floor(startInstant.getTime() / stepMs) + 1) * stepMs;
  await handleOf(page).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await markerInstant(page), next);
  assert.equal(await hasFocus(handleOf(page)), true);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await markerInstant(page), next - 2 * stepMs);
});

test("ui_pck_003_row_colours_working_and_non_working", async () => {
  const page = await openWith(["london", "washington-dc"]);
  const working = await segmentUnderMarker(page, 0);
  const nonWorking = await segmentUnderMarker(page, 1);
  assert.deepEqual(working, { kind: "working", colour: await tokenColour(page, "working") });
  assert.deepEqual(nonWorking, {
    kind: "nonWorking",
    colour: await tokenColour(page, "non-working"),
  });
});

test("ui_pck_004_marker_starts_at_now", async () => {
  const page = await openWith(["london"]);
  assert.equal(await markerInstant(page), startInstant.getTime());
  const [row] = await rowFacts(page);
  assert.deepEqual([row.date, row.time], ["16-Nov-26", "9:25 AM"]);
});

test("ui_pck_005_day_off_colour", async () => {
  const page = await openWith(["london", "riyadh"]);
  for (let day = 0; day < 4; day += 1) {
    await page.getByRole("button", { name: "Next day" }).click();
  }
  const dayOff = await segmentUnderMarker(page, 1);
  assert.deepEqual(dayOff, { kind: "dayOff", colour: await tokenColour(page, "day-off") });
  const working = await segmentUnderMarker(page, 0);
  assert.equal(working?.kind, "working");
  assert.notEqual(working?.colour, dayOff?.colour);
});

test("ui_pck_006_first_place_is_reference", async () => {
  const page = await openWith(["tokyo", "london"]);
  const rows = page.locator('[data-role="row"]');
  assert.equal(await rows.nth(0).getAttribute("data-reference"), "true");
  assert.equal(await rows.nth(1).getAttribute("data-reference"), "false");
  const reference = await rows
    .nth(0)
    .locator('[data-role="info"]')
    .evaluate((info) => info.ownerDocument.defaultView?.getComputedStyle(info).backgroundColor);
  assert.equal(reference, await tokenColour(page, "reference"));
  const handle = handleOf(page);
  assert.equal(Number(await handle.getAttribute("aria-valuemin")), Date.UTC(2026, 10, 15, 15, 0));
  assert.equal(Number(await handle.getAttribute("aria-valuemax")), Date.UTC(2026, 10, 16, 15, 0));
  assert.equal(await page.locator('[data-role="tick"]').first().textContent(), "12:00 AM");
});

test("ui_pck_007_previous_next_and_calendar_day_keep_time", async () => {
  const page = await openWith(["london"]);
  const date = page.locator('[data-role="date"]');
  const time = startInstant.getTime() % (24 * 60 * 60 * 1000);
  await page.getByRole("button", { name: "Next day" }).click();
  assert.equal(await date.textContent(), "17-Nov-26");
  assert.equal(await markerInstant(page), Date.UTC(2026, 10, 17) + time);
  await page.getByRole("button", { name: "Previous day" }).click();
  await page.getByRole("button", { name: "Previous day" }).click();
  assert.equal(await date.textContent(), "15-Nov-26");
  await date.click();
  const calendar = page.getByRole("dialog", { name: "Choose a day" });
  assert.equal(await calendar.getByRole("heading").textContent(), "November 2026");
  await calendar.getByRole("button", { name: "25-Nov-26" }).click();
  assert.equal(await date.textContent(), "25-Nov-26");
  assert.equal(await markerInstant(page), Date.UTC(2026, 10, 25) + time);
  assert.equal(await calendar.count(), 0);
});

test("ui_pck_007_calendar_closes_on_escape_and_returns_focus", async () => {
  const page = await openWith(["london"]);
  const date = page.locator('[data-role="date"]');
  await date.click();
  await page.getByRole("dialog", { name: "Choose a day" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog", { name: "Choose a day" }).count(), 0);
  assert.equal(await hasFocus(date), true);
});

test("ui_lay_001_picker_rows_scroll_axis_stays_in_view", async () => {
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
  const scroller = page.locator('[data-role="scroll"]');
  const sizes = await scroller.evaluate((element) => ({
    scroll: element.scrollHeight,
    client: element.clientHeight,
  }));
  assert.ok(sizes.scroll > sizes.client);
  await scroller.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  const axis = await page.locator('[data-role="axis"]').boundingBox();
  const last = await page.locator('[data-role="row"]').last().boundingBox();
  const viewport = page.viewportSize();
  assert.ok(axis !== null && last !== null && viewport !== null);
  assert.ok(axis.y >= 0 && axis.y + axis.height <= viewport.height);
  assert.ok(last.y + last.height <= viewport.height);
});

/**
 * @param {number} hours The saved number of hour slots.
 * @returns {Promise<{ slot: number, ticks: number, date: string }>} The width of one hour slot of
 *   the first row's band, the number of axis labels and the day selector's date text.
 */
async function slotsAt(hours) {
  const places = ["london", "tokyo"].map((cityId, index) =>
    createPlace(`place-${index + 1}`, cityId),
  );
  const { page } = await openPage(browser, built.url, {
    saved: { ...defaultSettings(540, 1020), places, pickerHours: hours },
  });
  await page.locator('[data-role="row"]').first().waitFor();
  const track = await page.locator('[data-role="track"]').first().boundingBox();
  assert.ok(track !== null);
  return {
    slot: track.width / hours,
    ticks: await page.locator('[data-role="tick"]').count(),
    date: (await page.locator('[data-role="date"]').textContent()) ?? "",
  };
}

test("test_pck_006_hour_slots_keep_one_width_at_24_and_30_hours", async () => {
  const day = await slotsAt(24);
  const longer = await slotsAt(30);
  assert.ok(Math.abs(day.slot - 17.5) < 0.5, `slot at 24 hours: ${day.slot}`);
  assert.ok(Math.abs(longer.slot - day.slot) < 0.1, `${longer.slot} vs ${day.slot}`);
  assert.deepEqual([day.ticks, longer.ticks], [5, 6]);
  assert.deepEqual([day.date, longer.date], ["16-Nov-26", "16–17-Nov-26"]);
});
