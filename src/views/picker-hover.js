// @ts-check
/**
 * @module views/picker-hover
 * Owns the hover label of the picker rows: while the pointer is over a row's coloured band, a small
 * label above the band shows that place's local time and date at the pointer's position, for
 * example `8:00 PM · 19-Nov-26` (PCK-008, DSP-001, DSP-002). The instant is the window's start plus
 * the pointer's fraction of the band, rounded to the `pickerStepMinutes` grid. The label is view
 * state only: nothing is dispatched or saved. It does not draw the label (picker.css does), does not
 * know the window (views/picker.js passes it in) and looks up no time zone itself (`localAt` does).
 */
import { formatDate, formatTime } from "../domain/format.js";

/** @typedef {import("../domain/zones.js").LocalDateTime} LocalDateTime */

/**
 * @typedef {object} HoverDeps
 * @property {(instant: number, zone: string) => LocalDateTime} localAt The local time of an instant
 *   in a zone (main.js passes it, because a view imports no other domain module).
 * @property {number} stepMinutes The grid the hovered instant is rounded to (from config).
 */

/**
 * @typedef {object} HoverWindow What the rows cover now.
 * @property {number} from The window's first instant, UTC milliseconds.
 * @property {number} to The window's end, UTC milliseconds, excluded.
 * @property {string[]} zones The time zone of each row, in order.
 */

const msPerMinute = 60 * 1000;

/**
 * @param {Element} track A row's band.
 * @returns {HTMLElement} The label of that row.
 * @throws {Error} When the row has no label.
 */
function labelOf(track) {
  const found = track.parentElement?.querySelector('[data-role="hover"]');
  if (!(found instanceof HTMLElement)) throw new Error("picker-hover: the row has no hover label");
  return found;
}

/**
 * @param {HoverDeps} deps
 * @param {HoverWindow} shown
 * @param {number} fraction The pointer's place on the band, from 0 to 1.
 * @returns {number} The instant there, on the step grid and inside the window.
 */
function instantAt(deps, shown, fraction) {
  const stepMs = deps.stepMinutes * msPerMinute;
  const snapped = Math.round((shown.from + fraction * (shown.to - shown.from)) / stepMs);
  return Math.max(shown.from, Math.min(snapped * stepMs, shown.to - stepMs));
}

/**
 * @param {HTMLElement} label
 * @param {number} x The pointer's distance from the band's left end, in pixels.
 * @param {number} width The band's width, in pixels.
 * @returns {void} Puts the label at the pointer, or against the band's end when it would stick out.
 */
function placeLabel(label, x, width) {
  const half = label.getBoundingClientRect().width / 2;
  label.style.setProperty("--hover-x", `${x}px`);
  if (x < half) label.dataset.align = "start";
  else if (x > width - half) label.dataset.align = "end";
  else label.dataset.align = "center";
}

/**
 * @param {HoverDeps} deps
 * @param {HoverWindow} shown
 * @param {{ track: Element, rowIndex: number, clientX: number }} point
 * @returns {void} Shows the row's label for the pointer's position.
 */
function showAt(deps, shown, point) {
  const zone = shown.zones[point.rowIndex];
  if (zone === undefined) return;
  const box = point.track.getBoundingClientRect();
  const x = Math.min(box.width, Math.max(0, point.clientX - box.left));
  const local = deps.localAt(instantAt(deps, shown, x / box.width), zone);
  const label = labelOf(point.track);
  label.textContent = `${formatTime(local)} · ${formatDate(local)}`;
  label.hidden = false;
  placeLabel(label, x, box.width);
}

/**
 * @param {Element} rows The list of rows.
 * @returns {void} Hides every label.
 */
function hideAll(rows) {
  rows.querySelectorAll('[data-role="hover"]').forEach((label) => label.setAttribute("hidden", ""));
}

/**
 * @param {HTMLElement} rows The list that holds the picker's rows.
 * @param {HoverDeps} deps `localAt` and the step grid from main.js.
 * @returns {{ render: (shown: HoverWindow) => void }} The hover behaviour; `render` tells it the
 *   window and zones the rows show now.
 */
export function createPickerHover(rows, deps) {
  /** @type {HoverWindow} */
  let current = { from: 0, to: 1, zones: [] };
  rows.addEventListener("pointermove", (event) => {
    const track =
      event.target instanceof Element ? event.target.closest('[data-role="track"]') : null;
    hideAll(rows);
    if (track === null) return;
    const rowIndex = [...rows.children].indexOf(track.closest('[data-role="row"]') ?? rows);
    showAt(deps, current, { track, rowIndex, clientX: event.clientX });
  });
  rows.addEventListener("pointerleave", () => hideAll(rows));
  return {
    render(next) {
      current = next;
    },
  };
}
