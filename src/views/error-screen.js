// @ts-check
/**
 * @module views/error-screen
 * Owns the error screen: shows the raw message and stack trace of an unexpected error on the page
 * (project rule: no friendly message). It does not log (main.js does) and does not decide what is
 * an error.
 */

/**
 * @param {unknown} failure
 * @returns {string} The stack trace of an `Error`, else the value as text.
 */
function describe(failure) {
  if (failure instanceof Error) return failure.stack ?? `${failure.name}: ${failure.message}`;
  return String(failure);
}

/**
 * @param {Document} doc The page.
 * @returns {{ show: (failure: unknown) => void }} The error screen; `show` adds the failure's text
 *   to the page.
 * @throws {Error} When the page has no error-screen template.
 */
export function createErrorScreen(doc) {
  const template = doc.querySelector("#error-screen-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("error screen: the page has no #error-screen-template");
  }
  return {
    show(failure) {
      const screen = /** @type {DocumentFragment} */ (template.content.cloneNode(true));
      const details = screen.querySelector('[data-role="details"]');
      if (details !== null) details.textContent = describe(failure);
      doc.body.prepend(screen);
    },
  };
}
