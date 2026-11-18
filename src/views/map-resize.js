// @ts-check
/**
 * @module views/map-resize
 * Owns the resize handle on the border between the map card and the month grid card (LAY-004,
 * LAY-005, DEC-028). Dragging it changes the map's height live by setting `--map-height` and
 * `data-map-height` on the page area, and dispatches `setMapHeight` once when the drag ends; the up
 * and down arrow keys dispatch `setMapHeight` one step lower or higher. Every height stays within
 * the limits from config. It does not draw the handle (map.css does), does not lay out the page
 * (layout.css does) and does not save the height (the controller does).
 */

/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} MapResizeView The part of the page view the handle uses.
 * @property {boolean} isEmpty
 * @property {{ mapHeight: number | null } | null} settings
 */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {{ minHeight: number, maxHeight: number, stepPx: number }} limits The lowest and
 *   highest map card, and one arrow key's step, in pixels (from config).
 */

/**
 * @typedef {object} Handle The handle and what a drag needs.
 * @property {HTMLElement} area The page area.
 * @property {HTMLElement} button
 * @property {Deps} deps
 * @property {{ dragging: boolean, startY: number, startHeight: number, height: number }} drag
 */

/** The step direction of each arrow key: up lowers the border's place, so the map gets shorter. */
const keySteps = Object.freeze({ ArrowUp: -1, ArrowDown: 1 });

/**
 * @param {HTMLElement} area The page area.
 * @param {number | null} px The map card's height, or `null` for the height the grid leaves.
 * @returns {void} Sets or removes the height on the page area.
 */
function applyHeight(area, px) {
  if (px === null) {
    area.style.removeProperty("--map-height");
    delete area.dataset.mapHeight;
  } else {
    area.style.setProperty("--map-height", `${px}px`);
    area.dataset.mapHeight = String(px);
  }
}

/**
 * @param {HTMLElement} area The page area.
 * @returns {number} The height of its first row, which holds the map card, in pixels.
 */
function shownHeight(area) {
  const view = area.ownerDocument.defaultView;
  if (view === null) throw new Error("map-resize: the page area has no window");
  return Number.parseFloat(view.getComputedStyle(area).gridTemplateRows);
}

/**
 * @param {Deps["limits"]} limits
 * @param {number} px
 * @returns {number} The whole number of pixels nearest to `px` within the limits.
 */
function withinLimits(limits, px) {
  return Math.round(Math.max(limits.minHeight, Math.min(limits.maxHeight, px)));
}

/**
 * @param {Handle} handle
 * @returns {void} Ends a drag, if one is running, by dispatching the height it reached once.
 */
function endDrag({ deps, drag }) {
  if (!drag.dragging) return;
  drag.dragging = false;
  void deps.dispatch({ type: "setMapHeight", px: drag.height });
}

/**
 * @param {Handle} handle
 * @returns {void} Wires the drag with pointer capture: the map follows the pointer, and the height
 *   is dispatched once when the pointer is released.
 */
function bindDrag(handle) {
  const { area, button, deps, drag } = handle;
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const height = shownHeight(area);
    Object.assign(drag, { dragging: true, startY: event.clientY, startHeight: height, height });
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    if (!drag.dragging) return;
    drag.height = withinLimits(deps.limits, drag.startHeight + event.clientY - drag.startY);
    applyHeight(area, drag.height);
  });
  for (const type of ["pointerup", "pointercancel"]) {
    button.addEventListener(type, () => endDrag(handle));
  }
}

/**
 * @param {Handle} handle
 * @returns {void} Wires the up and down arrow keys.
 */
function bindKeys(handle) {
  const { area, button, deps } = handle;
  button.addEventListener("keydown", (event) => {
    if (!(event.key in keySteps)) return;
    event.preventDefault();
    const step = keySteps[/** @type {keyof typeof keySteps} */ (event.key)] * deps.limits.stepPx;
    void deps.dispatch({
      type: "setMapHeight",
      px: withinLimits(deps.limits, shownHeight(area) + step),
    });
  });
}

/**
 * @param {Document} doc
 * @param {Deps} deps
 * @returns {Handle} A new handle, wired and not yet on the page.
 * @throws {Error} When the page has no page area or no handle template.
 */
function buildHandle(doc, deps) {
  const area = doc.querySelector('[data-role="page"]');
  const template = doc.getElementById("map-resize-template");
  if (!(area instanceof HTMLElement)) throw new Error("map-resize: no [data-role=page] area");
  if (!(template instanceof HTMLTemplateElement)) throw new Error("map-resize: no template");
  const button = /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
  const drag = { dragging: false, startY: 0, startHeight: 0, height: 0 };
  const handle = { area, button, deps, drag };
  bindDrag(handle);
  bindKeys(handle);
  return handle;
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps The controller's `dispatch` and the limits from main.js.
 * @returns {{ render: (view: MapResizeView) => void }} The handle; `render` shows it with the saved
 *   height, or removes it and the height while no places are saved.
 * @throws {Error} When the page has no page area or no handle template.
 */
export function createMapResize(doc, deps) {
  const handle = buildHandle(doc, deps);
  return {
    render({ isEmpty, settings }) {
      if (isEmpty || settings === null) {
        handle.button.remove();
        applyHeight(handle.area, null);
        return;
      }
      if (!handle.button.isConnected) handle.area.append(handle.button);
      if (!handle.drag.dragging) applyHeight(handle.area, settings.mapHeight);
    },
  };
}
