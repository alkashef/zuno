// @ts-check
/**
 * @module views/day-menu
 * Owns the day menu: one delegated `contextmenu` listener on the month grid opens a `role="menu"`
 * popover at the pointer, made of the choices that `choicesOf` gives for the clicked cell. Add public
 * holiday, Add vacation and Edit vacation open a form (views/day-dialog.js); Hide public holiday,
 * Remove public holiday and Remove vacation act at once. When several vacations cover the day, each
 * Edit and Remove names its vacation by its dates. Escape, a click outside and a new right-click
 * close it (VAC-001, VAC-005, HOL-015, HOL-019, DEC-031).
 * It clones its markup from templates in index.html. It decides no choice (domain/calendar.js does),
 * changes no holiday itself (the controller does, through `dispatch`) and picks no colour
 * (popovers.css does). The menu opens only with a pointer (accepted risk, DEC-031).
 */

import { formatIsoDate } from "../domain/format.js";

/** @typedef {import("../domain/calendar.js").DayFacts} DayFacts */
/** @typedef {import("../domain/calendar.js").DayMenuChoice} DayMenuChoice */
/** @typedef {import("../controller.js").Action} Action */
/** @typedef {{ day: DayFacts, countryCode: string, placeId: string }} CellFacts */
/** @typedef {import("../domain/vacations.js").Vacation} Vacation */

/**
 * @typedef {object} MenuDeps
 * @property {(placeId: string, date: string) => Omit<CellFacts, "placeId"> | null} factsOf The facts of a cell, or
 *   `null` when the grid has no such cell.
 * @property {(day: DayFacts) => DayMenuChoice[]} choicesOf The choices of a day (domain/calendar.js,
 *   passed in by main.js).
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {{ openHoliday: (entry: { countryCode: string, date: string }) => void, openVacation: (entry: { placeId: string, date: string, vacation?: Vacation }) => void }} dialog
 *   The forms of the menu (views/day-dialog.js, passed in by main.js).
 */

/** The words of each choice; `{dates}` is filled in only when several vacations cover the day. */
const choiceText = Object.freeze({
  addHoliday: "Add public holiday…",
  addVacation: "Add vacation…",
  hideHoliday: "Hide public holiday",
  removeHoliday: "Remove public holiday",
  editVacation: "Edit vacation{dates}…",
  removeVacation: "Remove vacation{dates}",
});

/**
 * @param {Document} doc
 * @param {string} id The template's id.
 * @returns {HTMLElement} A copy of the template's markup.
 * @throws {Error} When the page has no such template.
 */
function cloneTemplate(doc, id) {
  const template = doc.querySelector(`#${id}`);
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(`day menu: the page has no #${id}`);
  }
  return /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
}

/**
 * @param {DayMenuChoice} choice
 * @param {boolean} several Whether more than one vacation covers the day.
 * @returns {string} The words of the choice, naming its vacation by its dates when several cover
 *   the day.
 */
function textOf(choice, several) {
  const { vacation } = choice;
  const dates =
    several && vacation !== undefined
      ? ` ${formatIsoDate(vacation.start)} to ${formatIsoDate(vacation.end)}`
      : "";
  return choiceText[choice.kind].replace("{dates}", dates);
}

/**
 * @param {MenuDeps} deps
 * @param {CellFacts} facts The clicked cell.
 * @param {DayMenuChoice} choice
 * @returns {() => void} What picking the choice does.
 */
function actionOf(deps, { day, countryCode, placeId }, { kind, vacation }) {
  const holiday = { countryCode, date: day.date, name: day.holidayName ?? "" };
  const acts = {
    addHoliday: () => deps.dialog.openHoliday(holiday),
    addVacation: () => deps.dialog.openVacation({ placeId, date: day.date }),
    editVacation: () => deps.dialog.openVacation({ placeId, date: day.date, vacation }),
    hideHoliday: () => void deps.dispatch({ type: "hideHoliday", ...holiday }),
    removeHoliday: () => void deps.dispatch({ type: "removeHoliday", ...holiday }),
    removeVacation: () => {
      if (vacation !== undefined) void deps.dispatch({ type: "removeVacation", placeId, vacation });
    },
  };
  return acts[kind];
}

/**
 * @param {Document} doc
 * @param {MenuDeps} deps
 * @param {CellFacts} facts The clicked cell.
 * @param {() => void} close Closes the menu.
 * @returns {HTMLElement} The menu with a button for each choice of the cell.
 */
function buildMenu(doc, deps, facts, close) {
  const menu = cloneTemplate(doc, "day-menu-template");
  const several = facts.day.vacations.length > 1;
  for (const choice of deps.choicesOf(facts.day)) {
    const item = cloneTemplate(doc, "day-menu-item-template");
    item.textContent = textOf(choice, several);
    const act = actionOf(deps, facts, choice);
    item.addEventListener("click", () => {
      close();
      act();
    });
    menu.append(item);
  }
  return menu;
}

/**
 * @param {HTMLElement} menu A menu on the page.
 * @param {MouseEvent} event The right-click.
 * @returns {void} Puts the menu at the pointer, moved back inside the window if it would stick out.
 */
function placeMenu(menu, event) {
  const view = menu.ownerDocument.documentElement;
  const { width, height } = menu.getBoundingClientRect();
  const left = Math.max(0, Math.min(event.clientX, view.clientWidth - width));
  const top = Math.max(0, Math.min(event.clientY, view.clientHeight - height));
  menu.style.setProperty("--menu-left", `${left}px`);
  menu.style.setProperty("--menu-top", `${top}px`);
}

/**
 * @param {EventTarget | null} target An event's target.
 * @returns {HTMLElement | null} The grid cell that holds the target, if any.
 */
function cellOf(target) {
  const cell = target instanceof Element ? target.closest('[data-role="cell"]') : null;
  return cell instanceof HTMLElement ? cell : null;
}

/**
 * @param {Document} doc
 * @param {MenuDeps} deps
 * @param {MouseEvent} event A right-click.
 * @param {() => void} close Closes the menu.
 * @returns {HTMLElement | null} The new menu, on the page and at the pointer; `null` (and the
 *   browser's own menu) when the click is not on a cell.
 */
function openMenu(doc, deps, event, close) {
  const cell = cellOf(event.target);
  if (cell === null) return null;
  event.preventDefault();
  const placeId = cell.dataset.placeId ?? "";
  const found = deps.factsOf(placeId, cell.dataset.date ?? "");
  if (found === null) return null;
  const menu = buildMenu(doc, deps, { ...found, placeId }, close);
  doc.body.append(menu);
  placeMenu(menu, event);
  menu.querySelector("button")?.focus();
  return menu;
}

/**
 * @param {HTMLElement | null} menu The open menu, if any.
 * @param {EventTarget | null} target The target of a pointer press.
 * @returns {boolean} Whether a menu is open and the press is outside it.
 */
function isOutside(menu, target) {
  return menu !== null && !(target instanceof Node && menu.contains(target));
}

/**
 * Starts the day menu of a month grid.
 * @param {Document} doc The page.
 * @param {HTMLElement} root The month grid's root element; the menu listens on it.
 * @param {MenuDeps} deps
 * @returns {void}
 * @throws {Error} When the page has no day-menu template.
 */
export function createDayMenu(doc, root, deps) {
  /** @type {HTMLElement | null} */
  let menu = null;
  const close = () => {
    menu?.remove();
    menu = null;
  };
  doc.addEventListener("pointerdown", (event) => {
    if (isOutside(menu, event.target)) close();
  });
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  root.addEventListener("contextmenu", (event) => {
    close();
    menu = openMenu(doc, deps, event, close);
  });
}
