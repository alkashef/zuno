// @ts-check
/**
 * @module views/settings-places
 * Owns the list of places inside the settings panel: one row per place with move arrows, its name,
 * its city, country and offset from UTC (and Hijri variant while Hijri is on), an edit button, a
 * remove button and an editor for the display name, time zone, region and, while Hijri is on, the
 * Hijri variant and adjustment (SET-001 to SET-003, SET-006, SET-008, SET-009, HIJ-002, HIJ-003).
 * It does not own the panel, the add form or Escape (views/settings.js does) and it computes no
 * names or offsets (the `lookup` it receives does).
 */
import { formatOffset } from "../domain/format.js";

/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {import("../domain/countries.js").CountryName} CountryName */
/** @typedef {import("../../data/countries.js").CityZone} CityZone */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} Lookup What the views may not import, passed in by main.js.
 * @property {CountryName[]} countries Every country for the add list.
 * @property {(countryCode: string) => CityZone[]} zonesOf The cities a place of a country can use.
 * @property {(place: Place, showCountry: boolean) => { name: string, city: string | null, country: string | null }} placeFacts
 *   The name shown for a place, the city a display name hides, and the country name.
 * @property {(instant: number, zone: string) => number} offsetAt A zone's offset from UTC (ms).
 */

/**
 * @typedef {object} PlaceListView The part of the page view the list draws.
 * @property {{ places: Place[], showCountry: boolean, showHijri: boolean } | null} settings
 * @property {number} now
 * @property {Record<string, string[]>} regions The region codes of each country's holidays.
 */

/**
 * @typedef {object} ListContext
 * @property {HTMLElement} list The `<ul>` the rows go in.
 * @property {HTMLTemplateElement} template The row template.
 * @property {Lookup} lookup
 * @property {(action: Action) => Promise<void>} dispatch
 * @property {Set<string>} expanded Ids of the rows whose editor is open.
 * @property {{ signature: string }} memo What the list last drew.
 */

/**
 * Icon-only buttons: their role, and the words of their `aria-label` around the place name. The
 * edit button is named by `setExpanded`, because its name follows the editor's state.
 */
const buttonLabels = Object.freeze({
  up: ["Move ", " up"],
  down: ["Move ", " down"],
  remove: ["Remove ", ""],
});

/**
 * @param {ParentNode} root
 * @param {string} role A `data-role` value.
 * @returns {HTMLElement} The element with that role.
 * @throws {Error} When there is none.
 */
function part(root, role) {
  const found = root.querySelector(`[data-role="${role}"]`);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`settings places: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {HTMLElement} item A row.
 * @param {boolean} open Whether the editor is shown.
 * @returns {void} Shows or hides the editor and names the edit button "Edit" or "Collapse".
 */
function setExpanded(item, open) {
  part(item, "edit").hidden = !open;
  item.dataset.open = String(open);
  const toggle = part(item, "toggle");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", `${open ? "Collapse" : "Edit"} ${item.dataset.name ?? ""}`);
}

/**
 * @param {HTMLElement} item
 * @param {Place} place
 * @param {string} name The name shown for the place.
 * @returns {void} Names each icon-only button after the place, and marks it for focus restore.
 */
function labelButtons(item, place, name) {
  for (const [role, [before, after]] of Object.entries(buttonLabels)) {
    part(item, role).setAttribute("aria-label", `${before}${name}${after}`);
  }
  for (const role of ["up", "down", "toggle", "remove"]) {
    part(item, role).dataset.focusKey = `${place.id}:${role}`;
  }
}

/**
 * @param {ListContext} ctx
 * @param {string} zone An IANA zone name.
 * @param {number} instant UTC milliseconds.
 * @returns {string} The zone's offset from UTC at the instant, for example `UTC+3`.
 */
function offsetText(ctx, zone, instant) {
  return formatOffset(ctx.lookup.offsetAt(instant, zone));
}

/**
 * @param {ListContext} ctx
 * @param {HTMLElement} item
 * @param {Place} place
 * @param {number} now UTC milliseconds.
 * @returns {void} Lists the zones of a country with several, the capital first and marked, each
 *   with its offset from UTC, and explains the choice (SET-003).
 */
function fillZones(ctx, item, place, now) {
  const zones = ctx.lookup.zonesOf(place.countryCode);
  const zone = /** @type {HTMLSelectElement} */ (part(item, "zone"));
  zones.forEach((city, index) => {
    const name = index === 0 ? `${city.label}, capital` : city.label;
    zone.append(new Option(`${name} (${offsetText(ctx, city.zone, now)})`, city.zone));
  });
  zone.value = place.zone;
  part(item, "zone-field").hidden = zones.length < 2;
  const country = ctx.lookup.placeFacts(place, true).country;
  part(item, "zone-hint").textContent =
    `${country} has more than one time zone. The capital's zone is the default.`;
}

/**
 * @param {HTMLElement} item
 * @param {Place} place
 * @param {string[]} codes The region codes known for the place's country.
 * @returns {void} Lists "None (national holidays only)" and each region by code (SET-006). The chosen
 *   region stays listed even when its holiday data is not loaded.
 */
function fillRegion(item, place, codes) {
  const region = /** @type {HTMLSelectElement} */ (part(item, "region"));
  region.append(new Option("None (national holidays only)", ""));
  const listed =
    place.region === "" || codes.includes(place.region) ? codes : [...codes, place.region];
  for (const code of listed) {
    region.append(new Option(code, code));
  }
  region.value = place.region;
}

/**
 * @param {HTMLElement} item
 * @param {Place} place
 * @param {boolean} showHijri
 * @returns {void} Shows the Hijri variant (in the row and the editor) and the adjustment only while
 *   Hijri is on (HIJ-002, HIJ-003).
 */
function fillHijri(item, place, showHijri) {
  if (!showHijri) {
    part(item, "hijri-fields").remove();
    return;
  }
  const variant = /** @type {HTMLSelectElement} */ (part(item, "variant"));
  variant.value = place.hijriVariant;
  for (const radio of item.querySelectorAll('[data-role="adjust"]')) {
    const input = /** @type {HTMLInputElement} */ (radio);
    input.name = `adjust-${place.id}`;
    input.checked = input.value === String(place.hijriAdjust);
  }
  const summary = part(item, "hijri");
  summary.textContent = variant.selectedOptions[0]?.text ?? "";
  summary.hidden = false;
}

/**
 * @param {ListContext} ctx
 * @param {HTMLElement} item
 * @param {Place} place
 * @param {number} now UTC milliseconds.
 * @returns {string} The name shown for the place, after writing it and the line under it: the
 *   city a display name hides, the country and the offset from UTC (SET-002, SET-009).
 */
function fillName(ctx, item, place, now) {
  const facts = ctx.lookup.placeFacts(place, true);
  part(item, "name").textContent = facts.name;
  part(item, "facts").textContent = [facts.city, facts.country, offsetText(ctx, place.zone, now)]
    .filter((text) => text !== null)
    .join(" · ");
  return facts.name;
}

/**
 * @param {ListContext} ctx
 * @param {Place} place
 * @param {PlaceListView} view
 * @returns {HTMLElement} A new row for the place.
 */
function buildItem(ctx, place, view) {
  const item = /** @type {HTMLElement} */ (ctx.template.content.firstElementChild?.cloneNode(true));
  const name = fillName(ctx, item, place, view.now);
  item.dataset.id = place.id;
  item.dataset.name = name;
  labelButtons(item, place, name);
  /** @type {HTMLInputElement} */ (part(item, "label")).value = place.label;
  fillZones(ctx, item, place, view.now);
  fillRegion(item, place, view.regions[place.countryCode] ?? []);
  fillHijri(item, place, view.settings?.showHijri ?? false);
  setExpanded(item, ctx.expanded.has(place.id));
  return item;
}

/**
 * @param {string} role
 * @param {string} placeId
 * @returns {Action | null} The action of a row button, or `null` for the edit button (it only
 *   opens the editor).
 */
function actionOf(role, placeId) {
  if (role === "up" || role === "down") {
    return { type: "movePlace", placeId, offset: role === "up" ? -1 : 1 };
  }
  return role === "remove" ? { type: "removePlace", placeId } : null;
}

/**
 * @param {Event} event A click inside the list.
 * @returns {{ role: string, item: HTMLElement } | null} The row button clicked and its row.
 */
function rowButton(event) {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  const item = button?.closest("[data-id]");
  if (!(button instanceof HTMLElement) || !(item instanceof HTMLElement)) return null;
  return { role: button.dataset.role ?? "", item };
}

/**
 * @param {ListContext} ctx
 * @param {HTMLElement} item A row.
 * @returns {void} Opens the row's editor, or closes it when open.
 */
function toggleEditor(ctx, item) {
  const id = item.dataset.id ?? "";
  const open = !ctx.expanded.has(id);
  ctx.expanded[open ? "add" : "delete"](id);
  setExpanded(item, open);
}

/**
 * @param {ListContext} ctx
 * @param {Event} event A click inside the list.
 * @returns {void}
 */
function onClick(ctx, event) {
  const clicked = rowButton(event);
  if (clicked === null) return;
  if (clicked.role === "toggle") {
    toggleEditor(ctx, clicked.item);
    return;
  }
  const action = actionOf(clicked.role, clicked.item.dataset.id ?? "");
  if (action !== null) void ctx.dispatch(action);
}

/** What each editor field changes in its place, by the field's role. */
const fieldChanges = Object.freeze({
  /** @param {string} value @returns {Partial<Place>} */
  label: (value) => ({ label: value.trim() }),
  /** @param {string} value @returns {Partial<Place>} */
  zone: (value) => ({ zone: value }),
  /** @param {string} value @returns {Partial<Place>} */
  region: (value) => ({ region: value }),
  /** @param {string} value @returns {Partial<Place>} */
  variant: (value) => ({ hijriVariant: /** @type {Place["hijriVariant"]} */ (value) }),
  /** @param {string} value @returns {Partial<Place>} */
  adjust: (value) => ({ hijriAdjust: Number(value) }),
});

/**
 * @param {ListContext} ctx
 * @param {Event} event A change of an editor field.
 * @returns {void}
 */
function onChange(ctx, event) {
  const field = event.target;
  const item = field instanceof Element ? field.closest("[data-id]") : null;
  if (!(item instanceof HTMLElement)) return;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
  const role = field.dataset.role ?? "";
  if (!Object.hasOwn(fieldChanges, role)) return;
  const changes = fieldChanges[/** @type {keyof typeof fieldChanges} */ (role)](field.value);
  void ctx.dispatch({ type: "editPlace", placeId: item.dataset.id ?? "", changes });
}

/**
 * @param {ListContext} ctx
 * @returns {string | undefined} The focus key of the focused row button, if any.
 */
function focusedKey(ctx) {
  const focused = ctx.list.ownerDocument.activeElement;
  return focused instanceof HTMLElement ? focused.dataset.focusKey : undefined;
}

/**
 * @param {ListContext} ctx
 * @param {PlaceListView} view
 * @returns {void} Redraws the rows, keeping the keyboard focus on the same button.
 */
function rebuild(ctx, view) {
  const key = focusedKey(ctx);
  const places = view.settings?.places ?? [];
  const ids = new Set(places.map((place) => place.id));
  ctx.expanded.forEach((id) => ids.has(id) || ctx.expanded.delete(id));
  ctx.list.replaceChildren(...places.map((place) => buildItem(ctx, place, view)));
  const again = ctx.list.querySelector(`[data-focus-key="${key}"]`);
  if (again instanceof HTMLElement) again.focus();
}

/**
 * @param {PlaceListView} view
 * @returns {string} What the rows show; the rows are redrawn when it changes. The offsets are left
 *   out: redrawing every minute would reset a display name being typed.
 */
function drawnState(view) {
  const { settings, regions } = view;
  return JSON.stringify([settings?.places, settings?.showHijri, regions]);
}

/**
 * @param {Document} doc The page.
 * @param {HTMLElement} list The `<ul>` for the rows, inside the open panel.
 * @param {{ dispatch: ListContext["dispatch"], lookup: Lookup }} deps
 * @returns {{ render: (view: PlaceListView) => void }} The list; `render` redraws it only when a
 *   place, the Hijri switch or the known regions changed.
 * @throws {Error} When the page has no place-row template.
 */
export function createPlaceList(doc, list, deps) {
  const template = doc.querySelector("#settings-place-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("settings places: the page has no #settings-place-template");
  }
  /** @type {ListContext} */
  const ctx = { list, template, ...deps, expanded: new Set(), memo: { signature: "" } };
  list.addEventListener("click", (event) => onClick(ctx, event));
  list.addEventListener("change", (event) => onChange(ctx, event));
  return {
    render(view) {
      const signature = drawnState(view);
      if (signature !== ctx.memo.signature) rebuild(ctx, view);
      ctx.memo.signature = signature;
    },
  };
}
