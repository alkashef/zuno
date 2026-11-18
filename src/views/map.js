// @ts-check
/**
 * @module views/map
 * Owns the world map: a static SVG of simplified outlines (DEC-010) and one pin per place, labelled
 * with the place's name, current local time and date (MAP-001, CLK-001, CLK-003). It clones its
 * markup from templates in index.html and places each pin through the CSS custom properties
 * `--pin-left` and `--pin-top`, and puts each label on the side of its pin where it covers no other
 * label or pin and stays on the map. It computes no position, time or date (the injected `pinOf`
 * does) and picks no colour (map.css does, from theme.css).
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
 * @typedef {object} Rect A box in pixels, measured from the map view's top-left corner.
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} LabelSpot A label's place: the side of its pin and its shift along that side.
 * @property {"right" | "left" | "above" | "below"} side
 * @property {number} shift Pixels; beside the pin a negative shift moves the label up, above or
 *   below it a negative shift moves the label left.
 */

/**
 * @typedef {object} Marker One pin as the label placement sees it.
 * @property {Rect} dot The pin's dot.
 * @property {number} width The label's width.
 * @property {number} height The label's height.
 */

/** How many times the placement revisits every label before it stops. */
const placementRounds = 20;

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
 * @param {Rect} a
 * @param {Rect} b
 * @returns {number} The area the two boxes share.
 */
function sharedArea(a, b) {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return Math.max(0, width) * Math.max(0, height);
}

/**
 * @param {Marker} marker
 * @param {LabelSpot} spot
 * @param {number} gap Pixels between the pin's centre and the label.
 * @returns {Rect} The label's box at that spot.
 */
function labelRect(marker, spot, gap) {
  const x = marker.dot.left + marker.dot.width / 2;
  const y = marker.dot.top + marker.dot.height / 2;
  const { width, height } = marker;
  const corners = {
    right: { left: x + gap, top: y - height / 2 + spot.shift },
    left: { left: x - gap - width, top: y - height / 2 + spot.shift },
    above: { left: x - width / 2 + spot.shift, top: y - gap - height },
    below: { left: x - width / 2 + spot.shift, top: y + gap },
  };
  return { ...corners[spot.side], width, height };
}

/**
 * @param {Marker} marker
 * @returns {LabelSpot[]} The spots to try, the preferred first: beside the pin, raised or lowered by
 *   half the label's height, above or below the pin, then further away.
 */
function spotsOf(marker) {
  const { width, height } = marker;
  /** @type {(sides: LabelSpot["side"][], shifts: number[]) => LabelSpot[]} */
  const around = (sides, shifts) =>
    shifts.flatMap((shift) => sides.map((side) => ({ side, shift })));
  return [
    ...around(["right", "left"], [0, -height / 2, height / 2]),
    ...around(["above", "below"], [0]),
    ...around(["right", "left"], [-height, height]),
    ...around(["above", "below"], [-width / 2, width / 2]),
  ];
}

/**
 * @typedef {object} Scene Everything one label's spot is judged against.
 * @property {Marker[]} markers
 * @property {Rect[]} labels The current box of every label.
 * @property {Rect} view The map view.
 */

/**
 * @param {Scene} scene
 * @param {number} index The label being placed.
 * @param {Rect} rect A box for that label.
 * @returns {number} How bad the box is: the area it covers of other labels and pins, plus four
 *   times its area off the map.
 */
function badness(scene, index, rect) {
  const offMap = rect.width * rect.height - sharedArea(rect, scene.view);
  return scene.markers.reduce((sum, marker, other) => {
    if (other === index) return sum;
    return sum + sharedArea(rect, scene.labels[other]) + sharedArea(rect, marker.dot);
  }, 4 * offMap);
}

/**
 * @param {Scene} scene
 * @param {number} index The label to place.
 * @param {number} gap Pixels between a pin's centre and its label.
 * @returns {{ spot: LabelSpot, rect: Rect, cost: number }} The label's least bad spot, given where
 *   the other labels are now.
 */
function bestSpot(scene, index, gap) {
  const marker = scene.markers[index];
  return spotsOf(marker)
    .map((spot) => {
      const rect = labelRect(marker, spot, gap);
      return { spot, rect, cost: badness(scene, index, rect) };
    })
    .reduce((a, b) => (b.cost < a.cost ? b : a));
}

/**
 * @param {Marker[]} markers
 * @param {Rect} view The map view.
 * @param {number} gap Pixels between a pin's centre and its label.
 * @returns {LabelSpot[]} One spot per label, chosen so labels cover as little as possible of each
 *   other, of the pins and of the area off the map: first each label in turn from west to east,
 *   then every label again while one of them still finds a better spot.
 */
function chooseSpots(markers, view, gap) {
  const empty = { left: 0, top: 0, width: 0, height: 0 };
  const scene = { markers, view, labels: markers.map(() => empty) };
  const spots = markers.map((marker) => spotsOf(marker)[0]);
  const order = markers.map((_, index) => index);
  order.sort((a, b) => markers[a].dot.left - markers[b].dot.left);
  for (let round = 0; round < placementRounds; round += 1) {
    const moved = order.filter((index) => {
      const best = bestSpot(scene, index, gap);
      const better = round === 0 || best.cost < badness(scene, index, scene.labels[index]);
      if (better) [spots[index], scene.labels[index]] = [best.spot, best.rect];
      return better;
    });
    if (moved.length === 0) break;
  }
  return spots;
}

/**
 * @param {Element} element
 * @param {DOMRect} origin The map view's box.
 * @returns {Rect} The element's box, measured from the map view's top-left corner.
 */
function rectIn(element, origin) {
  const box = element.getBoundingClientRect();
  return {
    left: box.left - origin.left,
    top: box.top - origin.top,
    width: box.width,
    height: box.height,
  };
}

/**
 * @param {HTMLElement} view The map view with its pins drawn.
 * @returns {void} Moves each label to the spot `chooseSpots` gives it.
 */
function placeLabels(view) {
  const origin = view.getBoundingClientRect();
  const pins = [...view.querySelectorAll('[data-role="pin"]')].filter(
    (pin) => pin instanceof HTMLElement,
  );
  const markers = pins.map((pin) => {
    const label = /** @type {HTMLElement} */ (pin.querySelector(".map-pin-label"));
    const dot = rectIn(/** @type {Element} */ (pin.querySelector(".map-pin-dot")), origin);
    return { dot, width: label.offsetWidth, height: label.offsetHeight };
  });
  const gap = Number.parseFloat(getComputedStyle(view).getPropertyValue("--space-marker"));
  const viewRect = { left: 0, top: 0, width: origin.width, height: origin.height };
  chooseSpots(markers, viewRect, gap).forEach((spot, index) => {
    pins[index].dataset.side = spot.side;
    pins[index].style.setProperty("--label-shift", `${spot.shift}px`);
  });
}

/**
 * @typedef {object} Site Where the map lives and what it draws with.
 * @property {Element} area The page area.
 * @property {HTMLTemplateElement} mapTemplate
 * @property {HTMLTemplateElement} pinTemplate
 * @property {Deps} deps
 * @property {ResizeObserver} resized Places the labels again when the map view changes size.
 */

/**
 * @param {Site} site
 * @param {HTMLElement | null} root The map section, or `null` when none is shown.
 * @param {{ places: Place[], showCountry: boolean }} settings
 * @param {number} now UTC milliseconds.
 * @returns {HTMLElement} The map section with one pin per place, added to the page area when it
 *   was not shown.
 */
function drawMap(site, root, settings, now) {
  const shown =
    root ?? part(/** @type {DocumentFragment} */ (site.mapTemplate.content.cloneNode(true)), "map");
  if (root === null) site.area.prepend(shown);
  const view = part(shown, "map-view");
  part(shown, "pins").replaceChildren(...buildPins(site.pinTemplate, site.deps, settings, now));
  placeLabels(view);
  site.resized.observe(view);
  return shown;
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps
 * @returns {Site} Where the map goes and what it draws with.
 * @throws {Error} When the page has no page area or no map templates.
 */
function siteOf(doc, deps) {
  const area = doc.querySelector('[data-role="page"]');
  if (area === null) throw new Error("map: the page has no [data-role=page] area");
  return {
    area,
    mapTemplate: templateOf(doc, "map-template"),
    pinTemplate: templateOf(doc, "map-pin-template"),
    deps,
    resized: new ResizeObserver((entries) =>
      entries.forEach((entry) => placeLabels(/** @type {HTMLElement} */ (entry.target))),
    ),
  };
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps
 * @returns {{ render: (view: MapView) => void }} The map; `render` draws one pin per place, or
 *   removes the map while no places are saved.
 * @throws {Error} When the page has no page area or no map templates.
 */
export function createMap(doc, deps) {
  const site = siteOf(doc, deps);
  /** @type {HTMLElement | null} */
  let root = null;
  return {
    render({ isEmpty, settings, now }) {
      if (isEmpty || settings === null) {
        site.resized.disconnect();
        root?.remove();
        root = null;
      } else root = drawMap(site, root, settings, now);
    },
  };
}
