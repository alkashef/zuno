// @ts-check
/**
 * @module views/settings
 * Owns the settings page, a layer over the whole window: opens and closes it with `settingsOpen`,
 * the working-hours lists, the country-name and Hijri switches, the theme, the add form (the cities
 * of the list), the close button and Escape, and returns the focus to the button that opened it
 * (SET-001, SET-002, SET-004, SET-005, SET-010 to SET-013, SET-019), from a template in
 * index.html. It does not draw the list of places (views/settings-places.js, `deps.makeList`) or
 * the Holidays tab (views/settings-holidays.js, `deps.makeHolidays`), or the tabs
 * (views/settings-tabs.js, `deps.setUpTabs`), and saves nothing (the controller does).
 */
import { formatMinutes } from "../domain/format.js";

/** @typedef {import("./settings-places.js").Lookup} Lookup */
/** @typedef {import("./settings-places.js").PlaceListView} PlaceListView */
/** @typedef {import("./settings-holidays.js").HolidaysView} HolidaysView */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} Session The open panel, if any.
 * @property {HTMLElement | null} panel
 * @property {Element | null} opener The element focused when the panel opened.
 * @property {{ render: (view: PlaceListView) => void } | null} places
 * @property {{ render: (view: HolidaysView) => void } | null} holidays
 */

/**
 * @typedef {object} PanelSettings The saved values the panel shows.
 * @property {number} workStartMinutes
 * @property {number} workEndMinutes
 * @property {boolean} showCountry
 * @property {boolean} showHijri
 * @property {string} theme
 */

/**
 * @typedef {PlaceListView & HolidaysView & { settingsOpen: boolean, settings: (NonNullable<PlaceListView["settings"]> & PanelSettings) | null }} SettingsView
 *   The part of the page view the panel draws.
 */

/**
 * @typedef {object} Deps
 * @property {{ start: number, end: number }} defaultHours Working hours (minutes after midnight)
 *   shown when none are saved (SET-005; main.js passes them from config).
 * @property {number} hoursStepMinutes Minutes between two choices of the working-hours lists.
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {Lookup} lookup
 * @property {(layer: HTMLElement) => void} setUpTabs Starts the tabs of the layer
 *   (views/settings-tabs.js; main.js passes it in, because a view imports no other view).
 * @property {(list: HTMLElement) => { render: (view: PlaceListView) => void }} makeList Builds the
 *   list of places (views/settings-places.js; main.js passes it in, it needs the lookup).
 * @property {(section: HTMLElement) => { render: (view: HolidaysView) => void }} makeHolidays
 *   Builds the Holidays tab (views/settings-holidays.js; main.js passes it in).
 */

/**
 * @typedef {object} PanelContext
 * @property {Document} doc
 * @property {HTMLTemplateElement} template
 * @property {Deps} deps
 * @property {Session} session
 */

/**
 * @param {ParentNode} root
 * @param {string} role A `data-role` value.
 * @returns {HTMLElement} The element with that role.
 * @throws {Error} When there is none.
 */
function part(root, role) {
  const found = root.querySelector(`[data-role="${role}"]`);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`settings: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @returns {void} Lists every city of the list in the add form, each with its country (SET-013).
 */
function fillCities(ctx, panel) {
  const select = /** @type {HTMLSelectElement} */ (part(panel, "city"));
  for (const city of ctx.deps.lookup.cities) {
    select.append(new Option(`${city.name}, ${city.country}`, city.id));
  }
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @returns {void} Adds a place for the chosen city; no city chosen is refused and marked (SET-002).
 */
function submitAdd(ctx, panel) {
  const select = /** @type {HTMLSelectElement} */ (part(panel, "city"));
  select.setAttribute("aria-invalid", String(select.value === ""));
  if (select.value === "") return;
  void ctx.deps.dispatch({ type: "addPlace", cityId: select.value });
  select.value = "";
}

/**
 * @param {number} step Minutes between two choices.
 * @param {number} saved The saved time, listed even when it falls between two steps.
 * @returns {number[]} The times of day to list, in minutes after midnight, in order.
 */
function hourChoices(step, saved) {
  const count = Math.ceil((24 * 60) / step);
  const steps = Array.from({ length: count }, (_, index) => index * step);
  return steps.includes(saved) ? steps : [...steps, saved].sort((a, b) => a - b);
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @returns {void} Sets the working hours when the start is before the end; otherwise marks the
 *   end time as invalid and changes nothing (SET-005).
 */
function submitHours(ctx, panel) {
  const start = Number(/** @type {HTMLSelectElement} */ (part(panel, "work-start")).value);
  const end = Number(/** @type {HTMLSelectElement} */ (part(panel, "work-end")).value);
  part(panel, "work-end").setAttribute("aria-invalid", String(start >= end));
  if (start < end) void ctx.deps.dispatch({ type: "setWorkingHours", start, end });
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @param {{ workStartMinutes: number, workEndMinutes: number }} hours
 * @returns {void} Lists the times of day, shows the working hours and wires the two lists (SET-005).
 */
function setUpHours(ctx, panel, hours) {
  const fields = /** @type {const} */ ([
    ["work-start", hours.workStartMinutes],
    ["work-end", hours.workEndMinutes],
  ]);
  for (const [role, saved] of fields) {
    const select = /** @type {HTMLSelectElement} */ (part(panel, role));
    for (const minutes of hourChoices(ctx.deps.hoursStepMinutes, saved)) {
      select.append(new Option(formatMinutes(minutes), String(minutes)));
    }
    select.value = String(saved);
    select.addEventListener("change", () => submitHours(ctx, panel));
  }
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @param {{ showCountry: boolean, showHijri: boolean }} shown
 * @returns {void} Shows the two display switches and wires them (SET-010, SET-011).
 */
function setUpSwitches(ctx, panel, shown) {
  const switches = /** @type {const} */ ([
    ["show-country", "setShowCountry", shown.showCountry],
    ["show-hijri", "setShowHijri", shown.showHijri],
  ]);
  for (const [role, type, on] of switches) {
    const box = /** @type {HTMLInputElement} */ (part(panel, role));
    box.checked = on;
    box.addEventListener("change", () => void ctx.deps.dispatch({ type, value: box.checked }));
  }
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @param {string} theme The saved theme.
 * @returns {void} Checks the saved theme and wires the three choices (SET-012).
 */
function setUpTheme(ctx, panel, theme) {
  const group = part(panel, "theme");
  for (const radio of group.querySelectorAll("input")) {
    radio.checked = radio.value === theme;
  }
  group.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement) {
      void ctx.deps.dispatch({ type: "setTheme", value: event.target.value });
    }
  });
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @param {SettingsView} view
 * @returns {void} Shows the saved hours, switches and theme, or the defaults when nothing is saved.
 */
function setUpDisplay(ctx, panel, view) {
  const { start, end } = ctx.deps.defaultHours;
  const saved = view.settings ?? {
    workStartMinutes: start,
    workEndMinutes: end,
    showCountry: false,
    showHijri: false,
    theme: "auto",
  };
  setUpHours(ctx, panel, saved);
  setUpSwitches(ctx, panel, saved);
  setUpTheme(ctx, panel, saved.theme);
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @returns {void} Wires the close button and the add form.
 */
function wireButtons(ctx, panel) {
  part(panel, "close").addEventListener("click", () => {
    void ctx.deps.dispatch({ type: "closeSettings" });
  });
  part(panel, "add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitAdd(ctx, panel);
  });
}

/**
 * @param {PanelContext} ctx
 * @param {SettingsView} view
 * @returns {void} Builds the panel, wires it and puts it on the page.
 */
function openPanel(ctx, view) {
  const { doc, session } = ctx;
  const panel = /** @type {HTMLElement} */ (
    ctx.template.content.firstElementChild?.cloneNode(true)
  );
  session.opener = doc.activeElement;
  fillCities(ctx, panel);
  setUpDisplay(ctx, panel, view);
  wireButtons(ctx, panel);
  ctx.deps.setUpTabs(panel);
  session.places = ctx.deps.makeList(part(panel, "places"));
  session.holidays = ctx.deps.makeHolidays(part(panel, "holidays"));
  session.panel = panel;
  doc.body.append(panel);
  part(panel, "close").focus();
}

/**
 * @param {PanelContext} ctx
 * @returns {void} Removes the panel and puts the focus back on the button that opened it.
 */
function closePanel(ctx) {
  const { doc, session } = ctx;
  session.panel?.remove();
  const kept = session.opener?.isConnected === true && session.opener !== doc.body;
  const opener = kept ? session.opener : doc.querySelector('[data-action="openSettings"]');
  if (opener instanceof HTMLElement) opener.focus();
  Object.assign(session, { panel: null, places: null, holidays: null });
}

/**
 * @param {PanelContext} ctx
 * @returns {void} Closes the open panel on Escape, anywhere on the page.
 */
function closeOnEscape(ctx) {
  ctx.doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ctx.session.panel !== null) {
      void ctx.deps.dispatch({ type: "closeSettings" });
    }
  });
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps The controller's `dispatch` and the lookup from main.js.
 * @returns {{ render: (view: SettingsView) => void }} The panel;
 *   `render` opens, updates or closes it to match `view.settingsOpen`.
 * @throws {Error} When the page has no panel template.
 */
export function createSettingsPanel(doc, deps) {
  const template = doc.querySelector("#settings-panel-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("settings: the page has no #settings-panel-template");
  }
  const session = { panel: null, opener: null, places: null, holidays: null };
  /** @type {PanelContext} */
  const ctx = { doc, template, deps, session };
  closeOnEscape(ctx);
  return {
    render(view) {
      if (view.settingsOpen && ctx.session.panel === null) openPanel(ctx, view);
      if (!view.settingsOpen && ctx.session.panel !== null) closePanel(ctx);
      ctx.session.places?.render(view);
      ctx.session.holidays?.render(view);
    },
  };
}
