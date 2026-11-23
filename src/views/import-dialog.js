// @ts-check
/**
 * @module views/import-dialog
 * Owns the native `<dialog>` that previews a holidays and vacations import (HOL-017, HOL-018,
 * DEC-032). While `holidayImport` is a preview it opens, says how many of the file's rows can be
 * imported out of the total, names the places that are missing and counts the invalid rows, and has
 * two choices: Cancel (`cancelImport`, also sent by Escape) and "Add N rows" (`confirmImport`,
 * disabled while N is 0). It clones its markup from a template in index.html. It reads no file,
 * decides nothing about a row (domain/holidays-file.js does) and changes no record (the controller
 * does).
 */

/** @typedef {import("../controller.js").Action} Action */
/** @typedef {import("../controller-holidays.js").HolidayImport} HolidayImport */
/** @typedef {Extract<NonNullable<HolidayImport>, { status: "preview" }>} Preview */

/**
 * @typedef {object} ImportDialogView The part of the page view the dialog draws.
 * @property {HolidayImport} holidayImport
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
    throw new Error(`import dialog: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {Document} doc
 * @returns {HTMLDialogElement} A copy of the dialog's template, in the page.
 * @throws {Error} When the page has no import-dialog template.
 */
function makeDialog(doc) {
  const template = doc.querySelector("#import-dialog-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("import dialog: the page has no #import-dialog-template");
  }
  const dialog = template.content.firstElementChild?.cloneNode(true);
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error("import dialog: #import-dialog-template holds no <dialog>");
  }
  doc.body.append(dialog);
  return dialog;
}

/**
 * @param {HTMLDialogElement} dialog
 * @param {Preview} preview
 * @returns {void} Writes the counts, the missing places and the Add button's label into the dialog.
 */
function fill(dialog, preview) {
  const { importable, total, missingPlaces, invalid } = preview;
  part(dialog, "import-summary").textContent = `${importable} of ${total} rows can be imported.`;
  const missing = part(dialog, "import-missing");
  missing.hidden = missingPlaces.length === 0;
  missing.textContent = `Missing places: ${missingPlaces.join(", ")}. Their vacations are not added.`;
  const invalidLine = part(dialog, "import-invalid");
  invalidLine.hidden = invalid === 0;
  invalidLine.textContent = `${invalid} ${invalid === 1 ? "row is" : "rows are"} not valid.`;
  const add = /** @type {HTMLButtonElement} */ (part(dialog, "import-add"));
  add.disabled = importable === 0;
  add.textContent = `Add ${importable} ${importable === 1 ? "row" : "rows"}`;
}

/**
 * @param {HTMLDialogElement} dialog
 * @param {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @returns {void} Wires Cancel and Escape to `cancelImport` and Add to `confirmImport`.
 */
function wire(dialog, dispatch) {
  const cancel = () => void dispatch({ type: "cancelImport" });
  part(dialog, "import-cancel").addEventListener("click", cancel);
  dialog.addEventListener("cancel", cancel);
  part(dialog, "import-add").addEventListener("click", () => {
    void dispatch({ type: "confirmImport" });
  });
}

/**
 * @param {Document} doc The page.
 * @param {{ dispatch: (action: Action) => Promise<void> }} deps The controller's `dispatch`.
 * @returns {{ render: (view: ImportDialogView) => void }} The dialog; `render` opens it for a new
 *   preview and closes it when the preview is gone.
 * @throws {Error} When the page's template lacks a part.
 */
export function createImportDialog(doc, { dispatch }) {
  const dialog = makeDialog(doc);
  wire(dialog, dispatch);
  /** @type {Preview | null} The preview now drawn. */
  let shown = null;
  return {
    render({ holidayImport }) {
      const preview = holidayImport?.status === "preview" ? holidayImport : null;
      if (preview === shown) return;
      shown = preview;
      if (preview === null) {
        dialog.close();
        return;
      }
      fill(dialog, preview);
      if (!dialog.open) dialog.showModal();
    },
  };
}
