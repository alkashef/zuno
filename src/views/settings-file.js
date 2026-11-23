// @ts-check
/**
 * @module views/settings-file
 * Owns the "Holidays and vacations file" card of the settings page: the Export button, the Import
 * file picker (CSV) and the message shown when an imported file was refused (HOL-010 to HOL-012). The
 * description of the file's format (HOL-016) is static markup of the card, in index.html. It reads
 * and saves no file and decides nothing about a file's content (the controller and
 * domain/holidays-file.js do).
 */

/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} FileView The part of the page view the card draws.
 * @property {import("../controller-holidays.js").HolidayImport} holidayImport `{ status: "refused" }`
 *   while the last imported file was refused.
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
 * @param {HTMLElement} card The file card, inside the open panel.
 * @param {{ dispatch: (action: Action) => Promise<void> }} deps The controller's `dispatch`.
 * @returns {{ render: (view: FileView) => void }} The card; `render` shows the refusal message
 *   while an import is refused.
 * @throws {Error} When the card's markup lacks a part.
 */
export function createFileSection(card, { dispatch }) {
  wireButtons(card, dispatch);
  const refused = part(card, "import-refused");
  return {
    render(view) {
      refused.hidden = view.holidayImport?.status !== "refused";
    },
  };
}
