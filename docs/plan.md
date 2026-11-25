# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M61**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M58** Pin a place: logic | `pinPlace` moves a place to the top and keeps the order of the others; the first place changes nothing | sonnet | medium | open |
| **M59** Pin buttons | A pin button on each picker card and settings card; the first picker row loses its own background | sonnet | high | open |
| **M60** Tab icon | The page's tab icon is a black Z on a solid `#00BCD4` square | sonnet | medium | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

### M58 — Pin a place: logic

- **Refs:** PIN-003, PIN-004, SET-008, SET-004, EX-039, DEC-039, DEC-019, DEC-037.
- **Owner:** `src/domain/places.js` (`moveToFirst`), `src/controller-places.js` (`pinPlace` in
  `placeHandlers`), `src/controller.js` (the action type and the wiring).
- **Tests first:**
  - `tests/unit/places.test.js`:
    `test_pin_003_move_to_first_puts_a_middle_place_first_and_keeps_the_order_of_the_others`,
    `test_pin_003_move_to_first_puts_the_last_place_first`,
    `test_pin_004_move_to_first_of_the_first_place_gives_null`,
    `test_pin_003_move_to_first_of_an_unknown_id_gives_null`.
  - `tests/e2e/controller-settings.test.js`:
    `test_pin_003_pin_place_moves_it_first_in_the_picker_the_grid_and_the_places_ex_039`,
    `test_pin_003_pin_place_saves_the_order_and_a_new_controller_reads_it_ex_039`,
    `test_pin_004_pin_place_of_the_first_place_changes_and_saves_nothing_ex_039`,
    `test_pin_003_pin_place_of_an_unknown_id_changes_and_saves_nothing`,
    `test_pin_003_pin_place_keeps_a_following_marker_at_now`,
    `test_pin_003_pin_place_keeps_a_moved_marker_inside_the_window`.
- **Build:** DEC-039. `moveToFirst(places, placeId)` returns the list with that place first and the
  others in their order, or `null` for an unknown place and for the first place. The action
  `pinPlace` (`placeId`) commits it as `movePlace` is committed; a refused change saves nothing.
- **Gate:** the tests and the checks pass.

### M59 — Pin buttons

- **Refs:** PIN-001, PIN-002, PIN-005, SET-008, PCK-006, EX-038, EX-039, DEC-039, DEC-020.
- **Owner:** `#picker-row-template`, `#settings-place-template` and the settings hint in
  `src/index.html`, `src/views/picker.js`, `src/views/settings-places.js`, `src/base.css` (the shared
  pin look), `src/picker.css` (the background rule goes), `src/popovers.css` and `src/theme.css` (the
  token `--color-reference` becomes `--color-menu-hover`).
- **Tests first:**
  - `tests/e2e/ui/picker.test.js`:
    `ui_pin_001_each_picker_card_has_a_pin_at_its_right_and_only_the_first_is_pinned_ex_038`,
    `ui_pin_005_the_first_picker_row_has_the_same_background_as_the_others_ex_038`,
    `ui_pin_003_pressing_a_pin_in_the_picker_moves_that_place_first_ex_039`,
    `ui_pin_004_pressing_the_first_pin_changes_nothing_ex_039`,
    `ui_pin_003_the_order_survives_a_reload_ex_039`,
    `ui_pin_001_the_pin_icon_has_at_least_3_to_1_contrast_on_its_card_in_both_themes`.
  - `tests/e2e/ui/settings-places.test.js`:
    `ui_pin_002_each_settings_card_has_a_pin_at_its_right_and_only_the_first_is_pinned_ex_038`,
    `ui_pin_005_the_first_settings_card_has_the_same_background_as_the_others_ex_038`,
    `ui_pin_003_pressing_a_pin_in_the_settings_moves_that_place_first_ex_039`,
    `ui_pin_004_the_first_places_pin_is_aria_disabled_and_named_as_the_first_place`.
  - Changed: the colour check of `ui_pck_006_first_place_is_reference` goes and its `data-reference`
    check stays; the colour check of `tests/e2e/ui/canvas-layout.test.js` (about line 230) is replaced
    by `ui_pin_005_...` above. Both asserted the different background, which PIN-005 removes.
- **Build:** DEC-039. A button (`data-role="pin"`, an inline thumbtack) at the right end of the name
  card in the picker row, and before Expand and Remove in the settings place row; `data-pinned` true
  or false drives a filled or an outline look from the text and muted-text tokens; the filled one has
  `aria-disabled="true"` and sends nothing; the name is "Make <name> the first place" or "<name> is
  the first place". `picker.js` gives each row `data-place-id` and has one delegated click listener
  that dispatches `pinPlace`; `settings-places.js` adds the role `pin`. Delete the rule that gives
  `.picker-row[data-reference="true"]` a background; keep the attribute. Rename the token. Change the
  settings hint to the wording of DEC-039.
- **Gate:** the existing tests listed above are changed because PIN-005 changed their requirement;
  the report says so; no `--color-reference` is left in `src/`; the browser tests pass in the four
  browsers.

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
