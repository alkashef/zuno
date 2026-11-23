// @ts-check
/** @module picker.test Headless-browser tests of the picker view and its day selector in Chromium (PCK-001 to PCK-007, PCK-009, LAY-001, DSP-001, DSP-002, EX-003, EX-019). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace, placeName } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import {
  browserNames,
  buildToScratch,
  launchBrowser,
  openPage,
  startInstant,
} from "./page-fixture.js";

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

/**
 * @param {import("./page-fixture.js").Browser["browserType"]} _unused
 * @returns {void}
 */
void 0;

/**
 * Opens London and New York in one named browser, with the marker at a fraction of the window.
 * @param {string} name One of `browserNames`.
 * @param {number} fraction 0 to 1.
 * @param {"light" | "dark"} [colorScheme]
 * @returns {Promise<{ page: Page, close: () => Promise<void> }>}
 */
async function openIn(name, fraction, colorScheme = "light") {
  const own = await launchBrowser(/** @type {never} */ (name));
  const places = ["london", "washington-dc"].map((id, index) => createPlace(`place-${index}`, id));
  const { page } = await openPage(own, built.url, {
    colorScheme,
    saved: { ...defaultSettings(540, 1020), places },
  });
  await page.locator('[data-role="row"]').first().waitFor();
  await dragMarkerTo(page, fraction);
  return { page, close: () => own.close() };
}

/**
 * @param {Page} page
 * @param {string} selector
 * @returns {Promise<{ x: number, y: number, width: number, height: number }[]>} The boxes.
 */
function boxes(page, selector) {
  return page.locator(selector).evaluateAll((all) =>
    all.map((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
}

test("ui_pck_010_name_stays_at_the_left_end_at_every_marker_position_ex_033", async () => {
  for (const name of browserNames) {
    const lefts = new Set();
    for (const fraction of [0.05, 0.5, 0.95]) {
      const { page, close } = await openIn(name, fraction);
      const names = await boxes(page, '[data-role="who"]');
      const [track] = await boxes(page, '[data-role="track"]');
      assert.equal(names.length, 2);
      for (const who of names) {
        assert.ok(Math.abs(who.x - track.x) <= 1, `${name}: name at ${who.x}, band at ${track.x}`);
        lefts.add(Math.round(who.x));
      }
      await close();
    }
    assert.equal(lefts.size, 1, `${name}: the name moved`);
  }
});

test("ui_pck_002_date_and_time_label_sits_inside_the_band_beside_the_marker_ex_033", async () => {
  for (const name of browserNames) {
    for (const [fraction, side] of /** @type {const} */ ([
      [0.5, "right"],
      [0.97, "left"],
    ])) {
      const { page, close } = await openIn(name, fraction);
      const marks = await boxes(page, '[data-role="track"] [data-role="mark"]');
      const tracks = await boxes(page, '[data-role="track"]');
      const [line] = await boxes(page, ".picker-line");
      assert.equal(marks.length, 2, `${name}: the label is not inside the band`);
      marks.forEach((mark, index) => {
        const track = tracks[index];
        assert.ok(mark.x >= track.x - 1 && mark.x + mark.width <= track.x + track.width + 1, name);
        assert.ok(
          mark.y >= track.y - 1 && mark.y + mark.height <= track.y + track.height + 1,
          name,
        );
        if (side === "right") assert.ok(mark.x >= line.x + line.width - 1, `${name}: not right`);
        else assert.ok(mark.x + mark.width <= line.x + 1, `${name}: not left`);
      });
      const texts = await page.locator('[data-role="track"] [data-role="mark"]').allTextContents();
      assert.match(texts[0].replace(/\s+/g, " ").trim(), /^\d+:\d\d [AP]M \d+-\w+-\d\d$/);
      await close();
    }
  }
});

test("ui_pck_011_label_background_is_see_through_in_both_themes_ex_033", async (t) => {
  for (const name of browserNames) {
    for (const scheme of /** @type {const} */ (["light", "dark"])) {
      const { page, close } = await openIn(name, 0.5, scheme);
      const result = await page
        .locator('[data-role="mark"]')
        .first()
        .evaluate((mark) => {
          const doc = mark.ownerDocument;
          const win = /** @type {Window} */ (doc.defaultView);
          const canvas = /** @type {CanvasRenderingContext2D} */ (
            doc.createElement("canvas").getContext("2d")
          );
          /** @param {string} css @returns {number[]} Red, green, blue, alpha (0 to 255). */
          const rgba = (css) => {
            canvas.clearRect(0, 0, 1, 1);
            canvas.fillStyle = css;
            canvas.fillRect(0, 0, 1, 1);
            return [...canvas.getImageData(0, 0, 1, 1).data];
          };
          /** @param {number[]} c @returns {number} Relative luminance. */
          const lum = (c) => {
            const [r = 0, g = 0, b = 0] = c.slice(0, 3).map((v) => {
              const u = v / 255;
              return u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
            });
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          const style = win.getComputedStyle(mark);
          const over = rgba(style.backgroundColor);
          const alpha = (over[3] ?? 0) / 255;
          const text = lum(rgba(style.color));
          const root = win.getComputedStyle(doc.documentElement);
          const ratios = ["working", "non-working", "day-off"].map((kind) => {
            const back = rgba(root.getPropertyValue(`--color-${kind}`).trim() || "#000");
            const probe = doc.createElement("i");
            probe.style.background = `var(--color-${kind})`;
            doc.body.append(probe);
            const solid = rgba(win.getComputedStyle(probe).backgroundColor);
            probe.remove();
            const mixed = [0, 1, 2].map(
              (i) => (over[i] ?? 0) * alpha + (solid[i] ?? back[i]) * (1 - alpha),
            );
            const [high = 0, low = 0] = [text, lum(mixed)].sort((a, b) => b - a);
            return Number(((high + 0.05) / (low + 0.05)).toFixed(2));
          });
          return { over, alpha, ratios };
        });
      assert.ok(result.alpha > 0 && result.alpha < 1, `${name} ${scheme}: alpha ${result.alpha}`);
      assert.ok(Math.abs(result.alpha - 0.82) < 0.01, `${name} ${scheme}: alpha ${result.alpha}`);
      t.diagnostic(`${name} ${scheme}: label contrast over the slots ${result.ratios.join(", ")}`);
      await close();
    }
  }
});
