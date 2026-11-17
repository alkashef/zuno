// @ts-check
/**
 * @module views/notices
 * Owns the notices card behind the header's notices button: the count badge, the list of countries
 * with no holiday data (REF-002) and of places whose region has no regional data (HOL-004). It
 * opens and closes with `noticesOpen`; Escape closes it and returns the focus to the button. The
 * button and card are static markup in index.html; the click is handled by views/actions.js. It
 * computes no notice (the controller does).
 */
/** @typedef {import("../controller.js").Action} Action */
/** @typedef {import("../controller.js").PageView} PageView */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {(place: import("../domain/places.js").Place, showCountry: boolean) => string} placeName
 * @property {(countryCode: string) => string} countryName
 */

/**
 * @param {Document} doc
 * @param {string} selector
 * @returns {HTMLElement} The element.
 * @throws {Error} When the page has none.
 */
function required(doc, selector) {
  const found = doc.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`notices: the page has no ${selector}`);
  return found;
}

/**
 * @param {PageView} view
 * @param {Deps} deps
 * @returns {string[]} One sentence per notice.
 */
function sentencesOf(view, deps) {
  const showCountry = view.settings?.showCountry ?? false;
  const places = view.settings?.places ?? [];
  const missing = view.notices.countries.map(
    (code) => `No holiday data for ${deps.countryName(code)}.`,
  );
  const regional = view.notices.placeIds.flatMap((id) => {
    const place = places.find((candidate) => candidate.id === id);
    if (place === undefined) return [];
    const name = deps.placeName(place, showCountry);
    return [`Regional holidays are missing for ${name}; national holidays are shown.`];
  });
  return [...missing, ...regional];
}

/**
 * @typedef {object} Parts
 * @property {HTMLElement} button
 * @property {HTMLElement} badge
 * @property {HTMLElement} card
 * @property {HTMLElement} list
 * @property {HTMLTemplateElement} item
 */

/**
 * @param {Document} doc
 * @returns {Parts} The static markup the view draws into.
 * @throws {Error} When the page lacks a part.
 */
function partsOf(doc) {
  const item = doc.querySelector("#notice-item-template");
  if (!(item instanceof HTMLTemplateElement)) throw new Error("notices: no #notice-item-template");
  return {
    button: required(doc, '[data-action="toggleNotices"]'),
    badge: required(doc, '[data-role="notices-badge"]'),
    card: required(doc, '[data-role="notices-card"]'),
    list: required(doc, '[data-role="notices-list"]'),
    item,
  };
}

/**
 * @param {Parts} parts
 * @param {string[]} sentences The notices to list; none shows "No notices.".
 * @returns {void}
 */
function drawList({ list, item }, sentences) {
  const shown = sentences.length === 0 ? ["No notices."] : sentences;
  list.replaceChildren(
    ...shown.map((sentence) => {
      const li = /** @type {HTMLElement} */ (item.content.firstElementChild?.cloneNode(true));
      li.textContent = sentence;
      return li;
    }),
  );
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps
 * @returns {{ render: (view: PageView) => void }} The notices; `render` redraws badge and card.
 * @throws {Error} When the page lacks the button, badge, card, list or item template.
 */
export function createNotices(doc, deps) {
  const parts = partsOf(doc);
  doc.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || parts.card.hidden) return;
    void deps.dispatch({ type: "toggleNotices" });
    parts.button.focus();
  });
  return {
    render(view) {
      const sentences = sentencesOf(view, deps);
      parts.badge.hidden = sentences.length === 0;
      parts.badge.textContent = String(sentences.length);
      parts.card.hidden = !view.noticesOpen;
      parts.button.setAttribute("aria-expanded", String(view.noticesOpen));
      drawList(parts, sentences);
    },
  };
}
