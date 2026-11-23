// @ts-check
/** @module settings-display.test Headless-browser tests of the hours, display and Hijri parts of the settings panel in Chromium (SET-005, SET-006, SET-010 to SET-012, HIJ-002, HIJ-003, THM-001). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { config } from "../../../src/config.js";
import { createPlace } from "../../../src/domain/places.js";
import { defaultSettings } from "../../../src/domain/settings.js";
import { serviceRecord } from "../../unit/holiday-fixtures.js";
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
 * @returns {import("../../../src/domain/settings.js").Settings} Settings with one place per city id.
 */
function savedPlaces(cityIds) {
  const places = cityIds.map((cityId, index) => createPlace(`place-${index + 1}`, cityId));
  return { ...defaultSettings(540, 1020), places };
}

/**
 * @param {Page} page
 * @returns {Promise<void>} Opens the settings panel from the header.
 */
async function openSettings(page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("dialog").waitFor();
}

/**
 * @param {Page} page
 * @param {string} name The tab's name: General, Places or Holidays and vacations (SET-019).
 * @returns {Promise<void>} Selects that tab of the open settings.
 */
async function selectTab(page, name) {
  await page.getByRole("tab", { name, exact: true }).click();
}

/**
 * @param {Page} page
 * @returns {Promise<import("../../../src/domain/settings.js").Settings>} The settings in storage.
 */
function storedSettings(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), config.storageKey);
}

test("ui_set_005_working_hours_default_and_invalid_end_refused", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["washington-dc"]) });
  await openSettings(page);
  const start = page.getByRole("combobox", { name: "Start", exact: true });
  const end = page.getByRole("combobox", { name: "End", exact: true });
  assert.equal(await start.inputValue(), "540");
  assert.equal(await start.locator("option:checked").textContent(), "9:00 AM");
  assert.equal(await end.locator("option:checked").textContent(), "5:00 PM");
  await end.selectOption({ label: "8:00 AM" });
  assert.equal(await end.getAttribute("aria-invalid"), "true");
  assert.equal((await storedSettings(page)).workEndMinutes, 1020);
  await end.selectOption({ label: "6:00 PM" });
  assert.equal(await end.getAttribute("aria-invalid"), "false");
  assert.equal((await storedSettings(page)).workEndMinutes, 1080);
});

test("ui_set_006_region_listed_by_code_and_empty_means_national", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["washington-dc"]) });
  await page.route(`${config.holidayServiceBaseUrl}/Holidays/US/**`, (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify([serviceRecord("2026-12-25", "Regional Day", ["Public"], ["US-CA"])]),
    }),
  );
  await page.getByRole("button", { name: "Refresh" }).click();
  await openSettings(page);
  await selectTab(page, "Places");
  await page.getByRole("button", { name: "Edit Washington, D.C." }).click();
  const region = page.getByLabel("Region for holidays (optional)");
  assert.deepEqual(await region.locator("option").allTextContents(), [
    "None (national holidays only)",
    "US-CA",
  ]);
  assert.equal(await region.inputValue(), "");
  await region.selectOption("US-CA");
  assert.equal((await storedSettings(page)).places[0].region, "US-CA");
  await region.selectOption("");
  assert.equal((await storedSettings(page)).places[0].region, "");
});

test("ui_set_010_country_names_toggle", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const toggle = page.getByLabel("Show country names");
  const countries = page.locator(".month-grid-place-country");
  assert.equal(await toggle.isChecked(), false);
  assert.equal(await countries.count(), 0);
  await toggle.check();
  assert.deepEqual(await countries.allTextContents(), ["Saudi Arabia"]);
  await toggle.uncheck();
  assert.equal(await countries.count(), 0);
  assert.deepEqual(await page.locator(".settings-place-name").allTextContents(), ["Riyadh"]);
});

test("ui_dsp_004_hong_kong_place_and_city_list_ex_025", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["hong-kong"]) });
  await openSettings(page);
  await page.getByLabel("Show country names").check();
  assert.deepEqual(await page.locator(".month-grid-place-country").allTextContents(), [
    "Hong Kong",
  ]);
  await selectTab(page, "Places");
  const labels = await page
    .getByRole("combobox", { name: "City", exact: true })
    .locator("option")
    .allTextContents();
  assert.ok(labels.includes("Hong Kong, Hong Kong"));
});

test("ui_set_011_hijri_toggle_off_by_default", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const toggle = page.getByLabel("Show Hijri calendar");
  assert.equal(await toggle.isChecked(), false);
  await selectTab(page, "Places");
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  assert.equal(
    await page.getByRole("combobox", { name: "Hijri calendar", exact: true }).count(),
    0,
  );
  await selectTab(page, "General");
  await toggle.check();
  await selectTab(page, "Places");
  assert.equal(
    await page.getByRole("combobox", { name: "Hijri calendar", exact: true }).isVisible(),
    true,
  );
  assert.equal((await storedSettings(page)).showHijri, true);
});

test("ui_hij_002_variant_choice_per_place", async () => {
  const saved = { ...savedPlaces(["riyadh", "washington-dc"]), showHijri: true };
  const { page } = await openPage(browser, built.url, { saved });
  await openSettings(page);
  await selectTab(page, "Places");
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  const variant = page
    .locator(".settings-place", { hasText: "Riyadh" })
    .getByRole("combobox", { name: "Hijri calendar", exact: true });
  assert.equal(await variant.inputValue(), "umalqura");
  await variant.selectOption({ label: "Tabular" });
  const riyadh = page.locator(".settings-place", { hasText: "Riyadh" });
  assert.equal(await riyadh.locator('[data-role="hijri"]').textContent(), "Tabular");
  const places = (await storedSettings(page)).places;
  assert.deepEqual(
    places.map((place) => place.hijriVariant),
    ["tabular", "umalqura"],
  );
});

test("ui_hij_003_adjustment_range_minus_one_to_plus_one", async () => {
  const saved = { ...savedPlaces(["riyadh"]), showHijri: true };
  const { page } = await openPage(browser, built.url, { saved });
  await openSettings(page);
  await selectTab(page, "Places");
  await page.getByRole("button", { name: "Edit Riyadh" }).click();
  const adjust = page.getByRole("group", { name: "Hijri date adjustment" });
  const choices = adjust.getByRole("radio");
  assert.deepEqual(
    await choices.evaluateAll((all) =>
      all.map((radio) => radio.parentElement?.textContent?.trim()),
    ),
    ["−1", "0", "+1"],
  );
  assert.equal(await adjust.getByRole("radio", { name: "0", exact: true }).isChecked(), true);
  await adjust.getByRole("radio", { name: "+1", exact: true }).check();
  assert.equal((await storedSettings(page)).places[0].hijriAdjust, 1);
  await adjust.getByRole("radio", { name: "−1", exact: true }).check();
  assert.equal((await storedSettings(page)).places[0].hijriAdjust, -1);
});

/**
 * @param {Page} page
 * @returns {Promise<string>} The computed page background colour.
 */
function pageBackground(page) {
  return page
    .locator("body")
    .evaluate(
      (body) => body.ownerDocument.defaultView?.getComputedStyle(body).backgroundColor ?? "",
    );
}

test("ui_set_012_theme_choice_overrides_the_system_and_is_saved", async () => {
  const { page } = await openPage(browser, built.url, {
    saved: savedPlaces(["riyadh"]),
    colorScheme: "dark",
  });
  await openSettings(page);
  const theme = page.getByRole("group", { name: "Theme" });
  assert.equal(await theme.getByRole("radio", { name: "Auto" }).isChecked(), true);
  assert.equal(await pageBackground(page), "rgb(7, 9, 13)");
  await theme.getByRole("radio", { name: "Light" }).check();
  await page.locator('html[data-theme="light"]').waitFor({ state: "attached" });
  assert.equal(await pageBackground(page), "rgb(234, 246, 246)");
  assert.equal((await storedSettings(page)).theme, "light");
  await theme.getByRole("radio", { name: "Auto" }).check();
  await page.locator("html:not([data-theme])").waitFor({ state: "attached" });
  assert.equal(await pageBackground(page), "rgb(7, 9, 13)");
});

test("ui_thm_001_saved_dark_theme_applies_on_open_over_a_light_system", async () => {
  const saved = { ...savedPlaces(["riyadh"]), theme: /** @type {const} */ ("dark") };
  const { page } = await openPage(browser, built.url, { saved, colorScheme: "light" });
  await page.locator('html[data-theme="dark"]').waitFor({ state: "attached" });
  assert.equal(await pageBackground(page), "rgb(7, 9, 13)");
});

test("ui_dec_020_settings_sections_are_in_the_canvas_order_with_a_line_after_each", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const headings = await page.locator(".settings-section > .settings-heading").allTextContents();
  assert.deepEqual(headings, [
    "Working hours",
    "Display",
    "Add a place",
    "Places",
    "Holidays",
    "Holidays and vacations file",
  ]);
  const lineColour = await page.locator("body").evaluate((body) => {
    const probe = body.ownerDocument.createElement("span");
    probe.style.color = "var(--color-line-card)";
    body.append(probe);
    const view = /** @type {Window} */ (body.ownerDocument.defaultView);
    const colour = view.getComputedStyle(probe).color;
    probe.remove();
    return colour;
  });
  const sections = await page.locator(".settings-section").evaluateAll((all) =>
    all.map((section) => {
      const view = /** @type {Window} */ (section.ownerDocument.defaultView);
      const { borderBottomWidth, borderBottomColor, paddingBottom } =
        view.getComputedStyle(section);
      return { borderBottomWidth, borderBottomColor, paddingBottom };
    }),
  );
  assert.equal(sections.length, 6);
  for (const section of sections) {
    assert.deepEqual(section, {
      borderBottomWidth: "1px",
      borderBottomColor: lineColour,
      paddingBottom: "24px",
    });
  }
  const footer = page.locator(".settings-footer");
  assert.equal(await footer.evaluate((element) => element.nextElementSibling === null), true);
  assert.equal(
    await footer.evaluate(
      (element) =>
        /** @type {Window} */ (element.ownerDocument.defaultView).getComputedStyle(element)
          .borderTopWidth,
    ),
    "0px",
  );
});

test("ui_ver_001_settings_footer_shows_the_version_ex_026", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const footer = page.locator(".settings-footer");
  assert.match((await footer.textContent()) ?? "", /Version 2026\.11\.18\.1432/);
});

/**
 * @param {Page} page
 * @returns {Promise<{ x: number, y: number, width: number, height: number }>} The window's box.
 */
function windowBox(page) {
  return page.locator("html").evaluate((root) => {
    const { clientWidth, clientHeight } = root;
    return { x: 0, y: 0, width: clientWidth, height: clientHeight };
  });
}

test("ui_set_019_settings_layer_has_the_boxes_of_the_window_and_close_returns_the_focus", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  const opener = page.getByRole("button", { name: "Settings", exact: true });
  await openSettings(page);
  assert.deepEqual(
    await page.locator('[data-role="settings"]').boundingBox(),
    await windowBox(page),
  );
  await page.getByRole("button", { name: "Close settings" }).click();
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(
    await opener.evaluate((button) => button === button.ownerDocument.activeElement),
    true,
  );
  await openSettings(page);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(
    await opener.evaluate((button) => button === button.ownerDocument.activeElement),
    true,
  );
});

test("ui_set_019_three_tabs_show_one_panel_at_a_time_and_move_with_the_arrow_keys", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const tabs = page.getByRole("tab");
  const names = (await tabs.allTextContents()).map((text) => text.trim());
  assert.deepEqual(names, ["General", "Places", "Holidays and vacations"]);
  await tabs.first().focus();
  const steps = /** @type {const} */ ([
    ["ArrowRight", "Places"],
    ["ArrowRight", "Holidays and vacations"],
    ["ArrowRight", "General"],
    ["ArrowLeft", "Holidays and vacations"],
    ["Home", "General"],
    ["End", "Holidays and vacations"],
  ]);
  for (const [key, name] of steps) {
    await page.keyboard.press(key);
    const selected = page.getByRole("tab", { name, exact: true });
    assert.equal(await selected.getAttribute("aria-selected"), "true", `${key}: ${name}`);
    assert.equal(await selected.getAttribute("tabindex"), "0", `${key}: roving tabindex`);
    assert.equal(
      await selected.evaluate((tab) => tab === tab.ownerDocument.activeElement),
      true,
      key,
    );
    assert.equal(await page.locator('[role="tab"][aria-selected="true"]').count(), 1, key);
    assert.equal(await page.getByRole("tabpanel").count(), 1, `${key}: one panel`);
    assert.equal(await page.getByRole("tabpanel", { name, exact: true }).count(), 1, key);
  }
});

test("ui_set_019_settings_open_on_the_general_tab", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const general = page.getByRole("tab", { name: "General", exact: true });
  assert.equal(await general.getAttribute("aria-selected"), "true");
  assert.equal(await page.getByRole("tabpanel", { name: "General", exact: true }).count(), 1);
  await selectTab(page, "Places");
  await page.getByRole("button", { name: "Close settings" }).click();
  await openSettings(page);
  assert.equal(await general.getAttribute("aria-selected"), "true");
  assert.equal(await page.getByRole("tabpanel", { name: "General", exact: true }).count(), 1);
});

test("ui_set_019_cards_sit_side_by_side_and_stack_under_60rem", async () => {
  const { page } = await openPage(browser, built.url, { saved: savedPlaces(["riyadh"]) });
  await openSettings(page);
  const cards = page.getByRole("tabpanel").locator(".settings-section");
  const [first, second] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
  ]);
  assert.ok(first !== null && second !== null);
  assert.equal(first.y, second.y, "side by side: the same top");
  assert.ok(second.x >= first.x + first.width, "side by side: the second is on the right");
  const window = await windowBox(page);
  assert.ok(second.x + second.width > window.width / 2, "the cards run across the window");
  await page.setViewportSize({ width: 800, height: 900 });
  const [top, below] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
  assert.ok(top !== null && below !== null);
  assert.equal(top.x, below.x, "stacked: the same left");
  assert.ok(below.y >= top.y + top.height, "stacked: the second is under the first");
});
