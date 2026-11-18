# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M45**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M44** Movable map border, edge-to-edge cards | Drag the border between the map and the month grid, saved in the browser; cards edge to edge and 32 px month cells | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

### M44 — Movable map border, edge-to-edge cards

- **Refs:** LAY-004, LAY-005, DEC-028, DEC-020 (changes of 2026-11-19).
- **Owner:** `views/map-resize.js` (new), `domain/settings.js`, `controller.js`, `layout.css`, `map.css`, `month-grid.css`, `theme.css`.
- **Tests first:** `test_lay_004_map_height_is_whole_pixels_within_the_limits`, `test_lay_005_saved_map_height_outside_the_limits_reads_as_null` (unit, settings); `test_lay_005_setting_the_map_height_saves_it` (controller e2e); `test_lay_004_dragging_the_border_resizes_the_map_and_the_grid_takes_the_rest`, `test_lay_004_arrow_keys_on_the_border_move_it`, `test_lay_005_the_map_height_comes_back_after_a_reload`, `ui_dec_020_cards_run_edge_to_edge_and_month_cells_are_32_px` (browser).
- **Build:** `mapHeight` in `Settings` with `withMapHeight` and its parsing (DEC-028); the `setMapHeight` action; config `mapMinHeight`, `mapMaxHeight`, `mapHeightStepPx`; `views/map-resize.js` with its template and styles; the fixed map row in `layout.css`; no page padding or card gap; `--grid-cell-height` 32 px.
- **Gate:** the new tests pass in Chromium; the existing layout tests that asserted the page padding and the 20 px gap are changed to the edge-to-edge layout (DEC-020 changed), and nothing else.
