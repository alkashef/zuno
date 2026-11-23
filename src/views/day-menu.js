// @ts-check
/**
 * @module views/day-menu
 * Owns the day menu: one delegated `contextmenu` listener on the month grid opens a `role="menu"`
 * popover at the pointer, made of the choices that `choicesOf` gives for the clicked cell. Add
 * public holiday opens the form (views/day-dialog.js); Hide public holiday and Remove public holiday
 * act at once. Escape, a click outside and a new right-click close it (HOL-015, HOL-019, DEC-031).
 * It clones its markup from templates in index.html. It decides no choice (domain/calendar.js does),
 * changes no holiday itself (the controller does, through `dispatch`) and picks no colour
 * (popovers.css does). The menu opens only with a pointer (accepted risk, DEC-031).
 */

/** @typedef {import("../domain/calendar.js").DayFacts} DayFacts */
/** @typedef {import("../domain/calendar.js").DayMenuChoice} DayMenuChoice */
/** @typedef {import("../controller.js").Action} Action */
/** @typedef {{ day: DayFacts, countryCode: string }} CellFacts */

/**
 * @typedef {object} MenuDeps
 * @property {(placeId: string, date: string) => CellFacts | null} factsOf The facts of a cell, or
 *   `null` when the grid has no such cell.
 * @property {(day: DayFacts) => DayMenuChoice[]} choicesOf The choices of a day (domain/calendar.js,
 *   passed in by main.js).
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {{ openHoliday: (entry: { countryCode: string, date: string }) => void }} dialog The
 *   forms of the menu (views/day-dialog.js, passed in by main.js).
 */

/** The words of each choice. */
const choiceText = Object.freeze({
  addHoliday: "Add public holiday…",
  hideHoliday: "Hide public holiday",
  removeHoliday: "Remove public holiday",
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
 * @param {MenuDeps} deps
 * @param {CellFacts} facts The clicked cell.
 * @param {DayMenuChoice} choice
 * @returns {() => void} What picking the choice does.
 */
function actionOf(deps, { day, countryCode }, choice) {
  const entry = { countryCode, date: day.date, name: day.holidayName ?? "" };
  if (choice.kind === "addHoliday") return () => deps.dialog.openHoliday(entry);
  return () => void deps.dispatch({ type: choice.kind, ...entry });
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
  for (const choice of deps.choicesOf(facts.day)) {
    const item = cloneTemplate(doc, "day-menu-item-template");
    item.textContent = choiceText[choice.kind];
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
  const facts = deps.factsOf(cell.dataset.placeId ?? "", cell.dataset.date ?? "");
  if (facts === null) return null;
  const menu = buildMenu(doc, deps, facts, close);
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
