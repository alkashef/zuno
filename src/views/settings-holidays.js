// @ts-check
/**
 * @module views/settings-holidays
 * Owns the Holidays section of the settings panel: the form that adds a holiday (a country or
 * territory of the city list, a date and a name), the list of added holidays with a Remove button
 * each, and the list of hidden holidays with a Show button each (HOL-006 to HOL-008), the Export
 * button and the Import file picker, and the message shown when an imported file was refused
 * (HOL-010 to HOL-012). An empty field is marked invalid and nothing is sent. It does not own the panel (views/settings.js does),
 * validates no holiday beyond empty fields and saves nothing (the controller and
 * domain/user-holidays.js do).
 */
import { formatDate } from "../domain/format.js";

/** @typedef {import("../domain/cities.js").CountryChoice} CountryChoice */
/** @typedef {import("../domain/user-holidays.js").HolidayEntry} HolidayEntry */
/** @typedef {import("../domain/user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} HolidaysView The part of the page view the section draws.
 * @property {UserHolidays} userHolidays
 * @property {"refused" | null} holidayImport `refused` while the last imported file was refused.
 */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {CountryChoice[]} countries The countries and territories of the city list, by name.
 */

/**
 * @typedef {object} SectionContext
 * @property {HTMLElement} section The Holidays section inside the open panel.
 * @property {HTMLTemplateElement} template The row template.
 * @property {Deps} deps
 * @property {{ signature: string }} memo What the lists last drew.
 */

/** The two lists: their role, the action of their buttons, and the button's words. */
const lists = Object.freeze([
  { role: "added", type: "removeHoliday", verb: "Remove" },
  { role: "hidden", type: "showHoliday", verb: "Show" },
]);

/**
 * @param {ParentNode} root
 * @param {string} role A `data-role` value.
 * @returns {HTMLElement} The element with that role.
 * @throws {Error} When there is none.
 */
function part(root, role) {
  const found = root.querySelector(`[data-role="${role}"]`);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`settings holidays: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {string} date `YYYY-MM-DD`.
 * @returns {string} The date as dd-mmm-yy (DSP-001).
 */
function dateText(date) {
  const [year, month, day] = date.split("-").map(Number);
  return formatDate({ year, month, day, hour: 0, minute: 0 });
}

/**
 * @param {SectionContext} ctx
 * @param {string} code A country code.
 * @returns {string} The English name of the country or territory.
 */
function countryText(ctx, code) {
  return ctx.deps.countries.find((country) => country.code === code)?.name ?? code;
}

/**
 * @param {SectionContext} ctx
 * @returns {{ country: HTMLSelectElement, date: HTMLInputElement, name: HTMLInputElement }}
 *   The three fields of the add form.
 */
function formFields(ctx) {
  return {
    country: /** @type {HTMLSelectElement} */ (part(ctx.section, "holiday-country")),
    date: /** @type {HTMLInputElement} */ (part(ctx.section, "holiday-date")),
    name: /** @type {HTMLInputElement} */ (part(ctx.section, "holiday-name")),
  };
}

/**
 * @param {SectionContext} ctx
 * @returns {void} Adds the holiday of the form; an empty field is marked invalid and nothing is
 *   sent (HOL-006). The country stays chosen for the next holiday.
 */
function submitAdd(ctx) {
  const fields = formFields(ctx);
  const entry = {
    countryCode: fields.country.value,
    date: fields.date.value,
    name: fields.name.value.trim(),
  };
  const empty = [entry.countryCode, entry.date, entry.name].map((value) => value === "");
  [fields.country, fields.date, fields.name].forEach((field, index) =>
    field.setAttribute("aria-invalid", String(empty[index])),
  );
  if (empty.includes(true)) return;
  void ctx.deps.dispatch({ type: "addHoliday", ...entry });
  fields.date.value = "";
  fields.name.value = "";
}

/**
 * @param {SectionContext} ctx
 * @param {HolidayEntry} entry
 * @param {{ type: string, verb: string }} list
 * @returns {HTMLElement} One row: the date, the country and the name, and the list's button.
 */
function buildRow(ctx, entry, list) {
  const row = /** @type {HTMLElement} */ (ctx.template.content.firstElementChild?.cloneNode(true));
  const country = countryText(ctx, entry.countryCode);
  const date = dateText(entry.date);
  part(row, "holiday-text").textContent = [date, country, entry.name].join(" · ");
  const button = part(row, "holiday-action");
  button.textContent = list.verb;
  button.setAttribute("aria-label", `${list.verb} ${entry.name}, ${country}, ${date}`);
  Object.assign(button.dataset, { type: list.type, ...entry });
  return row;
}

/**
 * @param {SectionContext} ctx
 * @param {HolidaysView} view
 * @returns {void} Redraws both lists, and the line that says a list is empty.
 */
function drawLists(ctx, view) {
  for (const list of lists) {
    const entries = view.userHolidays[/** @type {"added" | "hidden"} */ (list.role)];
    const target = part(ctx.section, list.role);
    target.replaceChildren(...entries.map((entry) => buildRow(ctx, entry, list)));
    target.hidden = entries.length === 0;
    part(ctx.section, `${list.role}-empty`).hidden = entries.length > 0;
  }
}

/**
 * @param {SectionContext} ctx
 * @param {Event} event A click inside the section.
 * @returns {void} Sends the action of a row's Remove or Show button (HOL-007, HOL-008).
 */
function onClick(ctx, event) {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!(button instanceof HTMLElement) || button.dataset.role !== "holiday-action") return;
  const { type = "", countryCode = "", date = "", name = "" } = button.dataset;
  const action = /** @type {Action} */ ({ type, countryCode, date, name });
  void ctx.deps.dispatch(action);
}

/**
 * @param {SectionContext} ctx
 * @returns {void} Wires the Export button and the Import file picker (HOL-010, HOL-011). The picker
 *   is cleared after each pick, so the same file can be chosen again.
 */
function wireFileButtons(ctx) {
  part(ctx.section, "holiday-export").addEventListener("click", () => {
    void ctx.deps.dispatch({ type: "exportHolidays" });
  });
  const input = /** @type {HTMLInputElement} */ (part(ctx.section, "holiday-file-picker"));
  input.addEventListener("change", () => {
    const [file] = input.files ?? [];
    if (file !== undefined) void ctx.deps.dispatch({ type: "importHolidays", file });
    input.value = "";
  });
}

/**
 * @param {SectionContext} ctx
 * @returns {void} Lists the countries in the add form and wires the form and the buttons.
 */
function setUp(ctx) {
  const country = formFields(ctx).country;
  ctx.deps.countries.forEach(({ code, name }) => country.append(new Option(name, code)));
  part(ctx.section, "holiday-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitAdd(ctx);
  });
  ctx.section.addEventListener("click", (event) => onClick(ctx, event));
  wireFileButtons(ctx);
}

/**
 * @param {Document} doc The page.
 * @param {HTMLElement} section The Holidays section, inside the open panel.
 * @param {Deps} deps The controller's `dispatch` and the countries of the city list.
 * @returns {{ render: (view: HolidaysView) => void }} The section; `render` redraws the lists only
 *   when the user's holidays changed, and shows the refusal message while an import is refused.
 * @throws {Error} When the page has no holiday-row template.
 */
export function createHolidaysSection(doc, section, deps) {
  const template = doc.querySelector("#settings-holiday-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("settings holidays: the page has no #settings-holiday-template");
  }
  /** @type {SectionContext} */
  const ctx = { section, template, deps, memo: { signature: "" } };
  setUp(ctx);
  return {
    render(view) {
      const signature = JSON.stringify(view.userHolidays);
      if (signature !== ctx.memo.signature) drawLists(ctx, view);
      ctx.memo.signature = signature;
      part(ctx.section, "import-refused").hidden = view.holidayImport !== "refused";
    },
  };
}
