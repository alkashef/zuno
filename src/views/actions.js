// @ts-check
/**
 * @module views/actions
 * Turns a click on any element with a `data-action` of a plain action into that action for the
 * controller (REF-001, SET-007: Refresh, Settings and the empty-page prompt). One delegated
 * listener on the page; it does not draw anything and does not handle actions that carry values.
 */

/**
 * @param {Document} doc The page.
 * @param {(action: { type: "refresh" } | { type: "openSettings" }) => Promise<void>} dispatch
 *   The controller's `dispatch`; its promise is not awaited, so a failure reaches the top-level
 *   handler.
 * @returns {void}
 */
export function bindActions(doc, dispatch) {
  doc.addEventListener("click", (event) => {
    const source = event.target instanceof Element ? event.target.closest("[data-action]") : null;
    const type = source?.getAttribute("data-action");
    if (type === "refresh" || type === "openSettings") {
      void dispatch({ type });
    }
  });
}
