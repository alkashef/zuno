// @ts-check
/**
 * @module views/settings-places
 * Owns the list of places inside the settings panel: one row per place with move arrows, its name,
 * its city, country and offset from UTC (and Hijri variant while Hijri is on), an edit button, a
 * remove button and an editor for the display name, region, weekend days and, while Hijri is on,
 * the Hijri variant and adjustment (SET-001, SET-002, SET-006, SET-008, SET-009, SET-016, HIJ-002,
 * HIJ-003).
 * It does not own the panel, the add form or Escape (views/settings.js does) and it computes no
 * names or offsets (the `lookup` it receives does).
 */
import { formatDayNames, formatOffset } from "../domain/format.js";

/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {import("../domain/cities.js").CityChoice} CityChoice */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} Lookup What the views may not import, passed in by main.js.
 * @property {CityChoice[]} cities Every city of the list, with its country, for the add list.
 * @property {(place: Place, showCountry: boolean) => { name: string, city: string | null, country: string | null }} placeFacts
 *   The name shown for a place, the city a display name hides, and the country name.
 * @property {(instant: number, zone: string) => number} offsetAt A zone's offset from UTC (ms).
 * @property {(place: Place) => number[]} placeWeekendDays The place's weekend days, 1 = Monday to 7 =
 *   Sunday: the days the user chose, else its country's.
 * @property {(countryCode: string) => number[]} countryWeekendDays The weekend days of a country.
 * @property {typeof import("./pin-button.js")} pins What the pin buttons share (views/pin-button.js).
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
  for (const role of ["up", "down", "place-pin", "toggle", "remove"]) {
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
 * @param {ParentNode} item A row.
 * @returns {HTMLInputElement[]} The seven day boxes of the row's editor, Sunday first.
 */
function weekendBoxes(item) {
  const boxes = item.querySelectorAll('[data-role="weekend-day"]');
  return [...boxes].map((box) => /** @type {HTMLInputElement} */ (box));
}

/**
 * @param {ListContext} ctx
 * @param {HTMLElement} item
 * @param {Place} place
 * @returns {void} Ticks the place's weekend days (its own, else its country's), names each box
 *   after its full day name, and writes the line that names the country's default (SET-016).
 */
function fillWeekend(ctx, item, place) {
  const days = ctx.lookup.placeWeekendDays(place);
  for (const box of weekendBoxes(item)) {
    const day = Number(box.value);
    box.checked = days.includes(day);
    box.setAttribute("aria-label", formatDayNames([day]));
    box.dataset.focusKey = `${place.id}:weekend-${day}`;
  }
  const country = ctx.lookup.placeFacts(place, true).country ?? "";
  const defaults = formatDayNames(ctx.lookup.countryWeekendDays(place.countryCode));
  part(item, "weekend-hint").textContent =
    `The default for ${country} is ${defaults}. Change it if this place has other days off.`;
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
  fillRegion(item, place, view.regions[place.countryCode] ?? []);
  fillWeekend(ctx, item, place);
  fillHijri(item, place, view.settings?.showHijri ?? false);
  ctx.lookup.pins.showPin(part(item, "place-pin"), {
    placeId: place.id,
    name,
    pinned: view.settings?.places[0]?.id === place.id,
  });
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
  const pinned = ctx.lookup.pins.pressedPlace(event);
  if (pinned !== null) {
    void ctx.dispatch({ type: "pinPlace", placeId: pinned });
    return;
  }
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
  region: (value) => ({ region: value }),
  /** @param {string} value @returns {Partial<Place>} */
  variant: (value) => ({ hijriVariant: /** @type {Place["hijriVariant"]} */ (value) }),
  /** @param {string} value @returns {Partial<Place>} */
  adjust: (value) => ({ hijriAdjust: Number(value) }),
});

/**
 * @param {ListContext} ctx
 * @param {HTMLElement} item A row.
 * @param {HTMLInputElement} box The day box that changed.
 * @returns {void} Saves the ticked days as the place's weekend. The last ticked box cannot be
 *   cleared: a weekend has at least one day (SET-016).
 */
function onWeekendChange(ctx, item, box) {
  const days = weekendBoxes(item)
    .filter((each) => each.checked)
    .map((each) => Number(each.value))
    .sort((a, b) => a - b);
  if (days.length === 0) {
    box.checked = true;
    return;
  }
  void ctx.dispatch({
    type: "editPlace",
    placeId: item.dataset.id ?? "",
    changes: { weekendDays: days },
  });
}

/**
 * @param {Event} event A change inside the list.
 * @returns {{ item: HTMLElement, field: HTMLInputElement | HTMLSelectElement } | null} The editor
 *   field that changed and its row, or `null` for any other target.
 */
function changedField(event) {
  const field = event.target;
  const item = field instanceof Element ? field.closest("[data-id]") : null;
  const isField = field instanceof HTMLInputElement || field instanceof HTMLSelectElement;
  return item instanceof HTMLElement && isField ? { item, field } : null;
}

/**
 * @param {ListContext} ctx
 * @param {Event} event A change of an editor field.
 * @returns {void}
 */
function onChange(ctx, event) {
  const changed = changedField(event);
  if (changed === null) return;
  const { item, field } = changed;
  const role = field.dataset.role ?? "";
  if (role === "weekend-day") {
    onWeekendChange(ctx, item, /** @type {HTMLInputElement} */ (field));
    return;
  }
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
