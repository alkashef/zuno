// @ts-check
/**
 * @module views/day-dialog
 * Owns the one native `<dialog>` of the day menu and its forms (DEC-031). The holiday form: the
 * holiday's name and its date, preset to the clicked day, for the country of the clicked row
 * (HOL-015, HOL-006). The vacation form, to add or to edit one: start date (preset to the clicked
 * day), end date and an optional label for the clicked row's place (VAC-002, VAC-005). An empty
 * holiday field is marked `aria-invalid` and nothing is sent; a vacation the injected
 * `checkVacation` refuses (VAC-003) marks its fields invalid, says why in a `role="alert"` line and
 * sends nothing. It clones its markup from templates in index.html. It saves nothing (the controller
 * does), knows no rule of a vacation (domain/vacations.js does) and picks no colour (popovers.css
 * does).
 */

/** @typedef {import("../controller.js").Action} Action */
/** @typedef {import("../domain/vacations.js").Vacation} Vacation */
/** @typedef {import("../domain/vacations.js").VacationCheck} VacationCheck */
/** @typedef {Exclude<VacationCheck, "ok">} VacationRefusal */
/** @typedef {{ placeId: string, date: string, vacation?: Vacation }} VacationEntry */

/**
 * @typedef {object} DialogDeps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(entry: { start: string, end: string }) => VacationCheck} checkVacation The check of a
 *   vacation form's dates (domain/vacations.js, passed in by main.js).
 */

/** @type {Readonly<Record<VacationRefusal, string>>} What the alert line says for each refusal. */
const vacationMessage = Object.freeze({
  "start-missing": "Enter a start date.",
  "end-missing": "Enter an end date.",
  "end-before-start": "The end date is before the start date.",
});

/** @type {Readonly<Record<VacationRefusal, string[]>>} The fields each refusal marks invalid. */
const invalidFields = Object.freeze({
  "start-missing": ["start"],
  "end-missing": ["end"],
  "end-before-start": ["start", "end"],
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
 * @typedef {object} VacationParts
 * @property {HTMLInputElement} start
 * @property {HTMLInputElement} end
 * @property {HTMLInputElement} label
 * @property {HTMLElement} alert The line that says why a vacation was refused.
 */

/**
 * @param {HTMLElement} form The vacation form.
 * @returns {VacationParts} Its three fields and its alert line.
 * @throws {Error} When the markup lacks one of them.
 */
function vacationParts(form) {
  const alert = form.querySelector('[data-role="dialog-error"]');
  if (!(alert instanceof HTMLElement)) throw new Error("day dialog: the markup has no error line");
  return {
    start: inputOf(form, "dialog-start"),
    end: inputOf(form, "dialog-end"),
    label: inputOf(form, "dialog-label"),
    alert,
  };
}

/**
 * @param {VacationParts} parts
 * @param {VacationCheck} check The result of `checkVacation`.
 * @returns {boolean} Whether the form is accepted; else its fields are marked invalid and the alert
 *   line says why (VAC-003).
 */
function showCheck({ start, end, alert }, check) {
  const bad = check === "ok" ? [] : invalidFields[check];
  start.setAttribute("aria-invalid", String(bad.includes("start")));
  end.setAttribute("aria-invalid", String(bad.includes("end")));
  alert.textContent = check === "ok" ? "" : vacationMessage[check];
  return check === "ok";
}

/**
 * @param {string} placeId
 * @param {Vacation | undefined} vacation The saved vacation being edited, if any.
 * @param {{ start: string, end: string, label: string }} fields The form's values.
 * @returns {Action} `addVacation`, or `changeVacation` for an edit.
 */
function vacationAction(placeId, vacation, fields) {
  if (vacation === undefined) return { type: "addVacation", placeId, ...fields };
  return { type: "changeVacation", placeId, original: vacation, changes: fields };
}

/**
 * @param {HTMLElement} form The vacation form.
 * @param {VacationParts} parts Its fields.
 * @param {{ date: string, vacation?: Vacation }} entry The clicked day and, for an edit, the saved
 *   vacation.
 * @returns {void} Presets both dates to the day and leaves the label empty, or fills all three
 *   fields from the vacation, and words the submit button (Add vacation, or Save for an edit).
 */
function fillVacationForm(form, parts, { date, vacation }) {
  const shown = vacation ?? { start: date, end: date, label: "" };
  parts.start.value = shown.start;
  parts.end.value = shown.end;
  parts.label.value = shown.label;
  const submit = form.querySelector('[data-role="dialog-submit"]');
  if (submit !== null) submit.textContent = vacation === undefined ? "Add vacation" : "Save";
}

/**
 * @param {Document} doc
 * @param {DialogDeps} deps
 * @param {VacationEntry} entry The row's place, the clicked day and, for an edit, the saved vacation.
 * @param {() => void} close Closes the dialog.
 * @returns {HTMLElement} The vacation form: start (preset to the day), end and label; for an edit,
 *   filled in with the vacation. Save or Add sends `changeVacation` or `addVacation` and closes; a
 *   refused range sends nothing; Cancel closes (VAC-002, VAC-003, VAC-005).
 */
function buildVacationForm(doc, deps, { placeId, date, vacation }, close) {
  const form = cloneTemplate(doc, "day-vacation-form-template");
  const parts = vacationParts(form);
  fillVacationForm(form, parts, { date, vacation });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = { start: parts.start.value, end: parts.end.value, label: parts.label.value };
    if (!showCheck(parts, deps.checkVacation(fields))) return;
    void deps.dispatch(vacationAction(placeId, vacation, fields));
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
 * @param {Document} doc
 * @param {string} title The dialog's heading.
 * @param {HTMLElement} form The form to show in it.
 * @returns {void} Shows the dialog with that heading and form.
 */
function showForm(doc, title, form) {
  const dialog = dialogOf(doc);
  const heading = dialog.querySelector('[data-role="dialog-title"]');
  if (heading !== null) heading.textContent = title;
  dialog.querySelector('[data-role="dialog-body"]')?.replaceChildren(form);
  dialog.showModal();
}

/**
 * Creates the dialog of the day menu.
 * @param {Document} doc The page.
 * @param {DialogDeps} deps
 * @returns {{ openHoliday: (entry: { countryCode: string, date: string }) => void, openVacation: (entry: VacationEntry) => void }}
 *   The dialog; `openHoliday` shows the holiday form for a country and a date; `openVacation` shows
 *   the vacation form for a place and a date, to edit `vacation` when it is given.
 * @throws {Error} When the page has no day-dialog template.
 */
export function createDayDialog(doc, deps) {
  const close = () => dialogOf(doc).close();
  return {
    openHoliday: (entry) =>
      showForm(doc, "Add public holiday", buildHolidayForm(doc, deps, entry, close)),
    openVacation: (entry) =>
      showForm(
        doc,
        entry.vacation === undefined ? "Add vacation" : "Edit vacation",
        buildVacationForm(doc, deps, entry, close),
      ),
  };
}
