// @ts-check
/**
 * @module views/day-dialog
 * Owns the one native `<dialog>` of the day menu and its forms (DEC-031). Here the holiday form:
 * the holiday's name and its date, preset to the clicked day, for the country of the clicked row
 * (HOL-015, HOL-006). An empty field is marked `aria-invalid` and nothing is sent. It clones its
 * markup from templates in index.html. It validates nothing beyond empty fields and saves nothing
 * (domain/user-holidays.js and the controller do) and picks no colour (popovers.css does).
 */

/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} DialogDeps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 */

/**
 * @param {Document} doc
 * @param {string} id The template's id.
 * @returns {HTMLElement} A copy of the template's markup.
 * @throws {Error} When the page has no such template.
 */
function cloneTemplate(doc, id) {
  const template = doc.querySelector(`#${id}`);
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error(`day dialog: the page has no #${id}`);
  }
  return /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
}

/**
 * @param {ParentNode} root
 * @param {string} role A `data-role` value.
 * @returns {HTMLInputElement} The input with that role.
 * @throws {Error} When there is none.
 */
function inputOf(root, role) {
  const found = root.querySelector(`[data-role="${role}"]`);
  if (!(found instanceof HTMLInputElement)) {
    throw new Error(`day dialog: the markup has no [data-role="${role}"] input`);
  }
  return found;
}

/**
 * @param {HTMLInputElement} name
 * @param {HTMLInputElement} date
 * @returns {boolean} Whether both fields are filled in; each empty one is marked invalid.
 */
function checkFields(name, date) {
  const nameEmpty = name.value.trim() === "";
  const dateEmpty = date.value === "";
  name.setAttribute("aria-invalid", String(nameEmpty));
  date.setAttribute("aria-invalid", String(dateEmpty));
  return !nameEmpty && !dateEmpty;
}

/**
 * @param {Document} doc
 * @param {DialogDeps} deps
 * @param {{ countryCode: string, date: string }} entry The row's country and the clicked day.
 * @param {() => void} close Closes the dialog.
 * @returns {HTMLElement} The holiday form: name and date, preset to the day; Add sends
 *   `addHoliday` and closes, Cancel closes.
 */
function buildHolidayForm(doc, deps, { countryCode, date }, close) {
  const form = cloneTemplate(doc, "day-holiday-form-template");
  const nameField = inputOf(form, "dialog-name");
  const dateField = inputOf(form, "dialog-date");
  dateField.value = date;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!checkFields(nameField, dateField)) return;
    void deps.dispatch({
      type: "addHoliday",
      countryCode,
      date: dateField.value,
      name: nameField.value.trim(),
    });
    close();
  });
  form.querySelector('[data-role="dialog-cancel"]')?.addEventListener("click", close);
  return form;
}

/**
 * @param {Document} doc The page.
 * @returns {HTMLDialogElement} The page's one day dialog, made on first use.
 * @throws {Error} When the page has no day-dialog template.
 */
function dialogOf(doc) {
  const found = doc.querySelector('[data-role="day-dialog"]');
  if (found instanceof HTMLDialogElement) return found;
  const dialog = /** @type {HTMLDialogElement} */ (cloneTemplate(doc, "day-dialog-template"));
  doc.body.append(dialog);
  return dialog;
}

/**
 * Creates the dialog of the day menu.
 * @param {Document} doc The page.
 * @param {DialogDeps} deps
 * @returns {{ openHoliday: (entry: { countryCode: string, date: string }) => void }} The dialog;
 *   `openHoliday` shows the holiday form for a country and a date.
 * @throws {Error} When the page has no day-dialog template.
 */
export function createDayDialog(doc, deps) {
  const close = () => dialogOf(doc).close();
  return {
    openHoliday(entry) {
      const dialog = dialogOf(doc);
      const title = dialog.querySelector('[data-role="dialog-title"]');
      if (title !== null) title.textContent = "Add public holiday";
      dialog
        .querySelector('[data-role="dialog-body"]')
        ?.replaceChildren(buildHolidayForm(doc, deps, entry, close));
      dialog.showModal();
    },
  };
}
