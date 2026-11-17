// @ts-check
/**
 * @module views/legend
 * Owns the legend: a banner fixed to the bottom of the page that names every colour the page uses
 * for weekends, public holidays, working hours, non-working hours and days off (LEG-001). It
 * clones its markup from a `<template>` in index.html, shows only while places are saved, and
 * picks no colour (legend.css does).
 */

/**
 * @param {Document} doc The page.
 * @returns {{ render: (view: { isEmpty: boolean }) => void }} The legend; `render` shows or
 *   removes the banner to match `view.isEmpty`.
 * @throws {Error} When the page has no legend template.
 */
export function createLegend(doc) {
  const template = doc.querySelector("#legend-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("legend: the page has no #legend-template");
  }
  return {
    render(view) {
      const banner = doc.querySelector('[data-role="legend"]');
      if (!view.isEmpty && banner === null) {
        doc.body.append(template.content.cloneNode(true));
      } else if (view.isEmpty) {
        banner?.remove();
      }
    },
  };
}
