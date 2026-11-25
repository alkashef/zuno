// @ts-check
/** @module page-shell.test Headless-browser tests of the page shell in Chromium (THM-001, SET-007, REF-001, DEC-009). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { browserNames, buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

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

/** @returns {import("../../../src/domain/settings.js").Settings} Settings with one invented place. */
function oneUsPlace() {
  return { ...defaultSettings(540, 1020), places: [createPlace("place-1", "washington-dc")] };
}

/** @returns {import("../../../src/domain/settings.js").Settings} Saved settings that hold no places. */
function noPlaces() {
  return { ...defaultSettings(540, 1020), places: [] };
}

/**
 * @param {import("./page-fixture.js").Page} page
 * @returns {Promise<{ page: string, text: string }>} The computed colours of the page.
 */
async function pageColours(page) {
  const body = page.locator("body");
  const read = (/** @type {Element} */ element) => {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    return { page: style?.backgroundColor ?? "", text: style?.color ?? "" };
  };
  return body.evaluate(read);
}

test("ui_thm_001_follows_light_and_dark_color_scheme", async () => {
  const light = await openPage(browser, built.url, { colorScheme: "light" });
  assert.deepEqual(await pageColours(light.page), {
    page: "rgb(234, 246, 246)",
    text: "rgb(14, 42, 51)",
  });
  const dark = await openPage(browser, built.url, { colorScheme: "dark" });
  assert.deepEqual(await pageColours(dark.page), {
    page: "rgb(7, 9, 13)",
    text: "rgb(234, 238, 245)",
  });
});

test("ui_set_007_empty_page_prompts_to_add_a_place", async () => {
  const empty = await openPage(browser, built.url, { saved: noPlaces() });
  const prompt = empty.page.getByRole("button", { name: "Add a place" });
  assert.equal(await prompt.isVisible(), true);
  assert.equal(await empty.page.getByRole("heading", { name: "No places yet" }).isVisible(), true);
  const filled = await openPage(browser, built.url, { saved: oneUsPlace() });
  assert.equal(await filled.page.getByRole("button", { name: "Add a place" }).count(), 0);
});

test("ui_set_014_first_open_shows_the_seven_default_places_and_saves_nothing", async () => {
  const { page } = await openPage(browser, built.url);
  const names = page.locator('[data-role="pin"] [data-role="pin-name"]');
  await names.first().waitFor();
  const expected = ["Tokyo", "Cairo", "New Delhi", "Madrid", "Bogotá", "Riyadh", "Islamabad"];
  assert.deepEqual(await names.allTextContents(), expected);
  assert.equal(await page.getByRole("button", { name: "Add a place" }).count(), 0);
  const stored = await page.evaluate(() => Object.keys(localStorage));
  assert.deepEqual(stored, []);
});

test("ui_ref_001_refresh_button_refetches_holidays", async () => {
  const { page, holidayRequests } = await openPage(browser, built.url, { saved: oneUsPlace() });
  const updated = page.locator(".header-updated");
  await updated.getByText("9:25 AM").waitFor();
  assert.deepEqual(holidayRequests, ["US-2026"]);
  await page.clock.setFixedTime(new Date("2026-11-16T10:40:00Z"));
  const answered = page.waitForResponse(/\/Holidays\/US\/2026$/);
  await page.getByRole("button", { name: "Refresh" }).click();
  await answered;
  assert.deepEqual(holidayRequests, ["US-2026", "US-2026"]);
  assert.equal(await updated.textContent(), "Updated 10:40 AM · 16-Nov-26");
});

test("ui_shell_title_is_zuno_with_subtitle_and_no_logo", async () => {
  const { page } = await openPage(browser, built.url);
  assert.equal(await page.title(), "Zuno");
  assert.equal(await page.getByRole("heading", { level: 1 }).textContent(), "Zuno");
  assert.equal(await page.locator(".header-subtitle").textContent(), "Many time zones, One team!");
  assert.equal(await page.locator("header img, .header-logo").count(), 0);
});

test("ui_shell_unexpected_error_shows_message_and_stack_on_screen", async () => {
  const { page } = await openPage(browser, built.url);
  await page.evaluate(() => {
    queueMicrotask(() => {
      throw new Error("invented failure");
    });
  });
  const alert = page.getByRole("alert");
  await alert.waitFor();
  assert.match((await alert.textContent()) ?? "", /invented failure/);
});

/**
 * @param {import("./page-fixture.js").Page} page
 * @returns {Promise<string[]>} The colour (`#rrggbb`) of the icon at each point of a 32 by 32 drawing.
 */
async function iconColoursAt(page) {
  const points = [
    [0, 0],
    [31, 0],
    [0, 31],
    [31, 31],
    [16, 9],
    [16, 16],
    [16, 23],
    [8, 16],
  ];
  const link = page.locator('link[rel~="icon"]');
  return link.evaluate(async (element, at) => {
    const owner = element.ownerDocument;
    const image = owner.createElement("img");
    image.src = element.getAttribute("href") ?? "";
    await image.decode();
    const canvas = owner.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d");
    context?.drawImage(image, 0, 0, 32, 32);
    return at.map(([x, y]) => {
      const [r, g, b] = context?.getImageData(x, y, 1, 1).data ?? [];
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    });
  }, points);
}

test("ui_icn_001_the_tab_icon_has_cyan_corners_and_a_black_z_ex_037", async () => {
  for (const name of browserNames) {
    const own = await launchBrowser(name);
    try {
      const { page } = await openPage(own, built.url);
      assert.equal(await page.title(), "Zuno");
      assert.equal(await page.locator('link[rel~="icon"]').count(), 1);
      const [c1, c2, c3, c4, top, middle, bottom, besideDiagonal] = await iconColoursAt(page);
      assert.deepEqual([c1, c2, c3, c4], Array(4).fill("#00bcd4"), name);
      assert.deepEqual([top, middle, bottom], Array(3).fill("#000000"), name);
      assert.equal(besideDiagonal, "#00bcd4", name);
    } finally {
      await own.close();
    }
  }
});
