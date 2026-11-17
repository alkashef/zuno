// @ts-check
/**
 * @module views/hijri-note
 * Owns the information button beside the Hijri month band and its card: a note that Hijri dates
 * are calculated and may differ from official announcements (HIJ-004). The button opens and closes
 * the card; Escape closes it and returns the focus to the button. It clones its markup from a
 * template in index.html, holds no Hijri date and picks no colour (month-grid.css does).
 */

/**
 * @param {Document} doc The page.
 * @returns {HTMLElement} A copy of the note's markup.
 * @throws {Error} When the page has no hijri-note template.
 */
function cloneMarkup(doc) {
  const template = doc.querySelector("#hijri-note-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("hijri note: the page has no #hijri-note-template");
  }
  return /** @type {HTMLElement} */ (template.content.firstElementChild?.cloneNode(true));
}

/**
 * @param {HTMLElement} root The note's markup.
 * @returns {{ button: HTMLElement, card: HTMLElement }} The button and the card.
 * @throws {Error} When the markup lacks one.
 */
function partsOf(root) {
  const button = root.querySelector('[data-role="note-button"]');
  const card = root.querySelector('[data-role="note-card"]');
  if (!(button instanceof HTMLElement) || !(card instanceof HTMLElement)) {
    throw new Error("hijri note: the markup has no button or card");
  }
  return { button, card };
}

/**
 * @param {Document} doc The page.
 * @returns {{ root: HTMLElement }} The note, not yet on the page; the caller puts `root` where the
 *   button belongs. Its open state survives the caller redrawing around it.
 * @throws {Error} When the page has no hijri-note template or the markup lacks a part.
 */
export function createHijriNote(doc) {
  const root = cloneMarkup(doc);
  const { button, card } = partsOf(root);
  /** @param {boolean} open */
  const show = (open) => {
    card.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  };
  button.addEventListener("click", () => show(card.hasAttribute("hidden")));
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || card.hasAttribute("hidden")) return;
    show(false);
    button.focus();
  });
  return { root };
}
