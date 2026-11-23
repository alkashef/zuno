// @ts-check
/**
 * @module views/settings-tabs
 * Owns the tab bar of the settings page: three tabs (General, Places, Holidays and vacations) as
 * `role="tab"` buttons, one `role="tabpanel"` shown at a time, a roving `tabindex`, and the Left
 * and Right arrows, Home and End to move the selection and the focus (SET-019, DEC-033). The
 * selected tab is view state: every new layer starts on the first tab. It does not build the
 * markup (the template in index.html does), draw what the panels hold (the other settings views
 * do), or save anything.
 */

/**
 * @typedef {object} TabSet
 * @property {HTMLElement[]} tabs The tab buttons, in order.
 * @property {HTMLElement[]} panels The panel of each tab, in the same order.
 */

/**
 * @param {HTMLElement} layer The settings layer.
 * @returns {TabSet} The tabs of the layer and the panel each one controls.
 * @throws {Error} When a tab does not name a panel of the layer.
 */
function findTabs(layer) {
  const tabs = /** @type {HTMLElement[]} */ ([...layer.querySelectorAll('[role="tab"]')]);
  const panels = tabs.map((tab) => {
    const panel = layer.querySelector(`#${tab.getAttribute("aria-controls")}`);
    if (!(panel instanceof HTMLElement)) {
      throw new Error(`settings-tabs: the tab "${tab.textContent?.trim()}" has no panel`);
    }
    return panel;
  });
  return { tabs, panels };
}

/**
 * @param {TabSet} set
 * @param {number} index The tab to select.
 * @returns {void} Marks that tab selected, makes it the only one in the tab order and shows only
 *   its panel.
 */
function selectTab(set, index) {
  set.tabs.forEach((tab, position) => {
    tab.setAttribute("aria-selected", String(position === index));
    tab.tabIndex = position === index ? 0 : -1;
  });
  set.panels.forEach((panel, position) => {
    panel.hidden = position !== index;
  });
}

/**
 * @param {string} key A key name.
 * @param {number} current The selected tab.
 * @param {number} count The number of tabs.
 * @returns {number} The tab the key moves to, or -1 when the key moves nothing.
 */
function tabAfterKey(key, current, count) {
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current + count - 1) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return -1;
}

/**
 * @param {HTMLElement} layer The settings layer, just cloned from the template.
 * @returns {void} Selects the first tab and wires the clicks and the keys of the tab bar.
 */
export function setUpSettingsTabs(layer) {
  const set = findTabs(layer);
  selectTab(set, 0);
  set.tabs.forEach((tab, index) => tab.addEventListener("click", () => selectTab(set, index)));
  layer.querySelector('[role="tablist"]')?.addEventListener("keydown", (event) => {
    const key = /** @type {KeyboardEvent} */ (event).key;
    const current = set.tabs.findIndex((tab) => tab === event.target);
    const next = tabAfterKey(key, current, set.tabs.length);
    if (current === -1 || next === -1) return;
    event.preventDefault();
    selectTab(set, next);
    set.tabs[next]?.focus();
  });
}
