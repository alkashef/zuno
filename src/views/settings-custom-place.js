// @ts-check
/**
 * @module views/settings-custom-place
 * Owns the "Add a place or person" card's choice between the two ways to add and the form of a
 * custom place: Name; Time zone (an input with a list of the zones, each with its offset from
 * UTC); Country or territory (every country by English name, preset to the zone's own country); and
 * the Add place button (SET-013, SET-018, DEC-029, DEC-033). An empty name, a zone outside the table
 * or no country marks the field `aria-invalid` and sends nothing; a good form dispatches
 * `addCustomPlace`.
 * It does not own the form of the cities of the list (views/settings.js does), checks no zone beyond
 * the list it is given, makes no place and saves nothing (the controller does).
 */
import { formatOffset } from "../domain/format.js";

/** @typedef {import("../domain/cities.js").CountryChoice} CountryChoice */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {readonly { zone: string, countryCode: string }[]} zones Every zone of the table with
 *   its own country (main.js passes it from the zone table).
 * @property {CountryChoice[]} countries Every country and territory by English name.
 * @property {(instant: number, zone: string) => number} offsetAt A zone's offset from UTC (ms).
 */

/**
 * @typedef {object} Fields The three fields of the form.
 * @property {HTMLInputElement} name
 * @property {HTMLInputElement} zone
 * @property {HTMLSelectElement} country
 */

/**
 * @typedef {object} FormContext
 * @property {HTMLElement} section The "Add a place or person" card inside the open panel.
 * @property {Deps} deps
 * @property {Fields} fields
 * @property {{ listed: boolean }} memo Whether the zone list is filled.
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
    throw new Error(`settings custom place: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {HTMLElement} section
 * @returns {Fields} The fields of the form.
 */
function fieldsOf(section) {
  return {
    name: /** @type {HTMLInputElement} */ (part(section, "custom-name")),
    zone: /** @type {HTMLInputElement} */ (part(section, "custom-zone")),
    country: /** @type {HTMLSelectElement} */ (part(section, "custom-country")),
  };
}

/**
 * @param {FormContext} ctx
 * @returns {void} Marks each field invalid or valid, sends a good form and clears the form.
 */
function submit(ctx) {
  const { name, zone, country } = ctx.fields;
  const entry = { name: name.value.trim(), zone: zone.value, countryCode: country.value };
  const known = ctx.deps.zones.some((row) => row.zone === entry.zone);
  const bad = [entry.name === "", !known, entry.countryCode === ""];
  [name, zone, country].forEach((field, index) =>
    field.setAttribute("aria-invalid", String(bad[index])),
  );
  if (bad.includes(true)) return;
  void ctx.deps.dispatch({ type: "addCustomPlace", ...entry });
  [name, zone, country].forEach((field) => {
    field.value = "";
    field.removeAttribute("aria-invalid");
  });
}

/**
 * @param {FormContext} ctx
 * @returns {void} Presets the country to the typed zone's own country once the zone is a whole
 *   zone name.
 */
function presetCountry(ctx) {
  const row = ctx.deps.zones.find((each) => each.zone === ctx.fields.zone.value);
  if (row !== undefined) ctx.fields.country.value = row.countryCode;
}

/**
 * @param {FormContext} ctx
 * @param {number} now UTC milliseconds.
 * @returns {void} Lists each zone with its offset from UTC at that instant, once.
 */
function listZones(ctx, now) {
  if (ctx.memo.listed) return;
  const list = part(ctx.section, "zone-list");
  const options = ctx.deps.zones.map(
    ({ zone }) => new Option(formatOffset(ctx.deps.offsetAt(now, zone)), zone),
  );
  list.replaceChildren(...options);
  ctx.memo.listed = true;
}

/**
 * @param {HTMLElement} section
 * @param {"city" | "custom"} mode The way to add that is shown.
 * @returns {void} Shows one of the two forms and marks its button pressed.
 */
function showMode(section, mode) {
  for (const each of /** @type {const} */ (["city", "custom"])) {
    part(section, `${each}-mode`).hidden = each !== mode;
    part(section, `mode-${each}`).setAttribute("aria-pressed", String(each === mode));
  }
}

/**
 * @param {FormContext} ctx
 * @returns {void} Lists the countries and wires the two buttons and the form.
 */
function setUp(ctx) {
  const { section, fields, deps } = ctx;
  fields.country.append(...deps.countries.map(({ code, name }) => new Option(name, code)));
  part(section, "mode-city").addEventListener("click", () => showMode(section, "city"));
  part(section, "mode-custom").addEventListener("click", () => showMode(section, "custom"));
  fields.zone.addEventListener("input", () => presetCountry(ctx));
  part(section, "custom-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submit(ctx);
  });
}

/**
 * @param {HTMLElement} section The "Add a place or person" card, inside the open panel.
 * @param {Deps} deps The controller's `dispatch` and the tables from main.js.
 * @returns {{ render: (view: { now: number }) => void }} The form; `render` lists the zones with
 *   their offsets the first time it is called.
 */
export function createCustomPlaceForm(section, deps) {
  /** @type {FormContext} */
  const ctx = { section, deps, fields: fieldsOf(section), memo: { listed: false } };
  setUp(ctx);
  return {
    render(view) {
      listZones(ctx, view.now);
    },
  };
}
