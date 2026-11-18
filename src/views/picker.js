// @ts-check
/**
 * @module views/picker
 * Owns the time picker panel: the hour axis of the reference window, one row per place with its
 * local date and time and its stretches of working, non-working and day-off time, and the marker,
 * moved by dragging or with the arrow keys (PCK-001 to PCK-003, PCK-005, PCK-006, DSP-001,
 * DSP-002, LAY-001). It keeps each row's marker time beside the marker line and its name clear of
 * both. It clones its markup from templates in index.html. It does not own the day
 * selector (views/day-selector.js, built by `deps.makeDaySelector`), computes no window or kind of
 * time (domain/picker.js does) and picks no colour (picker.css does, from theme.css).
 */
import { formatDate, formatHijri, formatOffset, formatTime } from "../domain/format.js";

/** @typedef {import("../domain/picker.js").PickerRow} PickerRow */
/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {{ name: string, city: string | null, country: string | null }} PlaceFacts */
/** @typedef {import("../domain/zones.js").LocalDateTime} LocalDateTime */
/** @typedef {import("../controller.js").Action} Action */
/** @typedef {import("./day-selector.js").DaySelectorView} DaySelectorView */

/**
 * @typedef {object} PickerView The part of the page view the picker draws.
 * @property {boolean} isEmpty
 * @property {PickerRow[]} picker
 * @property {{ instant: number }} marker
 * @property {{ places: Place[], showCountry: boolean } | null} settings
 */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(instant: number, zone: string) => LocalDateTime} localAt The local time of an instant
 *   in a zone (main.js passes it, because a view imports no other domain module).
 * @property {(instant: number, zone: string) => number} offsetAt A zone's offset from UTC at an
 *   instant, in milliseconds.
 * @property {(place: Place, showCountry: boolean) => PlaceFacts} placeFacts The place's name and,
 *   where they apply, its city and country.
 * @property {{ stepMinutes: number, axisLabelEveryHours: number }} steps How far one arrow key press
 *   and the drag move the marker, and how often the axis is labelled (from config).
 * @property {(slot: HTMLElement) => { render: (view: DaySelectorView) => void }} makeDaySelector
 *   Builds the day selector inside the panel.
 */

/**
 * @typedef {object} Range The instants every row covers.
 * @property {number} from UTC milliseconds, included.
 * @property {number} to UTC milliseconds, excluded.
 */

/**
 * @typedef {object} Memo What the open panel last drew.
 * @property {string} signature The rows and settings last drawn.
 * @property {Range} range
 * @property {number} marker The marker's instant.
 * @property {boolean} dragging Whether a pointer is dragging the marker.
 */

/**
 * @typedef {object} PanelContext
 * @property {HTMLElement} root The panel.
 * @property {HTMLTemplateElement} rowTemplate
 * @property {Deps} deps
 * @property {Memo} memo
 */

/** The direction of the marker for each arrow key. */
const keyDirections = Object.freeze({ ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 });

const msPerMinute = 60 * 1000;
const msPerHour = 60 * msPerMinute;

/**
 * @param {ParentNode} root
 * @param {string} role A `data-role` value.
 * @returns {HTMLElement} The element with that role.
 * @throws {Error} When there is none.
 */
function part(root, role) {
  const found = root.querySelector(`[data-role="${role}"]`);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`picker: the markup has no [data-role="${role}"] element`);
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
    throw new Error(`picker: the page has no #${id}`);
  }
  return template;
}

/**
 * @param {PickerRow[]} rows At least one row; every row covers the same window.
 * @returns {Range} The window the rows cover.
 */
function windowOf(rows) {
  const { segments } = rows[0];
  const from = segments[0].from;
  return { from, to: segments.at(-1)?.to ?? from };
}

/**
 * @param {HTMLElement} track
 * @param {PickerRow} row
 * @param {Range} range
 * @returns {void} Draws the row's stretches as parts of the track's width.
 */
function drawSegments(track, row, range) {
  const span = range.to - range.from;
  const stretches = row.segments.map((segment) => {
    const element = track.ownerDocument.createElement("div");
    element.className = "picker-segment";
    element.dataset.role = "segment";
    element.dataset.kind = segment.kind;
    element.style.setProperty("--segment-start", String((segment.from - range.from) / span));
    element.style.setProperty("--segment-size", String((segment.to - segment.from) / span));
    return element;
  });
  track.replaceChildren(...stretches);
}

/**
 * @typedef {object} RowText What a row says about its place.
 * @property {PlaceFacts} facts
 * @property {string} offset The place's offset from UTC at the marker, for example `UTC+3`.
 */

/**
 * @param {PanelContext} ctx
 * @param {PickerRow} row
 * @param {RowText} text
 * @param {Range} range
 * @returns {HTMLElement} One row: the name, offset and details of the place, the local time and
 *   date at the marker (and Hijri date while Hijri is on), and the track.
 */
function buildRow(ctx, row, text, range) {
  const item = /** @type {HTMLElement} */ (
    ctx.rowTemplate.content.firstElementChild?.cloneNode(true)
  );
  part(item, "name").textContent = text.facts.name;
  part(item, "zone").textContent = text.offset;
  const sub = part(item, "sub");
  sub.textContent = [text.facts.city, text.facts.country].filter(Boolean).join(" · ");
  sub.hidden = sub.textContent === "";
  part(item, "local-date").textContent = formatDate(row.localDateTime);
  part(item, "local-time").textContent = formatTime(row.localDateTime);
  const hijri = part(item, "local-hijri");
  hijri.hidden = row.hijri === null;
  hijri.textContent = row.hijri === null ? "" : formatHijri(row.hijri);
  drawSegments(part(item, "track"), row, range);
  return item;
}

/**
 * @param {PanelContext} ctx
 * @param {PickerView} view
 * @param {Range} range
 * @returns {void} Draws one row per place; the first is the reference (PCK-006).
 */
function drawRows(ctx, view, range) {
  const places = view.settings?.places ?? [];
  const showCountry = view.settings?.showCountry ?? false;
  const items = view.picker.map((row, index) => {
    const text = {
      facts: ctx.deps.placeFacts(places[index], showCountry),
      offset: formatOffset(ctx.deps.offsetAt(view.marker.instant, places[index].zone)),
    };
    const item = buildRow(ctx, row, text, range);
    item.dataset.reference = String(index === 0);
    return item;
  });
  part(ctx.root, "rows").replaceChildren(...items);
}

/**
 * @param {Document} doc
 * @param {string} text The label, a time of day.
 * @param {number} position The label's place on the axis, from 0 to 1.
 * @returns {HTMLElement} One label of the axis.
 */
function buildTick(doc, text, position) {
  const tick = doc.createElement("span");
  tick.className = "picker-tick";
  tick.dataset.role = "tick";
  tick.textContent = text;
  tick.style.setProperty("--tick-position", String(position));
  return tick;
}

/**
 * @param {PanelContext} ctx
 * @param {PickerView} view
 * @param {Range} range
 * @returns {void} Labels the axis with the reference place's local time at every few hours.
 */
function drawTicks(ctx, view, range) {
  const axis = part(ctx.root, "axis");
  const zone = view.settings?.places[0]?.zone ?? "UTC";
  const every = ctx.deps.steps.axisLabelEveryHours;
  const hourCount = Math.round((range.to - range.from) / msPerHour);
  ctx.root.style.setProperty("--hour-count", String(hourCount));
  const ticks = Array.from({ length: hourCount + 1 }, (_, hour) => hour)
    .filter((hour) => hour % every === 0)
    .map((hour) => {
      const text = formatTime(ctx.deps.localAt(range.from + hour * msPerHour, zone));
      return buildTick(axis.ownerDocument, text, (hour * msPerHour) / (range.to - range.from));
    });
  axis.querySelectorAll('[data-role="tick"]').forEach((old) => old.remove());
  axis.prepend(...ticks);
}

/**
 * @param {PanelContext} ctx
 * @param {PickerView} view
 * @param {Range} range
 * @returns {void} Puts the marker at its instant and describes it to assistive technology.
 */
function drawMarker(ctx, view, range) {
  const handle = part(ctx.root, "handle");
  const { instant } = view.marker;
  const local = view.picker[0].localDateTime;
  ctx.root.style.setProperty(
    "--marker-fraction",
    String((instant - range.from) / (range.to - range.from)),
  );
  handle.setAttribute("aria-valuemin", String(range.from));
  handle.setAttribute("aria-valuemax", String(range.to));
  handle.setAttribute("aria-valuenow", String(instant));
  handle.setAttribute("aria-valuetext", `${formatDate(local)} ${formatTime(local)}`);
}

/**
 * @typedef {object} InfoLayout Where a row's name and marker time go, in pixels from the row's
 *   left edge.
 * @property {number} markLeft
 * @property {number} nameLeft
 * @property {number} nameWidth
 * @property {"start" | "end"} nameSide Whether the name sits at the row's start or its end.
 */

/**
 * @param {{ width: number, x: number, markWidth: number, gap: number }} room The row's width, the
 *   marker's position, the widest marker time, and the space kept around the marker and the time.
 * @returns {InfoLayout} The time just right of the marker when it fits there, else just left of
 *   it; the name in the wider of the two spaces the marker and the time leave.
 */
function infoLayout({ width, x, markWidth, gap }) {
  const markRight = x + gap + markWidth <= width;
  const markLeft = markRight ? x + gap : x - gap - markWidth;
  const before = markRight ? x - gap : markLeft - gap;
  const afterStart = markRight ? markLeft + markWidth + gap : x + gap;
  if (before >= width - afterStart) {
    return { markLeft, nameLeft: 0, nameWidth: Math.max(0, before), nameSide: "start" };
  }
  return { markLeft, nameLeft: afterStart, nameWidth: width - afterStart, nameSide: "end" };
}

/**
 * @param {PanelContext} ctx
 * @returns {void} Places every row's marker time beside the marker and its name clear of both,
 *   through the custom properties `--mark-left`, `--name-left` and `--name-width`.
 */
function arrangeInfo(ctx) {
  const content = part(ctx.root, "content");
  const marks = [...content.querySelectorAll('[data-role="mark"]')];
  const { from, to } = ctx.memo.range;
  const width = content.clientWidth;
  const layout = infoLayout({
    width,
    x: ((ctx.memo.marker - from) / (to - from)) * width,
    markWidth: Math.max(0, ...marks.map((mark) => mark.getBoundingClientRect().width)),
    gap: Number.parseFloat(getComputedStyle(content).getPropertyValue("--space-marker")),
  });
  content.style.setProperty("--mark-left", `${layout.markLeft}px`);
  content.style.setProperty("--name-left", `${layout.nameLeft}px`);
  content.style.setProperty("--name-width", `${layout.nameWidth}px`);
  content.dataset.nameSide = layout.nameSide;
}

/**
 * @param {PanelContext} ctx
 * @param {PickerView} view
 * @returns {void} Brings the panel up to date; the rows and axis are redrawn only when they changed.
 */
function update(ctx, view) {
  const range = windowOf(view.picker);
  ctx.memo.range = range;
  ctx.memo.marker = view.marker.instant;
  drawMarker(ctx, view, range);
  const signature = JSON.stringify([view.picker, view.settings]);
  if (signature !== ctx.memo.signature) {
    ctx.memo.signature = signature;
    drawRows(ctx, view, range);
    drawTicks(ctx, view, range);
  }
  arrangeInfo(ctx);
}

/**
 * @param {PanelContext} ctx
 * @param {number} instant UTC milliseconds.
 * @returns {void} Moves the marker there, unless it is already there (PCK-002).
 */
function moveTo(ctx, instant) {
  if (instant !== ctx.memo.marker) void ctx.deps.dispatch({ type: "setMarker", instant });
}

/**
 * @param {PanelContext} ctx
 * @param {number} clientX The pointer's horizontal position in the page.
 * @returns {number} The instant under the pointer, on the step grid and inside the window.
 */
function instantAt(ctx, clientX) {
  const box = part(ctx.root, "axis").getBoundingClientRect();
  const fraction = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
  const { from, to } = ctx.memo.range;
  const stepMs = ctx.deps.steps.stepMinutes * msPerMinute;
  const snapped = Math.round((from + fraction * (to - from)) / stepMs) * stepMs;
  return Math.max(from, Math.min(snapped, to - stepMs));
}

/**
 * @param {PanelContext} ctx
 * @param {PointerEvent} event
 * @returns {void} Starts a drag on the axis or the rows; a press away from the handle moves the
 *   marker there at once.
 */
function startDrag(ctx, event) {
  const target = event.target instanceof Element ? event.target : null;
  const onTrack =
    target?.closest('[data-role="axis"], [data-role="rows"], [data-role="handle"]') ?? null;
  if (event.button !== 0 || target === null || onTrack === null) return;
  ctx.memo.dragging = true;
  ctx.root.setPointerCapture(event.pointerId);
  if (target.closest('[data-role="handle"]') === null) moveTo(ctx, instantAt(ctx, event.clientX));
}

/**
 * @param {PanelContext} ctx
 * @param {KeyboardEvent} event
 * @returns {void} Moves the marker to the previous or next step with an arrow key.
 */
function stepWithKey(ctx, event) {
  if (!(event.key in keyDirections)) return;
  event.preventDefault();
  const direction = keyDirections[/** @type {keyof typeof keyDirections} */ (event.key)];
  const stepMs = ctx.deps.steps.stepMinutes * msPerMinute;
  const grid = ctx.memo.marker / stepMs;
  moveTo(ctx, (direction > 0 ? Math.floor(grid) + 1 : Math.ceil(grid) - 1) * stepMs);
}

/**
 * @param {PanelContext} ctx
 * @returns {void} Wires the drag and the arrow keys (PCK-001).
 */
function bindMarker(ctx) {
  const { root, memo } = ctx;
  root.addEventListener("pointerdown", (event) => startDrag(ctx, event));
  root.addEventListener("pointermove", (event) => {
    if (memo.dragging) moveTo(ctx, instantAt(ctx, event.clientX));
  });
  for (const type of ["pointerup", "pointercancel"]) {
    root.addEventListener(type, () => (memo.dragging = false));
  }
  part(root, "handle").addEventListener("keydown", (event) => stepWithKey(ctx, event));
}

/**
 * @param {Document} doc
 * @param {Deps} deps
 * @returns {{ ctx: PanelContext, daySelector: { render: (view: DaySelectorView) => void } }}
 *   A new panel with its day selector, not yet on the page.
 */
function buildPanel(doc, deps) {
  const root = /** @type {HTMLElement} */ (
    templateOf(doc, "picker-template").content.firstElementChild?.cloneNode(true)
  );
  const memo = { signature: "", range: { from: 0, to: 1 }, marker: 0, dragging: false };
  const ctx = { root, rowTemplate: templateOf(doc, "picker-row-template"), deps, memo };
  bindMarker(ctx);
  new ResizeObserver(() => arrangeInfo(ctx)).observe(part(root, "content"));
  return { ctx, daySelector: deps.makeDaySelector(part(root, "day-selector-slot")) };
}

/**
 * @typedef {object} Site Where the panel lives.
 * @property {Document} doc
 * @property {Deps} deps
 * @property {Element} area The page area the panel goes in.
 */

/**
 * @param {Site} site
 * @param {ReturnType<typeof buildPanel> | null} panel The open panel, if any.
 * @param {PickerView} view
 * @returns {ReturnType<typeof buildPanel> | null} The panel after showing, updating or removing it.
 */
function syncPanel(site, panel, view) {
  if (view.isEmpty) {
    panel?.ctx.root.remove();
    return null;
  }
  const shown = panel ?? buildPanel(site.doc, site.deps);
  if (panel === null) site.area.append(shown.ctx.root);
  update(shown.ctx, view);
  shown.daySelector.render(view);
  return shown;
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps The controller's `dispatch`, lookups and steps from main.js.
 * @returns {{ render: (view: PickerView) => void }} The picker; `render` shows, updates or removes
 *   the panel to match the view (no places: no panel).
 * @throws {Error} When the page has no page area or no picker template.
 */
export function createPicker(doc, deps) {
  const area = doc.querySelector('[data-role="page"]');
  if (area === null) throw new Error("picker: the page has no [data-role=page] area");
  templateOf(doc, "picker-template");
  /** @type {ReturnType<typeof buildPanel> | null} */
  let panel = null;
  return {
    render(view) {
      panel = syncPanel({ doc, deps, area }, panel, view);
    },
  };
}
