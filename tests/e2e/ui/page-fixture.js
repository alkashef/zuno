// @ts-check
/**
 * @module page-fixture
 * Shared set-up for the headless-browser tests: builds the one-file page into a scratch folder,
 * starts a browser, and opens the file with a fixed clock and a faked holiday service (DEC-011).
 * It never touches the real network, the real clock or a real user profile.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, firefox, webkit } from "playwright";

import { buildPage } from "../../../scripts/build.mjs";
import { config } from "../../../src/config.js";
import { serviceRecord } from "../../unit/holiday-fixtures.js";

/** @typedef {import("playwright").Browser} Browser */
/** @typedef {import("playwright").Page} Page */
/** @typedef {import("../../../src/domain/settings.js").Settings} Settings */

/** An invented instant for the fixed clock: 16 November 2026, 09:25 UTC. */
export const startInstant = new Date("2026-11-16T09:25:00Z");

/**
 * @typedef {object} PageBuild
 * @property {string} url `file:` URL of the built page.
 * @property {() => Promise<void>} remove Deletes the scratch folder.
 */

/** @returns {Promise<PageBuild>} The page built into a new scratch folder. */
export async function buildToScratch() {
  const scratch = await mkdtemp(path.join(tmpdir(), "zuno-ui-"));
  const srcDir = path.resolve(import.meta.dirname, "../../../src");
  const outFile = path.join(scratch, "zuno.html");
  await buildPage({ srcDir, outFile, holidayServiceBaseUrl: config.holidayServiceBaseUrl });
  return {
    url: pathToFileURL(outFile).href,
    remove: () => rm(scratch, { recursive: true }),
  };
}

/** The browsers of NFR-002; `edge` is Chromium launched through the `msedge` channel (DEC-011). */
export const browserNames = Object.freeze(["chromium", "firefox", "webkit", "edge"]);

/**
 * @param {typeof browserNames[number]} [name] One of `browserNames`; Chromium by default.
 * @returns {Promise<Browser>} A headless browser of that kind.
 */
export function launchBrowser(name = "chromium") {
  if (name === "firefox") return firefox.launch();
  if (name === "webkit") return webkit.launch();
  if (name === "edge") return chromium.launch({ channel: "msedge" });
  return chromium.launch();
}

/**
 * @typedef {object} OpenOptions
 * @property {"light" | "dark"} [colorScheme] The operating-system colour scheme; light by default.
 * @property {Settings | null} [saved] The settings already saved in the browser, if any.
 * @property {string[]} [failingCountries] Country codes whose holiday requests fail (no answer).
 * @property {string} [locale] The browser's language; `en-US` by default.
 */

/**
 * @typedef {object} OpenedPage
 * @property {Page} page
 * @property {string[]} holidayRequests The `CC-YYYY` of every holiday request, in order.
 * @property {string[]} requestUrls The URL of every request the page makes, in order (NFR-001).
 */

/**
 * Opens the built page in a new browser context. Every holiday request is answered with one
 * invented public holiday; the time is fixed at `startInstant` (no real clock).
 * @param {Browser} browser
 * @param {string} url The built page.
 * @param {OpenOptions} [options]
 * @returns {Promise<OpenedPage>}
 */
export async function openPage(
  browser,
  url,
  { colorScheme = "light", saved = null, failingCountries = [], locale = "en-US" } = {},
) {
  const context = await browser.newContext({ colorScheme, timezoneId: "UTC", locale });
  if (saved !== null) {
    const record = { key: config.storageKey, value: JSON.stringify(saved) };
    await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), record);
  }
  /** @type {string[]} */
  const holidayRequests = [];
  /** @type {string[]} */
  const requestUrls = [];
  context.on("request", (request) => requestUrls.push(request.url()));
  await context.route(`${config.holidayServiceBaseUrl}/Holidays/**`, (route) => {
    const [, countryCode, year] =
      new URL(route.request().url()).pathname.match(/(\w+)\/(\d+)$/) ?? [];
    holidayRequests.push(`${countryCode}-${year}`);
    if (failingCountries.includes(countryCode ?? "")) return route.abort();
    return route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify([serviceRecord(`${year}-12-25`, "Invented Day", ["Public"])]),
    });
  });
  const page = await context.newPage();
  await page.clock.install({ time: startInstant });
  await page.clock.setFixedTime(startInstant);
  await page.goto(url);
  return { page, holidayRequests, requestUrls };
}
