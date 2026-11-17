// @ts-check
/**
 * @module views/empty
 * Owns the empty page: the prompt to add a place, shown while no places are saved (SET-007). It
 * clones its markup from a `<template>` in index.html. It does not open the settings (the prompt
 * button carries `data-action`, handled by views/actions.js).
 */

/**
 * @param {Document} doc The page.
 * @returns {{ render: (view: { isEmpty: boolean }) => void }} The empty page; `render` shows or
 *   removes the prompt to match `view.isEmpty`.
 * @throws {Error} When the page has no page area or no empty-page template.
 */
export function createEmptyPage(doc) {
  const area = doc.querySelector('[data-role="page"]');
  const template = doc.querySelector("#empty-page-template");
  if (area === null || !(template instanceof HTMLTemplateElement)) {
    throw new Error("empty page: the page has no [data-role=page] area or #empty-page-template");
  }
  return {
    render(view) {
      const prompt = area.querySelector('[data-role="empty"]');
      if (view.isEmpty && prompt === null) {
        area.append(template.content.cloneNode(true));
      } else if (!view.isEmpty) {
        prompt?.remove();
      }
    },
  };
}
