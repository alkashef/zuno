// @ts-check
/**
 * @module views/map
 * Owns the world map: a static SVG of simplified outlines (DEC-010) and one pin per place, labelled
 * with the place's name, current local time and date (MAP-001, CLK-001, CLK-003). It clones its
 * markup from templates in index.html and places each pin through the CSS custom properties
 * `--pin-left` and `--pin-top`. It computes no position, time or date (the injected `pinOf` does)
 * and picks no colour (map.css does, from theme.css).
 */

/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {import("../domain/places.js").PlacePin} PlacePin */

/**
 * @typedef {object} MapView The part of the page view the map draws.
 * @property {boolean} isEmpty
 * @property {number} now UTC milliseconds.
 * @property {{ places: Place[], showCountry: boolean } | null} settings
 */

/**
 * @typedef {object} Deps
 * @property {(place: Place, showCountry: boolean) => string} placeName
 * @property {(place: Place, instant: number) => PlacePin} pinOf
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
    throw new Error(`map: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {Document} doc
 * @param {string} id The template's id.
 * @returns {HTMLTemplateElement}
 * @throws {Error} When the page has no such template.
 */
function templateOf(doc, id) {
  const found = doc.querySelector(`#${id}`);
  if (!(found instanceof HTMLTemplateElement)) throw new Error(`map: the page has no #${id}`);
  return found;
}

/**
 * @param {HTMLTemplateElement} template The pin template.
 * @param {string} name
 * @param {PlacePin} pin
 * @returns {HTMLElement} One filled pin.
 */
function buildPin(template, name, pin) {
  const item = part(/** @type {DocumentFragment} */ (template.content.cloneNode(true)), "pin");
  item.style.setProperty("--pin-left", `${pin.left}%`);
  item.style.setProperty("--pin-top", `${pin.top}%`);
  part(item, "pin-name").textContent = name;
  part(item, "pin-time").textContent = pin.time;
  part(item, "pin-date").textContent = pin.date;
  return item;
}

/**
 * @param {HTMLTemplateElement} template The pin template.
 * @param {Deps} deps
 * @param {{ places: Place[], showCountry: boolean }} settings
 * @param {number} now UTC milliseconds.
 * @returns {HTMLElement[]} One pin per place.
 */
function buildPins(template, deps, settings, now) {
  return settings.places.map((place) =>
    buildPin(template, deps.placeName(place, settings.showCountry), deps.pinOf(place, now)),
  );
}

/**
 * @param {HTMLElement | null} root The map section, or `null` when none is shown.
 * @param {Element} area The page area.
 * @param {HTMLTemplateElement} template The map template.
 * @returns {HTMLElement} The map section, added to the page area when it was not shown.
 */
function ensureMap(root, area, template) {
  if (root !== null) return root;
  const created = part(/** @type {DocumentFragment} */ (template.content.cloneNode(true)), "map");
  area.prepend(created);
  return created;
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps
 * @returns {{ render: (view: MapView) => void }} The map; `render` draws one pin per place, or
 *   removes the map while no places are saved.
 * @throws {Error} When the page has no page area or no map templates.
 */
export function createMap(doc, deps) {
  const area = doc.querySelector('[data-role="page"]');
  if (area === null) throw new Error("map: the page has no [data-role=page] area");
  const mapTemplate = templateOf(doc, "map-template");
  const pinTemplate = templateOf(doc, "map-pin-template");
  /** @type {HTMLElement | null} */
  let root = null;
  return {
    render({ isEmpty, settings, now }) {
      if (isEmpty || settings === null) {
        root?.remove();
        root = null;
        return;
      }
      root = ensureMap(root, area, mapTemplate);
      part(root, "pins").replaceChildren(...buildPins(pinTemplate, deps, settings, now));
    },
  };
}
