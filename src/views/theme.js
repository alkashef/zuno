// @ts-check
/**
 * @module views/theme
 * Applies the chosen theme to the page: sets `data-theme` on the root element to `light` or
 * `dark`, or removes it for Auto so that the operating system's setting decides (THM-001,
 * SET-012). It holds no colour (theme.css does) and does not offer the choice (views/settings.js
 * does).
 */

/**
 * @param {Document} doc The page.
 * @returns {{ render: (view: { settings: { theme: string } | null }) => void }} The theme;
 *   `render` applies the saved theme, or Auto while nothing is saved.
 */
export function createTheme(doc) {
  const root = doc.documentElement;
  return {
    render(view) {
      const theme = view.settings?.theme ?? "auto";
      if (theme === "auto") {
        delete root.dataset.theme;
      } else {
        root.dataset.theme = theme;
      }
    },
  };
}
