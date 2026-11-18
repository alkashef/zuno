# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M29**

## Milestones at a glance

| Milestone | Description | Model | Effort | Status |
| --- | --- | --- | --- | --- |
| **M28** Rounded look and split legend | Rounded corners, cyan weekend, the picker as a card, the legend in two parts, location icons, the settings sections in the canvas's order with lines | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

The visual reference for M26 to M28 is the "Zuno UI" canvas named at the top of `docs/design.md`;
DEC-019 to DEC-021 state its sizes and colours. Existing tests that check behaviour a requirement
of 2026-11-18 changed (SET-002, SET-003, SET-007, CAL-002, HOL-003, PCK-003, PCK-006, PCK-007) are
updated in the milestone that changes it, and the report names them.

### M28 — Rounded look and split legend

- **Refs:** LEG-001, THM-001, MAP-001, DSP-001, DEC-020, DEC-021.
- **Owner:** `src/theme.css` and the view sheets, `src/index.html`, `src/views/legend.js`.
- **Tests first:** `test_dec_020_cards_and_controls_have_the_designs_corner_radii` (browser), `test_dec_020_weekend_is_cyan_and_dark_today_outline_is_warm_yellow` (browser, both themes, with the contrast check of text on tints), `test_leg_001_month_grid_and_picker_each_show_their_own_legend` (browser: every colour named once, no banner at the page bottom), `test_dec_020_picker_is_a_card_with_no_heading_and_the_date_sits_beside_the_time` (browser), `test_dec_020_month_grid_weekday_sits_above_the_day_number` (browser), `test_dec_021_each_place_is_a_location_icon_with_its_tip_on_the_place` (browser), `test_dec_020_settings_sections_are_in_the_canvas_order_with_a_line_after_each` (browser: Working hours, Display, Add a place, Places, Holidays).
- **Build:** the radius tokens and the new weekend and today colours in `theme.css`; the page layout with the picker as a card and a gap; the two legend parts inside the month grid and picker cards, filled by `views/legend.js`; picker rows as on the canvas (no heading, date beside the time in the offset's style, rows as tall as their text, a 28 px band); the weekday above the day number; the location icon in the pin template and the label offsets in `views/map.js`; the settings sections in the canvas's order with a line after each.
- **Gate:** `tests/e2e/ui/canvas-layout.test.js` and the contrast tests are updated to DEC-020 and pass in the four browsers; no colour value is written outside `theme.css`.
