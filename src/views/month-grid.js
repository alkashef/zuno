// @ts-check
/**
 * @module views/month-grid
 * Owns the month grid: the previous and next month buttons, the day headers, one row per place with
 * one cell per day (weekend, public holiday, vacation, split and today cells; a holiday or vacation
 * cell is a button so it takes focus) and the hooks of the hover card and the day menu on the grid
 * (CAL-001 to CAL-007, LAY-001, HOL-015, HOL-019, VAC-004, DEC-031). It clones its markup from
 * templates in index.html. It decides no cell kind (domain/calendar.js does), loads no holiday (the
 * controller does, through `deps.dispatch`), draws neither the card nor the menu (views/cell-card.js
 * and views/day-menu.js do) and picks no colour (month-grid.css does, from theme.css).
 */
import { formatDate, formatHijriMonth, formatMonth, formatWeekday } from "../domain/format.js";

/** @typedef {import("../domain/calendar.js").DayFacts} DayFacts */
/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {{ name: string, city: string | null, country: string | null }} PlaceFacts */
/** @typedef {import("../controller.js").Action} Action */
/** @typedef {{ day: DayFacts, countryCode: string }} CellFacts One cell and the country of its row. */
/** @typedef {(placeId: string, date: string) => CellFacts | null} FactsOf */

/**
 * @typedef {object} MonthGridView The part of the page view the grid draws.
 * @property {boolean} isEmpty
 * @property {DayFacts[][]} grid One row per place.
 * @property {{ year: number, month: number }} month
 * @property {{ places: Place[], showCountry: boolean } | null} settings
 */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(place: Place, showCountry: boolean) => PlaceFacts} placeFacts The place's name and,
 *   while country names are on, its country.
 * @property {(doc: Document, root: HTMLElement, lookup: { factsOf: FactsOf }) => void} makeCellCard Starts the
 *   hover card on the grid (views/cell-card.js, passed in by main.js).
 * @property {(doc: Document, root: HTMLElement, lookup: { factsOf: FactsOf }) => void} makeDayMenu Starts the day
 *   menu on the grid (views/day-menu.js, passed in by main.js).
 * @property {(doc: Document) => { root: HTMLElement }} makeHijriNote Builds the information button
 *   and card beside the Hijri month band (views/hijri-note.js, passed in by main.js).
 */

/**
 * @typedef {object} GridContext
 * @property {HTMLElement} root The grid section.
 * @property {Deps} deps
 * @property {HTMLElement} note The Hijri information button and card, built once.
 * @property {{ signature: string }} memo What was last drawn.
 * @property {{ view: MonthGridView | null }} latest The view of the last `render`, for the lookup of a cell.
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
    throw new Error(`month grid: the markup has no [data-role="${role}"] element`);
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
    throw new Error(`month grid: the page has no #${id}`);
  }
  return template;
}

/**
 * @param {string} date `YYYY-MM-DD`.
 * @returns {string} The day of the month without a leading zero.
 */
function dayNumber(date) {
  return String(Number(date.slice(8)));
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
 * @param {DayFacts} day
 * @returns {string} `split` for a holiday on a weekend day (CAL-007), else `holiday`, `weekend` or
 *   `plain`.
 */
function cellKind(day) {
  if (day.holidayName !== null) return day.isWeekend ? "split" : "holiday";
  return day.isWeekend ? "weekend" : "plain";
}

/**
 * @param {DayFacts} day
 * @returns {string} The cell's fill (CAL-007, VAC-004): `plain`, `weekend`, `holiday` or
 *   `vacation` for one colour; `split` for weekend and holiday; `vacation-holiday` or
 *   `vacation-weekend` for a vacation day that is also one of those.
 */
function fillName({ fill }) {
  if (fill.first === null) return "plain";
  if (fill.second === null) return fill.first;
  return fill.first === "vacation" ? `vacation-${fill.second}` : "split";
}

/**
 * @param {Document} doc
 * @param {HTMLElement} target The cell or button that shows the day.
 * @param {DayFacts} day
 * @returns {void} Adds the two-digit Hijri day while Hijri is on (HIJ-001, DSP-003).
 */
function appendHijriDay(doc, target, day) {
  if (day.hijri === null) return;
  const hijri = doc.createElement("span");
  hijri.className = "month-grid-hijri";
  hijri.dataset.role = "hijri-day";
  hijri.textContent = String(day.hijri.day).padStart(2, "0");
  target.append(hijri);
}

/**
 * @param {DayFacts} day
 * @returns {string} What the cell's button says: the holiday's name and date, then each vacation's
 *   label and dates.
 */
function dayLabel(day) {
  const holiday = day.holidayName === null ? [] : [`${day.holidayName}, ${dateText(day.date)}`];
  const vacations = day.vacations.map(
    ({ start, end, label }) =>
      `${label === "" ? "Vacation" : label}, ${dateText(start)} to ${dateText(end)}`,
  );
  return [...holiday, ...vacations].join("; ");
}

/**
 * @param {Document} doc
 * @param {DayFacts} day A holiday or vacation day.
 * @returns {HTMLElement} The button that fills the cell, so the cell takes focus and shows its card
 *   (CAL-006).
 */
function dayButton(doc, day) {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "month-grid-day-button";
  button.dataset.role = "day-button";
  appendHijriDay(doc, button, day);
  button.setAttribute("aria-label", dayLabel(day));
  return button;
}

/**
 * @param {Document} doc
 * @param {string} placeId
 * @param {DayFacts} day
 * @returns {HTMLElement} One cell of a place's row, with its place and date for the card and the menu.
 */
function buildCell(doc, placeId, day) {
  const cell = doc.createElement("td");
  cell.className = "month-grid-cell";
  cell.dataset.role = "cell";
  cell.dataset.kind = cellKind(day);
  cell.dataset.fill = fillName(day);
  cell.dataset.today = String(day.isToday);
  cell.dataset.placeId = placeId;
  cell.dataset.date = day.date;
  if (day.holidayName === null && day.vacations.length === 0) appendHijriDay(doc, cell, day);
  else cell.append(dayButton(doc, day));
  return cell;
}

/**
 * @param {Document} doc
 * @param {string} className
 * @param {string} text
 * @returns {HTMLSpanElement} A span of that class holding the text.
 */
function textSpan(doc, className, text) {
  const span = doc.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

/**
 * @param {GridContext} ctx
 * @param {MonthGridView} view
 * @param {number} index The place's position.
 * @returns {HTMLElement} The row header: the place's name (the hover card goes in it).
 */
function buildRowHeader(ctx, view, index) {
  const doc = ctx.root.ownerDocument;
  const place = /** @type {{ places: Place[], showCountry: boolean }} */ (view.settings).places[
    index
  ];
  const header = doc.createElement("th");
  header.scope = "row";
  header.className = "month-grid-place";
  header.dataset.role = "place";
  const facts = ctx.deps.placeFacts(place, view.settings?.showCountry ?? false);
  header.append(textSpan(doc, "month-grid-place-name", facts.name));
  if (facts.country !== null) {
    header.append(textSpan(doc, "month-grid-place-country", facts.country));
  }
  return header;
}

/**
 * @param {GridContext} ctx
 * @param {MonthGridView} view
 * @param {number} index The place's position.
 * @returns {HTMLElement} One row: the place's name and a cell per day.
 */
function buildRow(ctx, view, index) {
  const doc = ctx.root.ownerDocument;
  const row = doc.createElement("tr");
  row.dataset.role = "grid-row";
  const placeId = /** @type {{ places: Place[] }} */ (view.settings).places[index].id;
  const cells = view.grid[index].map((day) => buildCell(doc, placeId, day));
  row.append(buildRowHeader(ctx, view, index), ...cells);
  return row;
}

/**
 * @param {Document} doc
 * @param {DayFacts[]} days One place's days.
 * @returns {HTMLTableCellElement[]} One band cell per run of days in the same Hijri month, as wide
 *   as the run.
 */
function bandCells(doc, days) {
  /** @type {HTMLTableCellElement[]} */
  const cells = [];
  for (const day of days) {
    const text = day.hijri === null ? "" : formatHijriMonth(day.hijri);
    let run = cells.at(-1);
    if (run === undefined || run.textContent !== text) {
      run = doc.createElement("th");
      run.scope = "colgroup";
      run.className = "month-grid-band";
      run.colSpan = 1;
      run.textContent = text;
      cells.push(run);
    } else run.colSpan += 1;
  }
  return cells;
}

/**
 * @param {GridContext} ctx
 * @param {DayFacts[]} days The first place's days; its Hijri months make the band.
 * @returns {HTMLElement} The Hijri month band: the information button, then one cell per Hijri
 *   month the days touch (HIJ-001, HIJ-004).
 */
function buildBand(ctx, days) {
  const doc = ctx.root.ownerDocument;
  const row = doc.createElement("tr");
  row.className = "month-grid-band-row";
  row.dataset.role = "hijri-band";
  const corner = doc.createElement("th");
  corner.className = "month-grid-corner";
  corner.append("Hijri month", ctx.note);
  row.append(corner, ...bandCells(doc, days));
  return row;
}

/**
 * @param {Document} doc
 * @param {string} date `YYYY-MM-DD`.
 * @returns {HTMLTableCellElement} The column header of one day: its weekday above its number.
 */
function buildDayHead(doc, date) {
  const head = doc.createElement("th");
  head.scope = "col";
  head.className = "month-grid-day";
  const number = doc.createElement("span");
  number.className = "month-grid-day-number";
  number.textContent = dayNumber(date);
  const [year, month, day] = date.split("-").map(Number);
  const weekday = doc.createElement("span");
  weekday.className = "month-grid-weekday";
  weekday.textContent = formatWeekday({ year, month, day });
  head.append(weekday, number);
  return head;
}

/**
 * @param {Document} doc
 * @param {DayFacts[]} days The first row's days.
 * @returns {HTMLElement} The header row: an empty corner and one day number per column.
 */
function buildHead(doc, days) {
  const row = doc.createElement("tr");
  const corner = doc.createElement("th");
  corner.className = "month-grid-corner";
  corner.textContent = "Day";
  row.append(corner, ...days.map((day) => buildDayHead(doc, day.date)));
  return row;
}

/**
 * @param {GridContext} ctx
 * @param {MonthGridView} view
 * @returns {void} Redraws the title, the day headers and every row.
 */
function draw(ctx, view) {
  part(ctx.root, "title").textContent = formatMonth(view.month);
  const head = buildHead(ctx.root.ownerDocument, view.grid[0]);
  const showBand = view.grid[0][0].hijri !== null;
  part(ctx.root, "head").replaceChildren(...(showBand ? [buildBand(ctx, view.grid[0])] : []), head);
  part(ctx.root, "body").replaceChildren(
    ...view.grid.map((_, index) => buildRow(ctx, view, index)),
  );
}

/**
 * @param {GridContext} ctx
 * @param {MonthGridView} view
 * @returns {void} Brings the grid up to date; it is redrawn only when something it shows changed.
 */
function update(ctx, view) {
  ctx.latest.view = view;
  const { grid, month, settings } = view;
  const signature = JSON.stringify([grid, month, settings]);
  if (signature === ctx.memo.signature) return;
  ctx.memo.signature = signature;
  draw(ctx, view);
}

/**
 * @param {GridContext} ctx
 * @param {MouseEvent} event
 * @returns {void} Handles a click on the previous or next month button.
 */
function onClick(ctx, event) {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  const role = button?.dataset.role;
  if (role === "earlier") void ctx.deps.dispatch({ type: "showMonth", offset: -1 });
  if (role === "later") void ctx.deps.dispatch({ type: "showMonth", offset: 1 });
}

/**
 * @param {{ view: MonthGridView | null }} latest
 * @returns {FactsOf} The lookup of a cell's facts in the view of the last `render`.
 */
function factsLookup(latest) {
  return (placeId, date) => {
    const places = latest.view?.settings?.places ?? [];
    const index = places.findIndex((place) => place.id === placeId);
    const day = latest.view?.grid[index]?.find((candidate) => candidate.date === date);
    return day === undefined ? null : { day, countryCode: places[index].countryCode };
  };
}

/**
 * @param {Document} doc
 * @param {Deps} deps
 * @returns {GridContext} A new grid, not yet on the page.
 */
function buildGrid(doc, deps) {
  const root = /** @type {HTMLElement} */ (
    templateOf(doc, "month-grid-template").content.firstElementChild?.cloneNode(true)
  );
  const memo = { signature: "" };
  const latest = { view: null };
  const note = deps.makeHijriNote(doc).root;
  const ctx = { root, deps, note, memo, latest };
  root.addEventListener("click", (event) => onClick(ctx, event));
  const lookup = { factsOf: factsLookup(latest) };
  deps.makeCellCard(doc, root, lookup);
  deps.makeDayMenu(doc, root, lookup);
  return ctx;
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps The controller's `dispatch` and the place-name lookup from main.js.
 * @returns {{ render: (view: MonthGridView) => void }} The month grid; `render` shows, updates or
 *   removes it to match the view (no places: no grid).
 * @throws {Error} When the page has no page area or no month-grid template.
 */
export function createMonthGrid(doc, deps) {
  const area = doc.querySelector('[data-role="page"]');
  if (area === null) throw new Error("month grid: the page has no [data-role=page] area");
  templateOf(doc, "month-grid-template");
  /** @type {GridContext | null} */
  let grid = null;
  return {
    render(view) {
      if (view.isEmpty) {
        grid?.root.remove();
        grid = null;
        return;
      }
      if (grid === null) {
        grid = buildGrid(doc, deps);
        area.append(grid.root);
      }
      update(grid, view);
    },
  };
}
