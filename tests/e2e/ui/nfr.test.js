// @ts-check
/** @module nfr.test Headless-browser tests of the non-functional requirements and the cross-browser examples, in Chromium, Firefox, WebKit and Edge (NFR-001, NFR-002, NFR-003, DEC-009, EX-002, EX-010). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { browserNames, buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

/** @typedef {import("./page-fixture.js").PageBuild} PageBuild */
/** @typedef {import("./page-fixture.js").Browser} Browser */
/** @typedef {import("./page-fixture.js").Page} Page */

/** @type {PageBuild} */
let built;
/** @type {Map<string, Browser>} */
const browsers = new Map();

before(async () => {
  built = await buildToScratch();
  await Promise.all(
    browserNames.map(async (name) => browsers.set(name, await launchBrowser(name))),
  );
});

after(async () => {
  await Promise.all([...browsers.values()].map((browser) => browser.close()));
  await built.remove();
});

/**
 * @param {string} name One of `browserNames`.
 * @returns {Browser} The launched browser of that name.
 */
function browserOf(name) {
  const browser = browsers.get(name);
  if (browser === undefined) throw new Error(`Browser ${name} did not launch.`);
  return browser;
}

/**
 * @param {number} [hijriAdjust] The Saudi place's Hijri adjustment.
 * @returns {import("../../../src/domain/settings.js").Settings} A Saudi and a British place, Hijri on.
 */
function savedSettings(hijriAdjust = 0) {
  return {
    ...defaultSettings(540, 1020),
    places: [{ ...createPlace("place-1", "SA"), hijriAdjust }, createPlace("place-2", "GB")],
    showHijri: true,
  };
}

/**
 * @param {string} name One of `browserNames`.
 * @param {import("./page-fixture.js").OpenOptions} [options]
 * @returns {Promise<import("./page-fixture.js").OpenedPage>} The page with both places drawn.
 */
async function openDrawn(name, options = { saved: savedSettings() }) {
  const opened = await openPage(browserOf(name), built.url, options);
  await opened.page.locator('[data-role="grid-row"]').first().waitFor();
  return opened;
}

/**
 * @param {Page} page
 * @returns {Promise<void>} Shows December 2026, where the invented holiday (25 December) is.
 */
async function showDecember(page) {
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("heading", { name: "December 2026" }).waitFor();
}

/**
 * @param {Page} page
 * @returns {Promise<void>} Opens the settings panel from the header.
 */
async function openSettings(page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator('[data-role="settings"]').waitFor();
}

test("ui_nfr_001_only_holiday_service_requests", async () => {
  for (const name of browserNames) {
    const { page, requestUrls } = await openDrawn(name);
    await showDecember(page);
    await page.getByRole("button", { name: "Refresh" }).click();
    await openSettings(page);
    const holidayPrefix = `${config.holidayServiceBaseUrl}/Holidays/`;
    const holidayRequests = requestUrls.filter((url) => url.startsWith(holidayPrefix));
    assert.ok(holidayRequests.length > 0, `${name}: the page asked for no holidays`);
    const others = requestUrls.filter((url) => !url.startsWith(holidayPrefix) && url !== built.url);
    assert.deepEqual(others, [], `${name}: requests other than the holiday service`);
  }
});

test("ui_nfr_002_core_workflows_in_chromium_firefox_webkit_edge", async () => {
  for (const name of browserNames) {
    const { page, holidayRequests } = await openDrawn(name);
    assert.equal(await page.locator('[data-role="grid-row"]').count(), 2, `${name}: grid rows`);
    assert.equal(await page.locator('[data-role="pin"]').count(), 2, `${name}: map pins`);
    assert.equal(await page.locator('[data-role="row"]').count(), 2, `${name}: picker rows`);
    assert.equal(await page.getByRole("slider", { name: "Chosen time" }).count(), 1, name);
    await showDecember(page);
    const holidayCells = page.locator('[data-role="cell"][data-kind="holiday"]');
    assert.equal(await holidayCells.count(), 1, `${name}: British holiday cell in December`);
    const splitCells = page.locator('[data-role="cell"][data-kind="split"]');
    assert.equal(await splitCells.count(), 1, `${name}: Saudi weekend holiday cell in December`);
    await openSettings(page);
    await page
      .getByRole("combobox", { name: "Country", exact: true })
      .selectOption({ label: "Japan" });
    await page.getByRole("button", { name: "Add place" }).click();
    assert.equal(await page.locator(".settings-place-name").count(), 3, `${name}: places`);
    assert.ok(holidayRequests.length >= 2, `${name}: holiday requests`);
  }
});

test("ui_nfr_003_all_visible_text_is_english", async () => {
  for (const name of browserNames) {
    const { page } = await openDrawn(name, { saved: savedSettings(), locale: "ar-SA" });
    await showDecember(page);
    await openSettings(page);
    const options = await page.locator("option").allTextContents();
    const text = [await page.locator("body").innerText(), ...options].join(String.fromCharCode(10));
    const foreignLetters = text.match(/[^\P{L}\p{Script=Latin}]/gu) ?? [];
    const foreignDigits = text.match(/(?![0-9])\p{Nd}/gu) ?? [];
    assert.deepEqual([...new Set(foreignLetters)], [], `${name}: letters that are not Latin`);
    assert.deepEqual([...new Set(foreignDigits)], [], `${name}: digits that are not 0 to 9`);
    assert.match(text, /Riyadh/, `${name}: place names`);
    assert.match(text, /December 2026/, `${name}: month name`);
    assert.equal(await page.locator("html").getAttribute("lang"), "en", name);
  }
});

/**
 * @typedef {object} TextColours
 * @property {string} text A short description of the element.
 * @property {string} colour Its computed text colour.
 * @property {string[]} backgrounds The computed colours it may sit on (more than one on a gradient).
 */

/**
 * @param {Page} page
 * @returns {Promise<TextColours[]>} The colours of every visible text on the page.
 */
function readTextColours(page) {
  return page.locator("body").evaluate((body) => {
    const doc = body.ownerDocument;
    const win = /** @type {Window} */ (doc.defaultView);
    const textNode = 3;
    /** @param {Element} element @returns {string[]} The colours the text may sit on. */
    const backgroundsOf = (element) => {
      for (let node = element; node.parentElement !== null; node = node.parentElement) {
        const style = win.getComputedStyle(node);
        if (style.backgroundImage.includes("rgb")) {
          return style.backgroundImage.match(/rgba?\([^)]*\)/g) ?? [];
        }
        if (/^rgb\(|, 1\)$/.test(style.backgroundColor)) return [style.backgroundColor];
      }
      return [win.getComputedStyle(doc.documentElement).backgroundColor];
    };
    /** @type {TextColours[]} */
    const found = [];
    for (const element of body.querySelectorAll("*")) {
      const own = [...element.childNodes]
        .filter((node) => node.nodeType === textNode)
        .map((node) => node.textContent?.trim() ?? "")
        .join(" ")
        .trim();
      const box = element.getBoundingClientRect();
      if (own === "" || box.width === 0 || box.height === 0) continue;
      const text = `${element.tagName.toLowerCase()} "${own.slice(0, 30)}"`;
      const colour = win.getComputedStyle(element).color;
      found.push({ text, colour, backgrounds: backgroundsOf(element) });
    }
    return found;
  });
}

/**
 * @param {string} css A computed `rgb(...)` or `rgba(...)` colour.
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
 * @param {TextColours} entry
 * @returns {number} The lowest WCAG contrast ratio of the text over its possible backgrounds.
 */
function lowestRatio(entry) {
  const text = luminance(entry.colour);
  const ratios = entry.backgrounds.map((background) => {
    const [high = 0, low = 0] = [text, luminance(background)].sort((a, b) => b - a);
    return (high + 0.05) / (low + 0.05);
  });
  return Math.min(...ratios);
}

test("ui_dec_009_text_contrast_at_least_4_5_to_1", async () => {
  const minimum = 4.5;
  for (const colorScheme of /** @type {const} */ (["light", "dark"])) {
    const { page } = await openDrawn("chromium", {
      colorScheme,
      saved: savedSettings(),
      failingCountries: ["GB"],
    });
    await showDecember(page);
    await page.locator('[data-role="cell"][data-kind="split"]').first().click();
    const states = [await readTextColours(page)];
    await page.getByRole("button", { name: /Notices/ }).click();
    states.push(await readTextColours(page));
    await page.keyboard.press("Escape");
    await openSettings(page);
    states.push(await readTextColours(page));
    const all = states.flat();
    assert.ok(all.length > 30, `${colorScheme}: only ${all.length} texts found`);
    const weak = all
      .map((entry) => ({ text: entry.text, ratio: lowestRatio(entry) }))
      .filter((entry) => entry.ratio < minimum);
    assert.deepEqual(weak, [], `${colorScheme}: texts below ${minimum}:1`);
  }
});

test("ui_ex_002_saudi_weekend_in_four_browsers", async () => {
  for (const name of browserNames) {
    const saved = { ...defaultSettings(540, 1020), places: [createPlace("place-1", "SA")] };
    const { page } = await openDrawn(name, { saved });
    const weekend = await page
      .locator('[data-role="cell"][data-kind="weekend"]')
      .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("data-date")));
    assert.deepEqual(
      weekend,
      [
        "2026-11-06",
        "2026-11-07",
        "2026-11-13",
        "2026-11-14",
        "2026-11-20",
        "2026-11-21",
        "2026-11-27",
        "2026-11-28",
      ],
      `${name}: Friday and Saturday are the weekend`,
    );
  }
});

test("ui_ex_010_hijri_names_in_four_browsers", async () => {
  for (const name of browserNames) {
    const zero = await openDrawn(name, { saved: savedSettings(0) });
    const picker = await zero.page.locator('[data-role="local-hijri"]').allTextContents();
    assert.equal(picker[0], "06-Jumada II-1448", `${name}: adjustment 0`);
    const band = await zero.page.locator('[data-role="hijri-band"]').textContent();
    assert.ok((band ?? "").includes("Jumada II-1448"), `${name}: band ${band}`);
    const one = await openDrawn(name, { saved: savedSettings(1) });
    const adjusted = await one.page.locator('[data-role="local-hijri"]').allTextContents();
    assert.equal(adjusted[0], "07-Jumada II-1448", `${name}: adjustment +1`);
  }
});
