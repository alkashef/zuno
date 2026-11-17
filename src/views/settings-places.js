// @ts-check
/**
 * @module views/settings-places
 * Owns the list of places inside the settings panel: one row per place with move arrows, an edit
 * button, a remove button and an editor for the display name and time zone (SET-001, SET-003,
 * SET-008, SET-009). It does not own the panel, the add form or Escape (views/settings.js does) and
 * it computes no names or times (the `lookup` it receives does).
 */

/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {import("../domain/countries.js").CountryName} CountryName */
/** @typedef {import("../../data/countries.js").CityZone} CityZone */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} Lookup What the views may not import, passed in by main.js.
 * @property {CountryName[]} countries Every country for the add list.
 * @property {(countryCode: string) => CityZone[]} zonesOf The cities a place of a country can use.
 * @property {(place: Place, showCountry: boolean) => string} placeName
 * @property {(place: Place, instant: number) => string} clockOf
 */

/**
 * @typedef {object} PlaceListView The part of the page view the list draws.
 * @property {{ places: Place[], showCountry: boolean } | null} settings
 * @property {number} now
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

/** Icon-only buttons: their role, and the words of their `aria-label` around the place name. */
const buttonLabels = Object.freeze({
  up: ["Move ", " up"],
  down: ["Move ", " down"],
  toggle: ["Edit ", ""],
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
 * @returns {void}
 */
function setExpanded(item, open) {
  part(item, "edit").hidden = !open;
  part(item, "toggle").setAttribute("aria-expanded", String(open));
}

/**
 * @param {HTMLElement} item
 * @param {Place} place
 * @param {string} name The name shown for the place.
 * @returns {void} Names each icon-only button after the place, and marks it for focus restore.
 */
function labelButtons(item, place, name) {
  for (const [role, [before, after]] of Object.entries(buttonLabels)) {
    const button = part(item, role);
    button.setAttribute("aria-label", `${before}${name}${after}`);
    button.dataset.focusKey = `${place.id}:${role}`;
  }
}

/**
 * @param {ListContext} ctx
 * @param {HTMLElement} item
 * @param {Place} place
 * @returns {void} Fills the editor: display name and, for a country with several zones, the zone.
 */
function fillEditor(ctx, item, place) {
  const zones = ctx.lookup.zonesOf(place.countryCode);
  const label = /** @type {HTMLInputElement} */ (part(item, "label"));
  label.value = place.label;
  const zone = /** @type {HTMLSelectElement} */ (part(item, "zone"));
  for (const city of zones) {
    zone.append(new Option(city.label, city.zone));
  }
  zone.value = place.zone;
  part(item, "zone-field").hidden = zones.length < 2;
}

/**
 * @param {ListContext} ctx
 * @param {Place} place
 * @param {boolean} showCountry
 * @returns {HTMLElement} A new row for the place.
 */
function buildItem(ctx, place, showCountry) {
  const item = /** @type {HTMLElement} */ (ctx.template.content.firstElementChild?.cloneNode(true));
  const name = ctx.lookup.placeName(place, showCountry);
  item.dataset.id = place.id;
  part(item, "name").textContent = name;
  labelButtons(item, place, name);
  fillEditor(ctx, item, place);
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

/**
 * @param {ListContext} ctx
 * @param {Event} event A change of the display name or the zone.
 * @returns {void}
 */
function onChange(ctx, event) {
  const field = event.target;
  const item = field instanceof Element ? field.closest("[data-id]") : null;
  if (!(item instanceof HTMLElement)) return;
  const placeId = item.dataset.id ?? "";
  if (field instanceof HTMLInputElement) {
    void ctx.dispatch({ type: "editPlace", placeId, changes: { label: field.value.trim() } });
  } else if (field instanceof HTMLSelectElement) {
    void ctx.dispatch({ type: "editPlace", placeId, changes: { zone: field.value } });
  }
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
  const showCountry = view.settings?.showCountry ?? false;
  const places = view.settings?.places ?? [];
  const ids = new Set(places.map((place) => place.id));
  ctx.expanded.forEach((id) => ids.has(id) || ctx.expanded.delete(id));
  ctx.list.replaceChildren(...places.map((place) => buildItem(ctx, place, showCountry)));
  const again = ctx.list.querySelector(`[data-focus-key="${key}"]`);
  if (again instanceof HTMLElement) again.focus();
}

/**
 * @param {ListContext} ctx
 * @param {PlaceListView} view
 * @returns {void} Shows each place's current local time (SET-002).
 */
function showTimes(ctx, view) {
  for (const place of view.settings?.places ?? []) {
    const item = ctx.list.querySelector(`[data-id="${place.id}"]`);
    if (item !== null) part(item, "time").textContent = ctx.lookup.clockOf(place, view.now);
  }
}

/**
 * @param {Document} doc The page.
 * @param {HTMLElement} list The `<ul>` for the rows, inside the open panel.
 * @param {{ dispatch: ListContext["dispatch"], lookup: Lookup }} deps
 * @returns {{ render: (view: PlaceListView) => void }} The list; `render` redraws it only when a
 *   place or the country-name switch changed, and always refreshes the times.
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
      const signature = JSON.stringify([view.settings?.places, view.settings?.showCountry]);
      if (signature !== ctx.memo.signature) rebuild(ctx, view);
      ctx.memo.signature = signature;
      showTimes(ctx, view);
    },
  };
}
