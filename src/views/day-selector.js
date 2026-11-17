// @ts-check
/**
 * @module views/day-selector
 * Owns the picker's day selector: the previous-day and next-day buttons, the date button that shows
 * the marker's date in the first place, and the month calendar that button opens. A day picked in
 * the calendar closes it; Escape closes it and returns the focus to the date button (PCK-007,
 * DSP-001). It clones its markup from templates in index.html. It does not move the marker (the
 * controller does, through `deps.dispatch`) and does not lay out the weeks (`deps.monthWeeks` does).
 */
import { formatDate, formatMonth } from "../domain/format.js";

/** @typedef {import("../domain/zones.js").LocalDateTime} LocalDateTime */
/** @typedef {import("../controller.js").Action} Action */
/** @typedef {{ year: number, month: number }} MonthRef */

/**
 * @typedef {object} DaySelectorView The part of the page view the selector draws.
 * @property {{ localDateTime: LocalDateTime }[]} picker The first row is the reference place.
 */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(month: MonthRef) => (number | null)[][]} monthWeeks The days of a month in weeks.
 */

/**
 * @typedef {object} State What the selector remembers.
 * @property {HTMLElement | null} calendar The open calendar, if any.
 * @property {MonthRef} shown The month the calendar shows.
 * @property {LocalDateTime} selected The marker's date and time in the first place.
 */

/**
 * @typedef {object} SelectorContext
 * @property {Document} doc
 * @property {HTMLElement} root
 * @property {HTMLTemplateElement} calendarTemplate
 * @property {Deps} deps
 * @property {State} state
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
    throw new Error(`day selector: the markup has no [data-role="${role}"] element`);
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
  const template = doc.querySelector(`#${id}`);
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(`day selector: the page has no #${id}`);
  }
  return template;
}

/**
 * @param {SelectorContext} ctx
 * @param {number} day Day of the shown month.
 * @returns {HTMLElement} The button of one day of the calendar.
 */
function buildDay(ctx, day) {
  const { shown, selected } = ctx.state;
  const button = ctx.doc.createElement("button");
  button.type = "button";
  button.className = "button calendar-day";
  button.textContent = String(day);
  button.dataset.day = String(day);
  button.setAttribute("aria-label", formatDate({ ...shown, day, hour: 0, minute: 0 }));
  const isSelected = shown.year === selected.year && shown.month === selected.month;
  if (isSelected && day === selected.day) button.setAttribute("aria-current", "date");
  return button;
}

/**
 * @param {SelectorContext} ctx
 * @param {(number | null)[]} week
 * @returns {HTMLElement} One row of the calendar; a cell is empty outside the month.
 */
function buildWeek(ctx, week) {
  const row = ctx.doc.createElement("tr");
  for (const day of week) {
    const cell = ctx.doc.createElement("td");
    if (day !== null) cell.append(buildDay(ctx, day));
    row.append(cell);
  }
  return row;
}

/**
 * @param {SelectorContext} ctx
 * @returns {void} Draws the shown month's title and weeks into the open calendar.
 */
function drawCalendar(ctx) {
  const { calendar, shown } = ctx.state;
  if (calendar === null) return;
  part(calendar, "title").textContent = formatMonth(shown);
  const weeks = ctx.deps.monthWeeks(shown).map((week) => buildWeek(ctx, week));
  part(calendar, "weeks").replaceChildren(...weeks);
}

/**
 * @param {SelectorContext} ctx
 * @param {number} offset Months to move; negative for earlier.
 * @returns {void}
 */
function showMonth(ctx, offset) {
  const { year, month } = ctx.state.shown;
  const index = year * 12 + month - 1 + offset;
  ctx.state.shown = { year: Math.floor(index / 12), month: (index % 12) + 1 };
  drawCalendar(ctx);
}

/**
 * @param {SelectorContext} ctx
 * @param {boolean} returnFocus Whether the date button takes the keyboard focus back.
 * @returns {void} Closes the calendar, if it is open.
 */
function closeCalendar(ctx, returnFocus) {
  if (ctx.state.calendar === null) return;
  ctx.state.calendar.remove();
  ctx.state.calendar = null;
  const date = part(ctx.root, "date");
  date.setAttribute("aria-expanded", "false");
  if (returnFocus) date.focus();
}

/**
 * @param {SelectorContext} ctx
 * @param {number} day A day of the shown month.
 * @returns {void} Moves the marker to that day, keeping its time of day (PCK-007).
 */
function pickDay(ctx, day) {
  const { year, month } = ctx.state.shown;
  void ctx.deps.dispatch({ type: "setMarker", date: { year, month, day } });
  closeCalendar(ctx, true);
}

/**
 * @param {SelectorContext} ctx
 * @param {MouseEvent} event
 * @returns {void} Handles a click on a calendar button: earlier month, later month or a day.
 */
function onCalendarClick(ctx, event) {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (button === null) return;
  if (button.dataset.role === "earlier") showMonth(ctx, -1);
  else if (button.dataset.role === "later") showMonth(ctx, 1);
  else if (button.dataset.day !== undefined) pickDay(ctx, Number(button.dataset.day));
}

/**
 * @param {SelectorContext} ctx
 * @returns {void} Closes the calendar when a press lands outside the selector; removes itself once
 *   the calendar is closed or the selector has left the page.
 */
function watchOutsidePress(ctx) {
  /** @param {PointerEvent} event */
  const onPress = (event) => {
    const outside = !(event.target instanceof Node) || !ctx.root.contains(event.target);
    if (outside) closeCalendar(ctx, false);
    if (ctx.state.calendar === null || !ctx.root.isConnected) {
      ctx.doc.removeEventListener("pointerdown", onPress);
    }
  };
  ctx.doc.addEventListener("pointerdown", onPress);
}

/**
 * @param {SelectorContext} ctx
 * @returns {void} Opens the calendar on the month of the marker's date and focuses that day.
 */
function openCalendar(ctx) {
  const { selected } = ctx.state;
  const calendar = /** @type {HTMLElement} */ (
    ctx.calendarTemplate.content.firstElementChild?.cloneNode(true)
  );
  calendar.addEventListener("click", (event) => onCalendarClick(ctx, event));
  ctx.state.calendar = calendar;
  ctx.state.shown = { year: selected.year, month: selected.month };
  drawCalendar(ctx);
  ctx.root.append(calendar);
  part(ctx.root, "date").setAttribute("aria-expanded", "true");
  /** @type {HTMLElement | null} */ (calendar.querySelector('[aria-current="date"]'))?.focus();
  watchOutsidePress(ctx);
}

/**
 * @param {SelectorContext} ctx
 * @returns {void} Wires the buttons, Escape and the focus leaving the selector.
 */
function bindControls(ctx) {
  const { root } = ctx;
  part(root, "previous").addEventListener("click", () => {
    void ctx.deps.dispatch({ type: "shiftMarkerDay", days: -1 });
  });
  part(root, "next").addEventListener("click", () => {
    void ctx.deps.dispatch({ type: "shiftMarkerDay", days: 1 });
  });
  part(root, "date").addEventListener("click", () => {
    if (ctx.state.calendar === null) openCalendar(ctx);
    else closeCalendar(ctx, true);
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCalendar(ctx, true);
  });
  root.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (next instanceof Node && !root.contains(next)) closeCalendar(ctx, false);
  });
}

/**
 * @param {Document} doc The page.
 * @param {HTMLElement} slot The element the selector goes in.
 * @param {Deps} deps The controller's `dispatch` and the month layout from main.js.
 * @returns {{ render: (view: DaySelectorView) => void }} The selector; `render` shows the marker's
 *   date in the first place. An open calendar is not redrawn, so the focus stays on its button.
 * @throws {Error} When the page has no day-selector or calendar template.
 */
export function createDaySelector(doc, slot, deps) {
  const root = /** @type {HTMLElement} */ (
    templateOf(doc, "day-selector-template").content.firstElementChild?.cloneNode(true)
  );
  const calendarTemplate = templateOf(doc, "calendar-template");
  const selected = { year: 0, month: 1, day: 1, hour: 0, minute: 0 };
  const state = { calendar: null, shown: { year: 0, month: 1 }, selected };
  bindControls({ doc, root, calendarTemplate, deps, state });
  slot.append(root);
  return {
    render(view) {
      state.selected = view.picker[0].localDateTime;
      part(root, "date").textContent = formatDate(state.selected);
    },
  };
}
