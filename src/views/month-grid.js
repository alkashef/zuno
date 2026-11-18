// @ts-check
/**
 * @module views/month-grid
 * Owns the month grid: the previous and next month buttons, the day headers, one row per place with
 * one cell per day (weekend, public holiday, split and today cells), and the holiday card beside
 * the place's name (CAL-001 to CAL-007, LAY-001). It clones its markup from templates in
 * index.html. It decides no cell kind (domain/calendar.js does), loads no holiday (the controller
 * does, through `deps.dispatch`) and picks no colour (month-grid.css does, from theme.css).
 */
import {
  formatDate,
  formatHijri,
  formatHijriMonth,
  formatMonth,
  formatWeekday,
} from "../domain/format.js";

/** @typedef {import("../domain/calendar.js").DayFacts} DayFacts */
/** @typedef {import("../domain/hijri.js").HijriDate} HijriDate */
/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {{ name: string, city: string | null, country: string | null }} PlaceFacts */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} MonthGridView The part of the page view the grid draws.
 * @property {boolean} isEmpty
 * @property {DayFacts[][]} grid One row per place.
 * @property {{ year: number, month: number }} month
 * @property {{ places: Place[], showCountry: boolean } | null} settings
 * @property {{ placeId: string, date: string, name: string } | null} selectedHoliday
 */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(place: Place, showCountry: boolean) => PlaceFacts} placeFacts The place's name and,
 *   while country names are on, its country.
 * @property {(doc: Document) => { root: HTMLElement }} makeHijriNote Builds the information button
 *   and card beside the Hijri month band (views/hijri-note.js, passed in by main.js).
 */

/**
 * @typedef {object} GridContext
 * @property {HTMLElement} root The grid section.
 * @property {HTMLTemplateElement} cardTemplate
 * @property {Deps} deps
 * @property {HTMLElement} note The Hijri information button and card, built once.
 * @property {{ signature: string, selected: string }} memo What was last drawn.
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
 * @param {Document} doc
 * @param {string} placeId
 * @param {DayFacts} day A holiday day.
 * @returns {HTMLElement} The button that opens the day's holiday card (CAL-006).
 */
function holidayButton(doc, placeId, day) {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "month-grid-holiday";
  button.dataset.role = "holiday";
  button.dataset.placeId = placeId;
  button.dataset.date = day.date;
  appendHijriDay(doc, button, day);
  button.setAttribute("aria-label", `${day.holidayName}, ${dateText(day.date)}`);
  return button;
}

/**
 * @param {Document} doc
 * @param {string} placeId
 * @param {DayFacts} day
 * @returns {HTMLElement} One cell of a place's row.
 */
function buildCell(doc, placeId, day) {
  const cell = doc.createElement("td");
  cell.className = "month-grid-cell";
  cell.dataset.role = "cell";
  cell.dataset.kind = cellKind(day);
  cell.dataset.today = String(day.isToday);
  cell.dataset.date = day.date;
  if (day.holidayName === null) appendHijriDay(doc, cell, day);
  else cell.append(holidayButton(doc, placeId, day));
  return cell;
}

/**
 * @param {GridContext} ctx
 * @param {{ placeId: string, date: string, name: string }} holiday
 * @param {HijriDate | null} hijri The holiday's Hijri date, or `null` while Hijri is off.
 * @returns {HTMLElement} The card with the holiday's name, date and Hijri date (CAL-006, DSP-003).
 */
function buildCard(ctx, holiday, hijri) {
  const card = /** @type {HTMLElement} */ (
    ctx.cardTemplate.content.firstElementChild?.cloneNode(true)
  );
  part(card, "card-name").textContent = holiday.name;
  part(card, "card-date").textContent = dateText(holiday.date);
  const hijriText = part(card, "card-hijri");
  hijriText.hidden = hijri === null;
  hijriText.textContent = hijri === null ? "" : formatHijri(hijri);
  return card;
}

/**
 * @param {DayFacts[]} days One place's days.
 * @param {string} date `YYYY-MM-DD`.
 * @returns {HijriDate | null} The Hijri date of that day, or `null` while Hijri is off.
 */
function hijriOf(days, date) {
  return days.find((day) => day.date === date)?.hijri ?? null;
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
 * @returns {HTMLElement} The row header: the place's name, and its holiday card when one is open.
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
  if (view.selectedHoliday?.placeId === place.id)
    header.append(
      buildCard(ctx, view.selectedHoliday, hijriOf(view.grid[index], view.selectedHoliday.date)),
    );
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
  const selected = view.selectedHoliday;
  for (const cell of cells) {
    cell.dataset.selected = String(
      selected?.placeId === placeId && selected.date === cell.dataset.date,
    );
  }
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
      run.colSpan = 0;
      run.textContent = text;
      cells.push(run);
    }
    run.colSpan += 1;
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
 * @returns {HTMLTableCellElement} The column header of one day: its number and its weekday.
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
  head.append(number, weekday);
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
  if (days[0].hijri === null) corner.textContent = "Day";
  else {
    const hijri = doc.createElement("span");
    hijri.className = "month-grid-corner-hijri";
    hijri.textContent = "Hijri day";
    corner.append("Day and ", hijri);
  }
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
 * @returns {void} Moves the focus into a newly opened card, or back to the cell of a closed one.
 */
function moveFocus(ctx, view) {
  const selected = view.selectedHoliday;
  const key = selected === null ? "" : `${selected.placeId}|${selected.date}`;
  const previous = ctx.memo.selected;
  ctx.memo.selected = key;
  if (key === previous) return;
  if (selected !== null) {
    part(ctx.root, "card-close").focus();
    return;
  }
  const [placeId, date] = previous.split("|");
  /** @type {HTMLElement | null} */ (
    ctx.root.querySelector(`[data-role="holiday"][data-place-id="${placeId}"][data-date="${date}"]`)
  )?.focus();
}

/**
 * @param {GridContext} ctx
 * @param {MonthGridView} view
 * @returns {void} Brings the grid up to date; it is redrawn only when something it shows changed.
 */
function update(ctx, view) {
  const signature = JSON.stringify([view.grid, view.month, view.settings, view.selectedHoliday]);
  if (signature === ctx.memo.signature) return;
  ctx.memo.signature = signature;
  draw(ctx, view);
  moveFocus(ctx, view);
}

/**
 * @param {GridContext} ctx
 * @param {MouseEvent} event
 * @returns {void} Handles a click: a month button, a holiday cell or the card's close button.
 */
function onClick(ctx, event) {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (button === null) return;
  const { role = "", placeId = "", date = "" } = button.dataset;
  /** @type {Record<string, Action>} */
  const actions = {
    earlier: { type: "showMonth", offset: -1 },
    later: { type: "showMonth", offset: 1 },
    "card-close": { type: "selectHoliday", cell: null },
    holiday: { type: "selectHoliday", cell: { placeId, date } },
  };
  if (role in actions) void ctx.deps.dispatch(actions[role]);
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
  const memo = { signature: "", selected: "" };
  const note = deps.makeHijriNote(doc).root;
  const cardTemplate = templateOf(doc, "month-grid-card-template");
  const ctx = { root, cardTemplate, deps, note, memo };
  root.addEventListener("click", (event) => onClick(ctx, event));
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && memo.selected !== "") {
      void deps.dispatch({ type: "selectHoliday", cell: null });
    }
  });
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
