# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M29**

## Milestones at a glance

| Milestone | Description | Model | Effort | Status |
| --- | --- | --- | --- | --- |
| **M24** Holidays the user adds and hides | Add, remove, hide and show holidays per country, saved in the browser, from the settings panel and the holiday card | opus | high | open |
| **M25** Holidays file | Export the user's holidays to a file and import one; a bad file is refused | sonnet | high | open |
| **M26** Picker window and selected day | Hour slots of a fixed width from midnight of the selected day, 24 hours or more, the date range in the day selector, the hours saved | opus | high | open |
| **M27** Resize handle and hover time | Dragging the picker's left edge adds or removes hour slots; pointing at a row shows the local time and date there | sonnet | high | open |
| **M28** Rounded look and split legend | Rounded corners, cyan weekend, the picker as a card, the legend in two parts, location icons, the settings sections in the canvas's order with lines | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

The visual reference for M26 to M28 is the "Zuno UI" canvas named at the top of `docs/design.md`;
DEC-019 to DEC-021 state its sizes and colours. Existing tests that check behaviour a requirement
of 2026-11-18 changed (SET-002, SET-003, SET-007, CAL-002, HOL-003, PCK-003, PCK-006, PCK-007) are
updated in the milestone that changes it, and the report names them.

### M24 — Holidays the user adds and hides

- **Refs:** HOL-003, HOL-006, HOL-007, HOL-008, HOL-009, EX-015, EX-016, DEC-017.
- **Owner:** `src/domain/user-holidays.js`, `src/controller.js`, `src/views/settings-holidays.js`.
- **Tests first:** `test_hol_006_added_holiday_shows_for_every_place_of_its_country` (EX-015), `test_hol_006_add_refuses_a_bad_date_an_empty_name_and_an_unlisted_country`, `test_hol_007_user_removes_an_added_holiday`, `test_hol_008_hidden_service_holiday_is_not_a_holiday_until_shown_again` (EX-016), `test_hol_003_effective_holidays_are_service_minus_hidden_plus_added`, `test_hol_009_added_and_hidden_holidays_are_saved_and_restored`, `test_hol_006_holidays_section_adds_and_lists_a_holiday` (browser), `test_hol_008_holiday_card_hides_a_service_holiday_and_removes_an_added_one` (browser).
- **Build:** `domain/user-holidays.js`; a second `createStorage` under `holidaysStorageKey` with `parseUserHolidays`; the controller loads the record on `open`, handles `addHoliday`, `removeHoliday`, `hideHoliday` and `showHoliday`, saves after each, and gives the month grid and the picker the effective holidays; the Holidays section of the settings panel (add form, added list with Remove, hidden list with Show); the holiday card's Hide or Remove button.
- **Gate:** the service's holiday data is still never saved; the settings record is unchanged by a holiday action.

### M25 — Holidays file

- **Refs:** HOL-010, HOL-011, HOL-012, EX-017, EX-018, NFR-001, DEC-018.
- **Owner:** `src/files.js`, `src/controller.js`, `src/views/settings-holidays.js`.
- **Tests first:** `test_hol_010_export_saves_the_added_and_hidden_holidays_to_a_file` (controller with a fake `files`; browser: the download's name and content), `test_hol_011_import_adds_the_files_holidays_to_the_saved_ones` (EX-017; an entry already saved is not doubled), `test_hol_012_invalid_file_changes_nothing_and_is_reported` (EX-018: not JSON, and JSON of the wrong shape), `test_nfr_001_export_and_import_make_no_network_request` (browser).
- **Build:** `files.js` (`saveJson`, `readJson`); `exportHolidays` and `importHolidays` in the controller with `files` injected; `holidayImport` in the page view; the Export and Import buttons and the refusal message in the Holidays section; `holidaysFileName` in `config.js`.
- **Gate:** the export browser test passes in Chromium, Firefox, WebKit and Edge under the page's Content-Security-Policy; if a browser blocks the download, stop and report (DEC-018).

### M26 — Picker window and selected day

- **Refs:** PCK-003, PCK-006, PCK-007, PCK-009, PCK-004, LAY-003, EX-019, EX-020, EX-003, DEC-019.
- **Owner:** `src/domain/picker.js`, `src/controller.js`, `src/views/picker.js`, `src/views/day-selector.js`.
- **Tests first:** `test_pck_006_window_starts_at_midnight_of_the_selected_day_and_lasts_picker_hours` (EX-019; 24 and 30 hours; a 25-hour day at 24 slots covers the whole day), `test_pck_006_moving_the_marker_does_not_move_the_window` (EX-020), `test_pck_007_choosing_a_day_sets_the_selected_day_and_moves_the_marker` (EX-020), `test_pck_004_page_opens_with_today_selected_in_the_first_place`, `test_pck_009_day_selector_shows_first_and_last_date_of_the_window` (EX-019; a range across two months), `test_pck_003_rows_are_coloured_over_the_whole_window`, `test_lay_003_picker_hours_are_saved_and_restored` (EX-019), `test_pck_006_hour_slots_keep_one_width_at_24_and_30_hours` (browser), `test_lay_003_saved_record_without_picker_hours_gets_24`.
- **Build:** `selectedDay` in the state and `pickerHours` in the settings (`pickerDefaultHours`, `pickerMinHours`, `pickerMaxHours` in `config.js`); `pickerWindow` from the selected day; `setMarker`, `shiftMarkerDay` and the new `setPickerHours` as in DEC-019; `formatDateRange` in `domain/format.js`; the picker panel's width follows `pickerHours` times `--picker-slot`, with the axis labels and hour lines per slot; the day selector's date button shows the range.
- **Gate:** EX-003 still passes; the marker is always inside the window.

### M27 — Resize handle and hover time

- **Refs:** LAY-002, PCK-008, EX-019, EX-021, DEC-019.
- **Owner:** `src/views/picker.js`.
- **Tests first:** `test_lay_002_dragging_the_left_edge_adds_and_removes_hour_slots` (browser; EX-019: 6 slots wider, never below 24), `test_lay_002_arrow_keys_on_the_handle_change_the_width_by_one_slot` (browser), `test_pck_008_pointer_over_a_row_shows_that_places_local_time_and_date` (browser; EX-021), `test_pck_008_the_label_goes_when_the_pointer_leaves` (browser).
- **Build:** a resize handle (a real `<button>` in the picker template) on the panel's left edge that dispatches `setPickerHours` in whole slots on drag and on the left and right arrow keys, capped as in DEC-019; a hover label above the row under the pointer, from the instant on the `pickerStepMinutes` grid and the `localAt` lookup; both are view state only.
- **Gate:** the picker's marker drag and keyboard tests still pass.

### M28 — Rounded look and split legend

- **Refs:** LEG-001, THM-001, MAP-001, DSP-001, DEC-020, DEC-021.
- **Owner:** `src/theme.css` and the view sheets, `src/index.html`, `src/views/legend.js`.
- **Tests first:** `test_dec_020_cards_and_controls_have_the_designs_corner_radii` (browser), `test_dec_020_weekend_is_cyan_and_dark_today_outline_is_warm_yellow` (browser, both themes, with the contrast check of text on tints), `test_leg_001_month_grid_and_picker_each_show_their_own_legend` (browser: every colour named once, no banner at the page bottom), `test_dec_020_picker_is_a_card_with_no_heading_and_the_date_sits_beside_the_time` (browser), `test_dec_020_month_grid_weekday_sits_above_the_day_number` (browser), `test_dec_021_each_place_is_a_location_icon_with_its_tip_on_the_place` (browser), `test_dec_020_settings_sections_are_in_the_canvas_order_with_a_line_after_each` (browser: Working hours, Display, Add a place, Places, Holidays).
- **Build:** the radius tokens and the new weekend and today colours in `theme.css`; the page layout with the picker as a card and a gap; the two legend parts inside the month grid and picker cards, filled by `views/legend.js`; picker rows as on the canvas (no heading, date beside the time in the offset's style, rows as tall as their text, a 28 px band); the weekday above the day number; the location icon in the pin template and the label offsets in `views/map.js`; the settings sections in the canvas's order with a line after each.
- **Gate:** `tests/e2e/ui/canvas-layout.test.js` and the contrast tests are updated to DEC-020 and pass in the four browsers; no colour value is written outside `theme.css`.
