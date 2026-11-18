// @ts-check
/**
 * @module views/picker-resize
 * Owns the resize handle on the picker panel's left edge: dragging it, or pressing the left and
 * right arrow keys while it has the focus, adds or removes hour slots of the picker window by
 * dispatching `setPickerHours` in whole hours, only when the number changes (LAY-002, LAY-003,
 * DEC-019). It stops widening at the most hours the config allows and when the map column would get
 * narrower than `--map-min-width`; it reads the slot width (`--picker-slot`) from the page. It does
 * not draw the handle (picker.css does), does not save the width (the controller does) and does not
 * know the rest of the panel (views/picker.js builds it and passes the handle in).
 */

/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} ResizeDeps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {{ minHours: number, maxHours: number }} limits The fewest and most hour slots (from
 *   config).
 */

/**
 * @typedef {object} ResizeState
 * @property {number} hours The number of slots shown or last asked for.
 * @property {boolean} dragging Whether a pointer is dragging the handle.
 * @property {number} startX The pointer's horizontal position when the drag began.
 * @property {number} startHours The number of slots when the drag began.
 * @property {number} slot The width of one slot at that time, in pixels.
 * @property {number} ceiling The most slots that fit beside the map at that time.
 */

/** The hours one arrow key adds: the left arrow widens the panel, the right arrow narrows it. */
const keyHours = Object.freeze({ ArrowLeft: 1, ArrowRight: -1 });

/**
 * @param {Element} element
 * @param {string} name A custom property that holds a length in pixels.
 * @returns {number} Its value in pixels.
 */
function lengthOf(element, name) {
  return Number.parseFloat(getComputedStyle(element).getPropertyValue(name));
}

/**
 * @param {HTMLElement} handle
 * @param {number} hours The number of slots now.
 * @param {number} maxHours The most slots the config allows.
 * @returns {{ slot: number, ceiling: number }} The slot width, and the most slots the panel may
 *   have now: as many as leave the map its minimum width, never fewer than it has now.
 */
function measure(handle, hours, maxHours) {
  const panel = handle.closest('[data-role="picker"]');
  const page = panel?.closest('[data-role="page"]');
  if (!panel || !page) throw new Error("picker-resize: the handle is not inside the page");
  const slot = lengthOf(panel, "--picker-slot");
  const mapWidth =
    panel.getBoundingClientRect().left -
    page.getBoundingClientRect().left -
    Number.parseFloat(getComputedStyle(page).paddingLeft);
  const spare = Math.floor((mapWidth - lengthOf(panel, "--map-min-width")) / slot);
  return { slot, ceiling: Math.min(maxHours, hours + Math.max(0, spare)) };
}

/**
 * @param {ResizeDeps} deps
 * @param {ResizeState} state
 * @param {number} target The wanted number of slots.
 * @returns {void} Asks for that many slots, kept within the limits, unless it is the number now.
 */
function requestHours(deps, state, target) {
  const hours = Math.max(deps.limits.minHours, Math.min(target, state.ceiling));
  if (hours === state.hours) return;
  state.hours = hours;
  void deps.dispatch({ type: "setPickerHours", hours });
}

/**
 * @param {HTMLElement} handle
 * @param {ResizeDeps} deps
 * @param {ResizeState} state
 * @returns {void} Wires the drag with pointer capture: one slot width to the left is one more hour.
 */
function bindDrag(handle, deps, state) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    Object.assign(state, {
      dragging: true,
      startX: event.clientX,
      startHours: state.hours,
      ...measure(handle, state.hours, deps.limits.maxHours),
    });
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const slots = Math.round((state.startX - event.clientX) / state.slot);
    requestHours(deps, state, state.startHours + slots);
  });
  for (const type of ["pointerup", "pointercancel"]) {
    handle.addEventListener(type, () => (state.dragging = false));
  }
}

/**
 * @param {HTMLElement} handle
 * @param {ResizeDeps} deps
 * @param {ResizeState} state
 * @returns {void} Wires the left and right arrow keys.
 */
function bindKeys(handle, deps, state) {
  handle.addEventListener("keydown", (event) => {
    if (!(event.key in keyHours)) return;
    event.preventDefault();
    const change = keyHours[/** @type {keyof typeof keyHours} */ (event.key)];
    state.ceiling = measure(handle, state.hours, deps.limits.maxHours).ceiling;
    requestHours(deps, state, state.hours + change);
  });
}

/**
 * @param {HTMLElement} handle The resize button inside the picker panel.
 * @param {ResizeDeps} deps The controller's `dispatch` and the limits from main.js.
 * @returns {{ render: (hours: number) => void }} The handle's behaviour; `render` tells it how many
 *   hour slots the panel shows now.
 */
export function createPickerResize(handle, deps) {
  /** @type {ResizeState} */
  const state = {
    hours: deps.limits.minHours,
    dragging: false,
    startX: 0,
    startHours: 0,
    slot: 1,
    ceiling: deps.limits.maxHours,
  };
  bindDrag(handle, deps, state);
  bindKeys(handle, deps, state);
  return {
    render(hours) {
      state.hours = hours;
    },
  };
}
