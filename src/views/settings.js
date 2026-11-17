// @ts-check
/**
 * @module views/settings
 * Owns the settings panel: opens and closes it with `settingsOpen`, the add-by-country form, the
 * close button, and Escape, and returns the keyboard focus to the button that opened it (SET-001,
 * SET-002, SET-004). It clones its markup from templates in index.html. It does not draw the list
 * of places (views/settings-places.js does, built by `deps.makeList`) and it saves nothing (the controller does).
 */
/** @typedef {import("./settings-places.js").Lookup} Lookup */
/** @typedef {import("./settings-places.js").PlaceListView} PlaceListView */
/** @typedef {import("../controller.js").Action} Action */

/**
 * @typedef {object} Session The open panel, if any.
 * @property {HTMLElement | null} panel
 * @property {Element | null} opener The element that had focus when the panel opened.
 * @property {{ render: (view: PlaceListView) => void } | null} places
 */

/**
 * @typedef {object} Deps
 * @property {(action: Action) => Promise<void>} dispatch The controller's `dispatch`.
 * @property {Lookup} lookup
 * @property {(list: HTMLElement) => { render: (view: PlaceListView) => void }} makeList Builds the
 *   list of places inside the panel (views/settings-places.js; main.js passes it in, because a
 *   view imports no other view).
 */

/**
 * @typedef {object} PanelContext
 * @property {Document} doc
 * @property {HTMLTemplateElement} template
 * @property {Deps} deps
 * @property {Session} session
 */

/**
 * @param {ParentNode} root
 * @param {string} role A `data-role` value.
 * @returns {HTMLElement} The element with that role.
 * @throws {Error} When there is none.
 */
function part(root, role) {
  const found = root.querySelector(`[data-role="${role}"]`);
  if (!(found instanceof HTMLElement)) {
    throw new Error(`settings: the markup has no [data-role="${role}"] element`);
  }
  return found;
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @returns {void} Lists every country in the add form.
 */
function fillCountries(ctx, panel) {
  const select = /** @type {HTMLSelectElement} */ (part(panel, "country"));
  for (const country of ctx.deps.lookup.countries) {
    select.append(new Option(country.name, country.code));
  }
}

/**
 * @param {PanelContext} ctx
 * @param {HTMLElement} panel
 * @returns {void} Adds a place for the chosen country; no country chosen is refused and marked.
 */
function submitAdd(ctx, panel) {
  const select = /** @type {HTMLSelectElement} */ (part(panel, "country"));
  select.setAttribute("aria-invalid", String(select.value === ""));
  if (select.value === "") return;
  void ctx.deps.dispatch({ type: "addPlace", countryCode: select.value });
  select.value = "";
}

/**
 * @param {PanelContext} ctx
 * @returns {void} Builds the panel, wires it and puts it on the page.
 */
function openPanel(ctx) {
  const { doc, session } = ctx;
  const panel = /** @type {HTMLElement} */ (
    ctx.template.content.firstElementChild?.cloneNode(true)
  );
  session.opener = doc.activeElement;
  fillCountries(ctx, panel);
  part(panel, "close").addEventListener("click", () => {
    void ctx.deps.dispatch({ type: "closeSettings" });
  });
  part(panel, "add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitAdd(ctx, panel);
  });
  session.places = ctx.deps.makeList(part(panel, "places"));
  session.panel = panel;
  doc.body.append(panel);
  part(panel, "close").focus();
}

/**
 * @param {PanelContext} ctx
 * @returns {void} Removes the panel and puts the focus back on the button that opened it.
 */
function closePanel(ctx) {
  const { doc, session } = ctx;
  session.panel?.remove();
  const kept = session.opener?.isConnected === true && session.opener !== doc.body;
  const opener = kept ? session.opener : doc.querySelector('[data-action="openSettings"]');
  if (opener instanceof HTMLElement) opener.focus();
  session.panel = null;
  session.places = null;
}

/**
 * @param {Document} doc The page.
 * @param {Deps} deps The controller's `dispatch` and the lookup from main.js.
 * @returns {{ render: (view: PlaceListView & { settingsOpen: boolean }) => void }} The panel;
 *   `render` opens, updates or closes it to match `view.settingsOpen`.
 * @throws {Error} When the page has no panel template.
 */
export function createSettingsPanel(doc, deps) {
  const template = doc.querySelector("#settings-panel-template");
  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("settings: the page has no #settings-panel-template");
  }
  /** @type {PanelContext} */
  const ctx = { doc, template, deps, session: { panel: null, opener: null, places: null } };
  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ctx.session.panel !== null) {
      void deps.dispatch({ type: "closeSettings" });
    }
  });
  return {
    render(view) {
      if (view.settingsOpen && ctx.session.panel === null) openPanel(ctx);
      if (!view.settingsOpen && ctx.session.panel !== null) closePanel(ctx);
      ctx.session.places?.render(view);
    },
  };
}
