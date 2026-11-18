// @ts-check
/** @module page-shell.test Headless-browser tests of the page shell in Chromium (THM-001, SET-007, REF-001, DEC-009). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { buildToScratch, launchBrowser, openPage } from "./page-fixture.js";

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
  return { ...defaultSettings(540, 1020), places: [createPlace("place-1", "US")] };
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
  const empty = await openPage(browser, built.url);
  const prompt = empty.page.getByRole("button", { name: "Add a place" });
  assert.equal(await prompt.isVisible(), true);
  assert.equal(await empty.page.getByRole("heading", { name: "No places yet" }).isVisible(), true);
  const filled = await openPage(browser, built.url, { saved: oneUsPlace() });
  assert.equal(await filled.page.getByRole("button", { name: "Add a place" }).count(), 0);
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
