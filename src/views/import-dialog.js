// @ts-check
/**
 * @module views/import-dialog
 * Owns the two native `<dialog>`s of the imported files. The first previews an import (HOL-017,
 * HOL-018, DEC-032): while `holidayImport` is a preview it opens, says how many of the file's rows
 * can be imported out of the total, names the places that are missing and counts the invalid rows,
 * and has two choices: Cancel (`cancelImport`, also sent by Escape) and "Add N rows"
 * (`confirmImport`, disabled while N is 0). The second asks before an imported file is deleted
 * (HOL-021, HOL-022, DEC-035): `askRemove` opens it for a file, it says how many entries go and how
 * many stay, and has Cancel (also Escape, which close it and change nothing) and "Delete N entries"
 * (`removeImport`). Each clones its markup from a template in index.html. It reads no file, decides
 * nothing about a row or about what a deletion removes (domain/holidays-file.js does) and changes no
 * record (the controller does).
 */

/** @typedef {import("../controller.js").Action} Action */
/** @typedef {import("../controller-holidays.js").HolidayImport} HolidayImport */
/** @typedef {import("../domain/holidays-file.js").ImportRemovalPlan} ImportRemovalPlan */
/** @typedef {import("../domain/places.js").Place} Place */
/** @typedef {import("../domain/user-holidays.js").UserHolidays} UserHolidays */
/** @typedef {Extract<NonNullable<HolidayImport>, { status: "preview" }>} Preview */
/** @typedef {{ userHolidays: UserHolidays, places: Place[] }} Saved */

/**
 * @typedef {object} ImportDialogView The part of the page view the dialogs draw.
 * @property {HolidayImport} holidayImport
 * @property {UserHolidays} userHolidays
 * @property {{ places: Place[] } | null} settings
 */

/**
 * @typedef {object} ImportDialogDeps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(saved: Saved, importId: string) => ImportRemovalPlan} removalPlanOf What deleting an
 *   imported file removes and keeps (domain/holidays-file.js).
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
 * @param {string} templateId The id of a template that holds one `<dialog>`.
 * @returns {HTMLDialogElement} A copy of the dialog's template, in the page.
 * @throws {Error} When the page has no such template, or it holds no `<dialog>`.
 */
function makeDialog(doc, templateId) {
  const template = doc.querySelector(`#${templateId}`);
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(`import dialog: the page has no #${templateId}`);
  }
  const dialog = template.content.firstElementChild?.cloneNode(true);
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error(`import dialog: #${templateId} holds no <dialog>`);
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
 * @param {number} count
 * @returns {string} For example `1 entry` or `2 entries`.
 */
function entries(count) {
  return count === 1 ? "1 entry" : `${count} entries`;
}

/**
 * @param {HTMLDialogElement} dialog
 * @param {ImportRemovalPlan} plan
 * @returns {void} Writes how many entries go and stay, and the Delete button's label (HOL-021).
 */
function fillDelete(dialog, { go, stay }) {
  part(dialog, "delete-summary").textContent =
    go.length === 1 ? "1 entry goes." : `${go.length} entries go.`;
  const stays = part(dialog, "delete-stay");
  stays.hidden = stay.length === 0;
  stays.textContent =
    stay.length === 1
      ? "1 entry stays because another file also lists it."
      : `${stay.length} entries stay because another file also lists them.`;
  part(dialog, "delete-confirm").textContent = `Delete ${entries(go.length)}`;
}

/**
 * @param {HTMLDialogElement} dialog
 * @param {{ importId: string | null }} pending The file the dialog asks about.
 * @param {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @returns {void} Wires Delete to `removeImport` and Cancel to closing; Escape closes only this
 *   dialog, not the settings behind it.
 */
function wireDelete(dialog, pending, dispatch) {
  part(dialog, "delete-cancel").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") event.stopPropagation();
  });
  part(dialog, "delete-confirm").addEventListener("click", () => {
    if (pending.importId !== null)
      void dispatch({ type: "removeImport", importId: pending.importId });
    dialog.close();
  });
}

/**
 * @param {Document} doc The page.
 * @param {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @returns {{ render: (holidayImport: HolidayImport) => void }} The preview dialog; `render` opens
 *   it for a new preview and closes it when the preview is gone.
 */
function createPreviewDialog(doc, dispatch) {
  const dialog = makeDialog(doc, "import-dialog-template");
  wire(dialog, dispatch);
  /** @type {Preview | null} The preview now drawn. */
  let shown = null;
  return {
    render(holidayImport) {
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

/**
 * @param {Document} doc The page.
 * @param {ImportDialogDeps} deps
 * @returns {{ keep: (view: ImportDialogView) => void, ask: (importId: string) => void }} The delete
 *   dialog; `keep` remembers the saved entries it counts, `ask` opens it for a file.
 */
function createDeleteDialog(doc, { dispatch, removalPlanOf }) {
  const dialog = makeDialog(doc, "import-delete-template");
  const pending = { importId: /** @type {string | null} */ (null) };
  wireDelete(dialog, pending, dispatch);
  /** @type {Saved} What the last view held. */
  let saved = { userHolidays: { version: 1, added: [], hidden: [] }, places: [] };
  return {
    keep: ({ userHolidays, settings }) => {
      saved = { userHolidays, places: settings?.places ?? [] };
    },
    ask(importId) {
      pending.importId = importId;
      fillDelete(dialog, removalPlanOf(saved, importId));
      if (!dialog.open) dialog.showModal();
    },
  };
}

/**
 * @param {Document} doc The page.
 * @param {ImportDialogDeps} deps The controller's `dispatch` and the removal plan.
 * @returns {{ render: (view: ImportDialogView) => void, askRemove: (importId: string) => void }} The
 *   dialogs; `render` opens the preview for a new preview and closes it when the preview is gone, and
 *   keeps the saved entries the delete dialog counts; `askRemove` opens the delete dialog.
 * @throws {Error} When the page's templates lack a part.
 */
export function createImportDialog(doc, deps) {
  const preview = createPreviewDialog(doc, deps.dispatch);
  const remove = createDeleteDialog(doc, deps);
  return {
    render(view) {
      remove.keep(view);
      preview.render(view.holidayImport);
    },
    askRemove: remove.ask,
  };
}
