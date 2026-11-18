// @ts-check
/** @module rounded-look.test Headless-browser tests of the rounded look and the palette of the "Zuno UI" canvas in Chromium, in the light and the dark theme (DEC-020, THM-001, SET-012). */
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

/** @returns {import("../../../src/domain/settings.js").Settings} London and Riyadh, Hijri on. */
function savedPlaces() {
  return {
    ...defaultSettings(540, 1020),
    places: [createPlace("place-1", "london"), createPlace("place-2", "riyadh")],
    showHijri: true,
  };
}

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
      return /** @type {Record<string, string>} */ (
        /** @type {unknown} */ (view.getComputedStyle(element))
      )[name];
    }, property);
}

/**
 * @param {Page} page
 * @param {string} declaration A CSS declaration such as `color`.
 * @param {string} token A custom property such as `--color-weekend`.
 * @returns {Promise<string>} The computed value that `declaration: var(token)` gives on the page.
 */
function resolveToken(page, declaration, token) {
  return page.locator("body").evaluate(
    (body, [name, value]) => {
      const probe = body.ownerDocument.createElement("span");
      probe.style.setProperty(name, `var(${value})`);
      body.append(probe);
      const resolved = /** @type {Window} */ (body.ownerDocument.defaultView)
        .getComputedStyle(probe)
        .getPropertyValue(name);
      probe.remove();
      return resolved;
    },
    [declaration, token],
  );
}

/**
 * @param {string} css A computed `rgb(...)` colour.
 * @returns {number} Its WCAG relative luminance.
 */
function luminance(css) {
  const [red = 0, green = 0, blue = 0] = (css.match(/[\d.]+/g) ?? []).map(Number);
  const [r = 0, g = 0, b = 0] = [red, green, blue].map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * @param {string} a A computed colour.
 * @param {string} b A computed colour.
 * @returns {number} The WCAG contrast ratio of the two colours.
 */
function contrast(a, b) {
  const [high = 0, low = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test("ui_dec_020_cards_and_controls_have_the_designs_corner_radii", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces() });
  await page.locator('[data-role="grid-row"]').first().waitFor();
  await page.locator('[data-role="row"]').first().waitFor();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator('[data-role="settings"]').waitFor();
  const expected = [
    [".map", "14px 14px 0px 0px"],
    [".month-grid", "0px 0px 14px 14px"],
    [".picker", "14px"],
    [".header .button", "10px"],
    [".settings-input", "10px"],
    [".settings-option", "8px"],
    [".map-pin-label", "8px"],
    [".picker-track", "8px"],
    [".month-grid-hijri", "6px"],
    [".settings-move-button", "6px"],
    [".legend-swatch", "4px"],
    [".notices-card", "12px"],
    [".hijri-note-card", "12px"],
    [".map-view", "10px"],
    [".notices-badge", "999px"],
    [".picker-handle", "999px"],
    [".month-grid-cell", "0px"],
  ];
  for (const [selector, radius] of expected) {
    assert.equal(await styleOf(page, selector, "borderRadius"), radius, selector);
  }
});

test("ui_dec_020_popovers_and_the_empty_page_are_rounded", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces() });
  await page.locator('[data-role="row"]').first().waitFor();
  await page.locator('[data-role="date"]').click();
  const calendar = page.locator(".calendar");
  await calendar.waitFor();
  assert.equal(await styleOf(page, ".calendar", "borderRadius"), "12px");
  assert.equal(await styleOf(page, ".calendar-day", "borderRadius"), "8px");
  const empty = await openPage(browser, built.url, {
    saved: { ...defaultSettings(540, 1020), places: [] },
  });
  await empty.page.locator('[data-role="empty"]').waitFor();
  assert.equal(await styleOf(empty.page, ".empty", "borderRadius"), "14px");
  assert.notEqual(await styleOf(empty.page, ".empty-icon", "borderRadius"), "0px");
});

test("ui_dec_020_weekend_is_cyan_and_dark_today_outline_is_warm_yellow", async () => {
  const palette = {
    light: { weekend: "rgb(136, 213, 231)", today: "rgb(108, 92, 231)" },
    dark: { weekend: "rgb(63, 182, 224)", today: "rgb(255, 209, 102)" },
  };
  for (const colorScheme of /** @type {const} */ (["light", "dark"])) {
    const { page } = await openPage(browser, built.url, { colorScheme, saved: savedPlaces() });
    await page.locator('[data-role="grid-row"]').first().waitFor();
    const { weekend, today } = palette[colorScheme];
    const cell = '[data-role="cell"][data-kind="weekend"]';
    assert.equal(await styleOf(page, cell, "backgroundColor"), weekend, colorScheme);
    assert.equal(
      await styleOf(page, ".legend-swatch-weekend", "backgroundColor"),
      weekend,
      colorScheme,
    );
    assert.equal(
      await styleOf(page, '[data-role="cell"][data-today="true"]', "outlineColor"),
      today,
      colorScheme,
    );
    const onTint = await resolveToken(page, "color", "--color-text-on-tint");
    for (const token of ["--color-weekend", "--color-holiday"]) {
      const tint = await resolveToken(page, "background-color", token);
      const ratio = contrast(onTint, tint);
      assert.ok(ratio >= 4.5, `${colorScheme}: text on ${token} is ${ratio.toFixed(2)}:1`);
    }
  }
});
