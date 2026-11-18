// @ts-check
/**
 * @module views/header
 * Owns the header's "Updated" time: shows when the times were last recomputed (REF-001). It does
 * not react to clicks (views/actions.js does) and does not compute the time (domain/format.js
 * does). The title, subtitle and buttons are static markup in index.html.
 */
import { formatClock } from "../domain/format.js";

/**
 * @param {Document} doc The page.
 * @returns {{ render: (view: { now: number }) => void }} The header; `render` shows `view.now`.
 * @throws {Error} When the page has no "Updated" element.
 */
export function createHeader(doc) {
  const updated = doc.querySelector('[data-role="updated"]');
  if (updated === null) {
    throw new Error('header: the page has no [data-role="updated"] element');
  }
  return {
    render(view) {
      updated.textContent = `Updated ${formatClock(view.now)}`;
    },
  };
}
