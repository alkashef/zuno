// @ts-check
/**
 * @module views/pin-button
 * Owns the behaviour that the pin buttons of the picker's cards and the settings' place cards have
 * in common: naming a pin and marking it pinned or not, reading which place a click pressed, and
 * keeping the keyboard focus on a place's pin when its card is drawn again (PIN-001 to PIN-004,
 * DEC-039). It dispatches nothing, owns no card and picks no colour: the views that own the cards
 * dispatch `pinPlace`, and base.css draws the pin.
 */

/** The selector of a pin button, in the picker and in the settings. */
const pinSelector = '[data-role="place-pin"]';

/**
 * @param {HTMLElement} pin The pin button of one place's card.
 * @param {{ placeId: string, name: string, pinned: boolean }} place The place the pin belongs to,
 *   the name shown for it, and whether it is the first place.
 * @returns {void} Names the pin and marks it pinned (filled, `aria-disabled`, nothing to press) or
 *   not pinned (an outline that makes the place the first).
 */
export function showPin(pin, { placeId, name, pinned }) {
  pin.dataset.placeId = placeId;
  pin.dataset.pinned = String(pinned);
  if (pinned) pin.setAttribute("aria-disabled", "true");
  else pin.removeAttribute("aria-disabled");
  pin.setAttribute(
    "aria-label",
    pinned ? `${name} is the first place` : `Make ${name} the first place`,
  );
}

/**
 * @param {Event} event A click.
 * @returns {string | null} The id of the place whose pin was pressed, or `null` when the click was
 *   not on a pin or the pin is the first place's (it changes nothing, PIN-004).
 */
export function pressedPlace(event) {
  const pin = event.target instanceof Element ? event.target.closest(pinSelector) : null;
  if (!(pin instanceof HTMLElement) || pin.getAttribute("aria-disabled") === "true") return null;
  return pin.dataset.placeId ?? null;
}

/**
 * @param {Event} event A pointer or click event.
 * @returns {boolean} Whether the event is on a pin button.
 */
export function isOnPin(event) {
  return event.target instanceof Element && event.target.closest(pinSelector) !== null;
}

/**
 * @param {ParentNode} root The cards.
 * @returns {string | null} The id of the place whose pin has the keyboard focus, if any.
 */
export function focusedPinPlace(root) {
  const focused = root.querySelector(`${pinSelector}:focus`);
  return focused instanceof HTMLElement ? (focused.dataset.placeId ?? null) : null;
}

/**
 * @param {ParentNode} root The cards, drawn again.
 * @param {string | null} placeId The place whose pin had the focus, from `focusedPinPlace`.
 * @returns {void} Gives that place's pin the focus again.
 */
export function refocusPin(root, placeId) {
  if (placeId === null) return;
  for (const pin of root.querySelectorAll(pinSelector)) {
    if (pin instanceof HTMLElement && pin.dataset.placeId === placeId) pin.focus();
  }
}
