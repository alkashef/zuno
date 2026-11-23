// @ts-check
/**
 * @module views/cell-card
 * Owns the hover card of a holiday or vacation cell of the month grid: it shows beside the place's
 * name with the holiday's name, date and (while Hijri is on) Hijri date, or each vacation's label
 * and dates, while the pointer is over the cell or the cell has keyboard focus, and goes when the
 * pointer or the focus leaves (CAL-006, DSP-003, DEC-031). The card has no buttons and takes no
 * pointer events. It clones its markup from templates in index.html. It decides what a cell is
 * (domain/calendar.js does), changes no holiday or vacation (the day menu does) and picks no colour
 * (popovers.css does).
 */
import { formatDate, formatHijri } from "../domain/format.js";

/** @typedef {import("../domain/calendar.js").DayFacts} DayFacts */

/**
 * @typedef {object} CellFacts What the card needs to know of one cell.
 * @property {DayFacts} day The cell's facts.
 * @property {string} countryCode The country of the cell's row.
 */

/**
 * @typedef {object} CardDeps
 * @property {(placeId: string, date: string) => CellFacts | null} factsOf The facts of a cell, or
 *   `null` when the grid has no such cell.
 */

/** The words of the card's kind line. */
const kindText = Object.freeze({ holiday: "Public holiday", vacation: "Vacation" });

/**
 * @param {Document} doc
 * @param {string} id The template's id.
 * @returns {HTMLElement} A copy of the template's markup.
 * @throws {Error} When the page has no such template.
 */
function cloneTemplate(doc, id) {
  const template = doc.querySelector(`#${id}`);
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(`cell card: the page has no #${id}`);
  }
  return /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
}

/**
 * @param {ParentNode} root
 * @param {string} role A `data-role` value.
 * @returns {HTMLElement} The element with that role.
 * @throws {Error} When there is none.
 */
function part(root, role) {
  const found = root.querySelector(`[data-role="${role}"]`);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`cell card: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {string} date `YYYY-MM-DD`.
 * @returns {string} The date as dd-mmm-yy (DSP-001).
 */
function dateText(date) {
  const [year, month, day] = date.split("-").map(Number);
  return formatDate({ year, month, day, hour: 0, minute: 0 });
}

/**
 * @typedef {object} Entry One line group of the card.
 * @property {string} name
 * @property {string} dates
 * @property {string} hijri Empty while Hijri is off.
 * @property {"holiday" | "vacation"} kind
 */

/**
 * @param {DayFacts} day
 * @returns {Entry[]} The day's holiday, then each vacation that covers it (CAL-006).
 */
function entriesOf(day) {
  /** @type {Entry[]} */
  const entries = [];
  if (day.holidayName !== null) {
    const hijri = day.hijri === null ? "" : formatHijri(day.hijri);
    entries.push({ name: day.holidayName, dates: dateText(day.date), hijri, kind: "holiday" });
  }
  for (const { start, end, label } of day.vacations) {
    const dates = `${dateText(start)} to ${dateText(end)}`;
    entries.push({
      name: label === "" ? kindText.vacation : label,
      dates,
      hijri: "",
      kind: "vacation",
    });
  }
  return entries;
}

/**
 * @param {Document} doc
 * @param {Entry} entry
 * @returns {HTMLElement} The markup of one entry.
 */
function buildEntry(doc, entry) {
  const markup = cloneTemplate(doc, "cell-card-entry-template");
  part(markup, "card-swatch").dataset.kind = entry.kind;
  part(markup, "card-name").textContent = entry.name;
  part(markup, "card-date").textContent = entry.dates;
  part(markup, "card-kind").textContent = kindText[entry.kind];
  const hijri = part(markup, "card-hijri");
  hijri.hidden = entry.hijri === "";
  hijri.textContent = entry.hijri;
  return markup;
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
 * @param {CardDeps} deps
 * @param {HTMLElement} cell
 * @returns {Entry[]} The entries of the cell's day; none for a plain day.
 */
function entriesAt(deps, cell) {
  const facts = deps.factsOf(cell.dataset.placeId ?? "", cell.dataset.date ?? "");
  return facts === null ? [] : entriesOf(facts.day);
}

/**
 * @param {CardDeps} deps
 * @param {EventTarget | null} target An event's target.
 * @returns {{ header: Element, entries: Entry[] } | null} The place header the card goes in and the
 *   entries it shows, or `null` when the target is not in a holiday or vacation cell.
 */
function contentOf(deps, target) {
  const cell = cellOf(target);
  if (cell === null) return null;
  const header = cell.closest("tr")?.querySelector('[data-role="place"]') ?? null;
  const entries = entriesAt(deps, cell);
  return header === null || entries.length === 0 ? null : { header, entries };
}

/**
 * @param {Document} doc
 * @param {{ header: Element, entries: Entry[] }} content
 * @returns {HTMLElement} The card, now in the place header.
 */
function buildCard(doc, { header, entries }) {
  const card = cloneTemplate(doc, "cell-card-template");
  card.append(...entries.map((entry) => buildEntry(doc, entry)));
  header.append(card);
  return card;
}

/**
 * Starts the hover card of a month grid.
 * @param {Document} doc The page.
 * @param {HTMLElement} root The month grid's root element; the card listens on it.
 * @param {CardDeps} deps The lookup of a cell's facts.
 * @returns {void}
 * @throws {Error} When the page has no card template.
 */
export function createCellCard(doc, root, deps) {
  /** @type {HTMLElement | null} */
  let card = null;
  const hide = () => {
    card?.remove();
    card = null;
  };
  /** @param {Event} event */
  const show = (event) => {
    hide();
    const content = contentOf(deps, event.target);
    card = content === null ? null : buildCard(doc, content);
  };
  root.addEventListener("pointerenter", show, true);
  root.addEventListener("focusin", show);
  root.addEventListener("pointerleave", hide, true);
  root.addEventListener("focusout", hide);
}
