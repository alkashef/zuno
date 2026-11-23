// @ts-check
/**
 * @module views/settings-file
 * Owns the "Holidays and vacations file" card of the settings page: the Export button, the Import
 * file picker (CSV), the message shown when an imported file was refused (HOL-010 to HOL-012) and
 * the list of imported files, each with its name, the time and date of its import, the counts of
 * what came from it and a Delete button that asks the import dialog to confirm (HOL-020, HOL-021,
 * DEC-035). The description of the file's format (HOL-016) is static markup of the card, in
 * index.html. It reads and saves no file and decides nothing about a file's content (the controller
 * and domain/holidays-file.js do); the delete dialog is views/import-dialog.js.
 */
import { formatClock } from "../domain/format.js";

/** @typedef {import("../controller.js").Action} Action */
/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {import("../domain/user-holidays.js").ImportRecord} ImportRecord */
/** @typedef {import("../domain/user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {{ holidays: number, hidden: number, vacations: number }} ImportCounts */

/**
 * @typedef {object} FileView The part of the page view the card draws.
 * @property {import("../controller-holidays.js").HolidayImport} holidayImport `{ status: "refused" }`
 *   while the last imported file was refused.
 * @property {UserHolidays} userHolidays Whose `imports` the list shows.
 * @property {{ places: Place[] } | null} settings The places whose vacations the counts include.
 */

/**
 * @typedef {object} FileDeps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(importId: string) => void} askRemove Opens the delete dialog for an imported file
 *   (views/import-dialog.js).
 * @property {(saved: { userHolidays: UserHolidays, places: Place[] }, importId: string) => ImportCounts} countsOf
 *   The counts of what came from an imported file (domain/holidays-file.js).
 */

/**
 * @typedef {object} ListContext
 * @property {HTMLElement} card The file card.
 * @property {HTMLTemplateElement} template The row template.
 * @property {FileDeps} deps
 * @property {{ signature: string }} memo What the list last drew.
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
    throw new Error(`settings file: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {HTMLElement} card The file card.
 * @param {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @returns {void} Wires the Export button and the Import file picker (HOL-010, HOL-011). The picker
 *   is cleared after each pick, so the same file can be chosen again.
 */
function wireButtons(card, dispatch) {
  part(card, "holiday-export").addEventListener("click", () => {
    void dispatch({ type: "exportHolidays" });
  });
  const input = /** @type {HTMLInputElement} */ (part(card, "holiday-file-picker"));
  input.addEventListener("change", () => {
    const [file] = input.files ?? [];
    if (file !== undefined) void dispatch({ type: "importHolidays", file });
    input.value = "";
  });
}

/**
 * @param {number} count
 * @param {string} noun The singular noun.
 * @returns {string} For example `1 holiday` or `2 holidays`.
 */
function counted(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/**
 * @param {ImportCounts} counts
 * @returns {string} For example `2 holidays, 0 hidden holidays, 2 vacations` (HOL-020).
 */
function countsText({ holidays, hidden, vacations }) {
  return [
    counted(holidays, "holiday"),
    counted(hidden, "hidden holiday"),
    counted(vacations, "vacation"),
  ].join(", ");
}

/**
 * @param {ListContext} ctx
 * @param {ImportRecord} record
 * @param {ImportCounts} counts
 * @returns {HTMLElement} One row: the name, the time and date of the import, the counts and the
 *   Delete button.
 */
function buildRow(ctx, record, counts) {
  const row = /** @type {HTMLElement} */ (ctx.template.content.firstElementChild?.cloneNode(true));
  part(row, "import-name").textContent = record.fileName;
  part(row, "import-time").textContent = formatClock(record.importedAt);
  part(row, "import-counts").textContent = countsText(counts);
  const button = part(row, "import-delete");
  button.setAttribute("aria-label", `Delete ${record.fileName}`);
  button.dataset.importId = record.id;
  return row;
}

/**
 * @param {ListContext} ctx
 * @param {FileView} view
 * @returns {void} Redraws the list of imported files, only when a record or a count changed, and
 *   the line that says no file is imported (HOL-020).
 */
function drawImports(ctx, view) {
  const imports = view.userHolidays.imports ?? [];
  const saved = { userHolidays: view.userHolidays, places: view.settings?.places ?? [] };
  const rows = imports.map((record) => ({ record, counts: ctx.deps.countsOf(saved, record.id) }));
  const signature = JSON.stringify(rows);
  if (signature === ctx.memo.signature) return;
  ctx.memo.signature = signature;
  const list = part(ctx.card, "import-list");
  list.replaceChildren(...rows.map(({ record, counts }) => buildRow(ctx, record, counts)));
  list.hidden = rows.length === 0;
  part(ctx.card, "import-list-empty").hidden = rows.length > 0;
}

/**
 * @param {Document} doc The page, which holds the row template (the panel's nodes belong to the
 *   template's own document).
 * @param {HTMLElement} card The file card, inside the open panel.
 * @param {FileDeps} deps The controller's `dispatch`, the delete dialog's opener and the counts.
 * @returns {{ render: (view: FileView) => void }} The card; `render` shows the refusal message
 *   while an import is refused and draws the list of imported files.
 * @throws {Error} When the card's markup lacks a part or the page has no row template.
 */
export function createFileSection(doc, card, deps) {
  wireButtons(card, deps.dispatch);
  const template = doc.querySelector("#settings-import-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("settings file: the page has no #settings-import-template");
  }
  const ctx = { card, template, deps, memo: { signature: "" } };
  part(card, "import-list").addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (button?.dataset.importId !== undefined) deps.askRemove(button.dataset.importId);
  });
  const refused = part(card, "import-refused");
  return {
    render(view) {
      refused.hidden = view.holidayImport?.status !== "refused";
      drawImports(ctx, view);
    },
  };
}
