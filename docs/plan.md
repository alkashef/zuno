# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M61**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M60** Tab icon | The page's tab icon is a black Z on a solid `#00BCD4` square | sonnet | medium | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

### M60 — Tab icon

- **Refs:** ICN-001, EX-037, PKG-001, NFR-001, DEC-038, DEC-012, DEC-020.
- **Owner:** `src/icon.svg` (new), `src/theme.css` (`--color-icon-background`, `--color-icon-letter`),
  `src/index.html` (the marker `<!--zuno:icon-->` after `<title>`), `scripts/build.mjs`.
- **Tests first:**
  - `tests/unit/build.test.js`:
    `test_icn_001_build_writes_a_link_rel_icon_with_a_data_uri_after_the_title`,
    `test_icn_001_the_icon_carries_the_two_colours_of_the_theme_tokens`,
    `test_icn_001_build_fails_when_an_icon_token_is_missing_and_names_the_token`,
    `test_icn_001_build_fails_when_an_icon_token_is_not_a_six_digit_hex_colour`.
  - `tests/e2e/ui/page-shell.test.js`:
    `ui_icn_001_the_tab_icon_has_cyan_corners_and_a_black_z_ex_037` (finds `link[rel~="icon"]`, draws its
    `href` at 32 by 32 on a canvas, reads the four corners as `#00BCD4`, the points on the Z's three
    strokes as `#000000` and a point beside the diagonal as `#00BCD4`, and checks that the title is
    "Zuno").
- **Build:** DEC-038. `icon.svg` has `viewBox="0 0 32 32"`, a square over the whole icon with no rounded
  corners and the Z as a path of about half the width and 60% of the height, centred, with the
  placeholders `{{background}}` and `{{letter}}`. The build reads the two tokens from `theme.css` (a
  missing token or a value that is not a six-digit hex colour fails and names the file and the
  token), fills the placeholders, applies `encodeURIComponent` and writes
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,…">` in place of the marker. The
  built page stays one file.
- **Gate:** the existing request check of `tests/e2e/ui/nfr.test.js` passes (NFR-001 is unchanged: a
  `data:` URI is not a network request, so if the browser reports it the check ignores it, and the
  report says so); the built `dist/zuno.html` has exactly one `<link rel="icon">`; the browser tests
  pass in the four browsers.

## Human checks

For the user, after the run. A session cannot do them.

- ICN-001, DEC-038: open `dist/zuno.html` in Chrome, Edge, Firefox and Safari and look at the tab.
  Playwright cannot see the tab, and an older Safari may show no icon.
- PIN-001, PIN-002, DEC-039: look at the pins in the picker and in the settings, light and dark.
- PCK-012, PCK-013, DEC-037: leave the page open for a few minutes, then drag the marker, wait a
  minute, and press Now; look at the Now button's muted and normal look.
- The "Zuno UI" canvas does not show the Now button, the pins or the tab icon (design, DEC-037 to
  DEC-039): update it if you keep it as the visual reference.
