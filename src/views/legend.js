// @ts-check
/**
 * @module views/legend
 * Owns the contents of the legend (LEG-001, DEC-020). The legend is in two parts, each at the
 * bottom of its card: the month grid's part names the colours of weekends, public holidays, both
 * at once, vacations and today; the picker's part names the colours of working hours, non-working
 * hours and days off (weekend, holiday or vacation). Each card's template holds an empty part
 * marked `data-legend="month"` or `data-legend="picker"`; this view fills each from the template `#legend-<name>-template` and
 * empties it again on the empty page. It does not build the cards (views/month-grid.js and
 * views/picker.js do), clones its markup from index.html and picks no colour (legend.css does).
 */

/**
 * @param {Document} doc The page.
 * @returns {{ render: (view: { isEmpty: boolean }) => void }} The legend; `render` fills every
 *   legend part that is on the page and still empty, or, while `view.isEmpty`, empties them.
 */
export function createLegend(doc) {
  return {
    render(view) {
      const parts = [...doc.querySelectorAll("[data-legend]")].filter(
        (part) => part instanceof HTMLElement,
      );
      for (const part of parts) {
        const name = part.dataset.legend ?? "";
        const template = doc.querySelector(`#legend-${name}-template`);
        if (!(template instanceof HTMLTemplateElement)) {
          throw new Error(`legend: the page has no #legend-${name}-template`);
        }
        if (view.isEmpty) part.replaceChildren();
        else if (part.childElementCount === 0) part.append(template.content.cloneNode(true));
      }
    },
  };
}
