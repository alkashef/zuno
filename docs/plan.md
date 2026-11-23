# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M56**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M47** Settings as a full page with tabs | The settings cover the whole page, with the tabs General, Places and Holidays and vacations | sonnet | high | open |
| **M48** Custom places: model, zone table, map pin | A place can be a name, a time zone and a country; the zone table, the place model, the controller action and the map pin | opus | high | open |
| **M49** Add a place or person in the settings | The form of a custom place in "Add a place or person", and the holiday country list that follows the user's places | sonnet | high | open |
| **M50** Vacations on the grid and in the picker | Saved vacations show in their own colour in the month grid, count as a day off in the picker and appear in the legend | sonnet | high | open |
| **M51** Hover card, day menu and holiday form | The hover card replaces the click card; a right-click opens the day menu with Add public holiday, Hide and Remove | sonnet | high | open |
| **M52** Add, edit and remove a vacation from the menu | The day menu and its forms add, change and remove a vacation, and refuse a reversed range | sonnet | high | open |
| **M53** Export to CSV with its description | Export writes one CSV file of holidays, hidden holidays and vacations; the page describes the format | sonnet | high | open |
| **M54** Import from CSV with a confirmation | Import reads the CSV file, shows how many rows can be imported, and adds them or cancels | sonnet | high | open |
| **M55** List and delete imported files | The settings list each imported file; deleting one first asks, then undoes what only that file added | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

### M47 — Settings as a full page with tabs

- **Refs:** SET-019, DEC-033.
- **Owner:** `src/views/settings-tabs.js` (new; view layer; the tab bar and which panel shows),
  `src/views/settings.js` (must not grow, DEC-033), `src/settings.css`, `src/index.html`.
- **Tests first:** in `tests/e2e/ui/settings-display.test.js`:
  `ui_set_019_settings_layer_has_the_boxes_of_the_window_and_close_returns_the_focus`,
  `ui_set_019_three_tabs_show_one_panel_at_a_time_and_move_with_the_arrow_keys`,
  `ui_set_019_settings_open_on_the_general_tab`,
  `ui_set_019_cards_sit_side_by_side_and_stack_under_60rem`. The existing settings browser tests
  (`settings-display`, `settings-places`, `holidays`, `holidays-file`) first select the tab that holds
  what they test; the report says so, because SET-019 changed the layout.
- **Build:** `.settings` becomes a fixed layer with its own scroll, a bar with the title and the Close
  button, a tab bar and two cards side by side across the window (DEC-033). General holds Working hours
  and Display; Places holds Add a place and Places; Holidays and vacations holds Holidays and the
  file card. The selected tab is view state and returns to General when the settings open. Drop
  `--settings-width`.
- **Gate:** the layer's box is the window's box; Close and Escape close it and return the focus to the
  Settings button; the settings tests pass in the four browsers; `settings.js` is not longer than before.

### M48 — Custom places: model, zone table, map pin

- **Refs:** SET-015, SET-018, MAP-002, SET-004, SET-016, HOL-006 (domain part), EX-012, EX-013,
  EX-027, DEC-029.
- **Owner:** `scripts/make-zone-table.mjs` (development script; downloads and generates),
  `data/zone-table.js` (generated), `src/domain/zone-table.js` (new; domain layer; the only reader of
  the zone table), `src/domain/places.js`, `src/domain/cities.js`, `src/domain/user-holidays.js`,
  `src/domain/settings.js`, `src/controller-places.js` (new; controller layer; the place handlers,
  imported only by `controller.js`), `src/controller.js`, `src/main.js`, `README.md`.
- **Tests first:**
  - `tests/unit/make-zone-table.test.js`: `test_set_018_zone_tab_rows_become_zone_rows_with_degrees`
    (both `±DDMM±DDDMM` and `±DDMMSS±DDDMMSS`).
  - `tests/unit/zone-table.test.js`: `test_set_018_every_zone_has_a_known_country_and_coordinates_in_range`,
    `test_set_015_a_zone_or_country_outside_the_table_is_not_known`,
    `test_map_002_zone_row_holds_the_principal_location_of_europe_lisbon`.
  - `tests/unit/places.test.js`: `test_set_018_custom_place_from_name_zone_and_country_ex_027`,
    `test_set_018_custom_place_with_an_empty_name_is_refused`,
    `test_set_015_a_stored_custom_place_with_an_unknown_zone_is_dropped_ex_013`,
    `test_set_015_a_valid_stored_custom_place_is_kept_ex_013`,
    `test_map_002_custom_place_pin_is_at_the_zones_reference_city`,
    `test_set_016_custom_place_follows_the_weekend_of_its_country`,
    `test_hol_006_holiday_countries_include_the_country_of_a_custom_place`.
  - `tests/unit/user-holidays.test.js` and `tests/unit/cities.test.js`:
    `test_hol_006_an_added_holiday_accepts_any_known_country`. The test that expects `KE` to be
    refused (`isListedCountry`) changes, because SET-013 and HOL-006 changed; the report says so.
  - `tests/e2e/controller-settings.test.js`:
    `test_set_018_add_custom_place_saves_it_and_asks_for_the_holidays_of_its_country_ex_027`,
    `test_set_018_custom_place_with_a_bad_zone_changes_nothing`,
    `test_set_004_custom_place_survives_a_reload`.
  - `tests/e2e/ui/map.test.js`: `ui_map_002_custom_place_pin_is_at_the_zones_reference_city_ex_027`
    (settings are seeded in storage). `tests/e2e/ui/settings-places.test.js`:
    `ui_set_018_every_zone_of_the_table_is_known_to_the_browser` (four browsers).
- **Build:** `make-zone-table.mjs` as DEC-029 says: `--download` fetches `zone.tab` and
  `iso3166.tab` into `data/` once, then the script writes `data/zone-table.js`. A `Place` has
  `cityId` or `custom`; `createCustomPlace`, `restorePlace`, `placePin` and `holidayCountries` as in
  section 2.1; `isUnusablePlace` replaces `isUnlistedPlace`, `isKnownCountry` replaces
  `isListedCountry`, `countryName` names any code of the table. `controller-places.js` has
  `addCustomPlace` (checks the three fields, makes the id `place-N`, saves, asks for the country's
  holidays). A zone that a browser refuses goes on the script's skip list. Measure the page's growth
  and write it in the design (DEC-029 estimates 25 KB).
- **Gate:** `--download` has run once (approved below) and `data/zone.tab`, `data/iso3166.tab` and
  `data/zone-table.js` are committed; the tests pass in the four browsers; `domain/zone-table.js` is
  the only importer of `data/zone-table.js` (`import-rules.test.js`); no `isListedCountry` or
  `isUnlistedPlace` is left.
- **Approval:** The user, in chat on 2026-11-23: "yes for the one time download". It permits one run of
  `node scripts/make-zone-table.mjs --download`, which fetches `zone.tab` and `iso3166.tab` from IANA
  into `data/` and sends no user data, and nothing more.

### M49 — Add a place or person in the settings

- **Refs:** SET-013, SET-018, HOL-006, EX-012, EX-027, DEC-029, DEC-033.
- **Owner:** `src/views/settings-custom-place.js` (new; view layer; the form of a custom place),
  `src/views/settings.js` (must not grow), `src/views/settings-holidays.js` (country list),
  `src/main.js` (passes the zones, the countries and the offset lookup), `src/settings.css`.
- **Tests first:** in `tests/e2e/ui/settings-places.test.js`:
  `ui_set_013_add_a_place_or_person_lists_the_55_cities_and_offers_a_custom_place_ex_012`,
  `ui_set_018_custom_place_form_adds_sara_to_the_grid_the_picker_and_the_map_ex_027`,
  `ui_set_018_form_marks_an_empty_name_an_unknown_zone_or_no_country_invalid_and_adds_nothing`,
  `ui_set_018_a_full_zone_name_typed_into_the_zone_field_is_accepted` (four browsers). In
  `tests/e2e/ui/holidays.test.js`:
  `ui_hol_006_country_list_of_the_holidays_section_has_the_country_of_a_custom_place`,
  `ui_hol_006_holiday_added_for_a_custom_places_country_shows_in_its_row`.
- **Build:** "Add a place or person" gets two toggle buttons, "A city from the list" and "A person or
  another city"; the second shows the form: Name; Time zone (an `<input list>` with a `<datalist>`
  of the zones, each with its offset); Country or territory (a `<select>` of every country by English
  name, preset to the zone's own country); the Add place button. A bad field is marked `aria-invalid`
  and nothing is sent; a good form dispatches `addCustomPlace`. The Holidays section's country list
  comes from `holidayCountries` of the user's places.
- **Gate:** the tests pass in the four browsers; the page shows no label that is not English (NFR-003).

### M50 — Vacations on the grid and in the picker

- **Refs:** VAC-002 (domain part), VAC-003 (domain part), VAC-004, VAC-006, PCK-005, LEG-001, EX-029,
  DEC-030.
- **Owner:** `src/domain/vacations.js` (new; domain layer; the vacations of a place), `src/domain/places.js`
  (`Place.vacations`), `src/domain/calendar.js` (`DayFacts.vacations` and `fill`),
  `src/domain/picker.js` (a vacation day is `dayOff`), `src/views/month-grid.js`, `src/views/legend.js`,
  `src/theme.css` (vacation colour tokens), `src/month-grid.css`, `src/index.html` (legend templates).
- **Tests first:**
  - `tests/unit/vacations.test.js`: `test_vac_002_adding_a_copy_of_a_saved_vacation_changes_nothing_and_overlap_is_allowed`,
    `test_vac_003_a_vacation_that_ends_before_it_starts_is_refused`,
    `test_vac_003_check_vacation_names_what_is_missing`, `test_vac_004_vacations_on_a_date_in_the_order_added`.
  - `tests/unit/places.test.js`: `test_vac_006_vacations_are_saved_with_the_place_and_read_back`,
    `test_vac_006_an_invalid_vacation_is_dropped_and_its_place_stays`.
  - `tests/unit/calendar.test.js`: `test_vac_004_a_vacation_day_has_the_vacation_fill_ex_029`,
    `test_vac_004_a_vacation_on_a_weekend_or_holiday_splits_the_fill`.
  - `tests/unit/picker.test.js`: `test_pck_005_a_vacation_day_is_a_day_off_in_the_picker_ex_029`.
  - `tests/e2e/ui/month-grid.test.js`:
    `ui_vac_004_vacation_cells_have_their_own_colour_and_a_diagonal_split_on_a_holiday_or_weekend`,
    `ui_vac_006_a_saved_vacation_shows_after_a_reload` (the settings record is seeded). In
    `tests/e2e/ui/legend-notices.test.js`: `ui_leg_001_legend_names_the_vacation_colour_and_the_day_off_includes_vacations`.
- **Build:** `domain/vacations.js` as in section 2.1; `Place.vacations` (none by default) read through
  `restorePlace`, and removed with the place; `DayFacts` carries `vacations` and `fill { first, second }`;
  the vacation tokens `#F2C14E` (light) and `#E9AE3B` (dark); the month-grid cell uses `data-fill`;
  the picker treats a vacation day as `dayOff`; the legend names the vacation colour.
- **Gate:** the browser test records the contrast ratios of the vacation colour on the month grid
  (design section 5); the tests pass in the four browsers; `domain/vacations.js` imports only
  `domain/user-holidays.js`.

### M51 — Hover card, day menu and holiday form

- **Refs:** CAL-006, HOL-015, HOL-019, HOL-007, HOL-008, EX-016, EX-028, EX-030, DEC-031.
- **Owner:** `src/views/cell-card.js` (new; view layer; the hover and focus card of a cell),
  `src/views/day-menu.js` (new; view layer; the right-click menu), `src/views/day-dialog.js` (new;
  view layer; the forms of the day menu, here the holiday form), `src/views/month-grid.js`,
  `src/domain/calendar.js` (`dayMenuChoices`, `holidayAdded`), `src/controller.js` and
  `src/controller-holidays.js` (drop `selectHoliday`, `selectedHoliday`, `SelectedHoliday` and
  `holidayAt`), `src/popovers.css` (new sheet), `src/main.js`.
- **Tests first:**
  - `tests/unit/calendar.test.js`: `test_hol_019_day_menu_of_a_service_holiday_offers_hide_and_of_an_added_one_remove`,
    `test_hol_015_day_menu_of_any_day_offers_add_public_holiday`.
  - `tests/e2e/controller-holidays.test.js`: `test_hol_007_remove_an_added_holiday_without_selecting_it`,
    `test_hol_008_hide_a_service_holiday_without_selecting_it`. The existing tests that dispatch
    `selectHoliday` change, because CAL-006 and HOL-019 changed; the report says so.
  - `tests/e2e/ui/holidays.test.js`: `ui_cal_006_hovering_a_holiday_cell_shows_its_card_and_leaving_removes_it_ex_030`,
    `ui_cal_006_keyboard_focus_on_a_holiday_cell_shows_its_card`,
    `ui_cal_006_a_vacation_cell_card_shows_the_label_and_the_dates`,
    `ui_hol_015_right_click_add_public_holiday_presets_the_clicked_day_ex_028`,
    `ui_hol_019_the_day_menu_hides_a_holiday_and_the_settings_show_it_again_ex_016`,
    `ui_hol_019_the_day_menu_removes_an_added_holiday`,
    `ui_hol_019_escape_and_a_click_outside_close_the_day_menu`.
- **Build:** DEC-031: one delegated `contextmenu` listener on the month grid opens a `role="menu"`
  popover at the pointer; the choices come from `dayMenuChoices`; Add public holiday opens the form
  in a native `<dialog>`; Hide and Remove dispatch the existing actions. The hover card shows on
  `pointerenter` and `focusin` for a holiday or vacation cell, has no buttons and no pointer events.
  Each cell has `data-place-id`, `data-date` and `data-fill`. No keyboard route (accepted risk).
- **Gate:** no `selectHoliday`, `selectedHoliday`, `SelectedHoliday` or `holidayAt` is left in `src/`
  (search); a listed holiday can be hidden and an added one removed at every commit; the tests pass in
  the four browsers.

### M52 — Add, edit and remove a vacation from the menu

- **Refs:** VAC-001, VAC-002, VAC-003, VAC-005, VAC-006, EX-029, DEC-030, DEC-031.
- **Owner:** `src/controller-places.js` (`addVacation`, `changeVacation`, `removeVacation`),
  `src/controller.js`, `src/domain/calendar.js` (`dayMenuChoices` gains the vacation choices),
  `src/views/day-menu.js`, `src/views/day-dialog.js` (the vacation forms), `src/main.js` (passes
  `checkVacation`).
- **Tests first:**
  - `tests/unit/calendar.test.js`: `test_vac_001_day_menu_offers_add_public_holiday_and_add_vacation`,
    `test_vac_005_day_menu_of_a_vacation_day_offers_edit_and_remove_vacation`.
  - `tests/e2e/controller-settings.test.js`: `test_vac_002_add_vacation_saves_it_to_that_places_settings_ex_029`,
    `test_vac_003_a_reversed_range_saves_nothing`,
    `test_vac_005_change_and_remove_act_on_the_whole_vacation`,
    `test_vac_006_vacation_changes_are_saved_and_restored`.
  - `tests/e2e/ui/month-grid.test.js`: `ui_vac_001_right_click_offers_add_public_holiday_and_add_vacation`,
    `ui_vac_002_add_vacation_presets_the_clicked_day_and_adds_winter_break_ex_029`,
    `ui_vac_003_a_reversed_range_marks_the_fields_invalid_and_says_so`,
    `ui_vac_005_edit_and_remove_a_vacation_from_any_of_its_days`,
    `ui_vac_006_a_vacation_added_by_the_menu_survives_a_reload_ex_029`.
- **Build:** Add vacation and Edit vacation open one dialog with the start date (preset to the
  clicked day), the end date and an optional label; a refused range marks the fields `aria-invalid` and
  fills a `role="alert"` line; Edit and Remove act on the whole vacation, from any of its days.
  The place handlers save the settings after an accepted change and nothing after a refused one.
- **Gate:** EX-029 passes end to end (right-click, add, reload, hover card, picker day off); the tests
  pass in the four browsers.

### M53 — Export to CSV with its description

- **Refs:** HOL-010, HOL-012 (the CSV reader), HOL-016, EX-017 (export half), EX-031, DEC-032, NFR-001.
- **Owner:** `src/domain/csv.js` (new; domain layer; reads and writes CSV text, knows nothing of
  holidays), `src/domain/holidays-file.js` (new; domain layer; here `toCsv`),
  `src/files.js` (`saveText`, `readText`), `src/controller-holidays.js` (`exportHolidays`),
  `src/config.js` (`holidaysFileName`), `src/views/settings-file.js` (new; view layer; the file card),
  `src/views/settings-holidays.js` (loses Export and Import), `src/index.html` (the description),
  `src/main.js`.
- **Tests first:**
  - `tests/unit/csv.test.js`: `test_hol_010_format_quotes_only_the_fields_that_need_it_and_ends_lines_with_crlf`,
    `test_hol_010_parse_reads_what_format_writes`,
    `test_hol_012_parse_ignores_a_byte_order_mark_and_returns_null_for_an_open_quote`.
  - `tests/unit/holidays-file.test.js`: `test_hol_010_to_csv_writes_one_row_per_entry_ex_031`,
    `test_hol_010_a_hidden_holiday_row_keeps_its_name`,
    `test_hol_010_dates_are_dd_mmm_yy_and_countries_are_english_names`,
    `test_hol_016_the_example_on_the_page_equals_the_to_csv_output_of_ex_031`.
  - `tests/unit/files.test.js`: `test_hol_010_save_text_makes_a_blob_link_and_revokes_the_url`,
    `test_hol_012_read_text_reports_an_unreadable_file`.
  - `tests/e2e/controller-holidays.test.js`: `test_hol_010_export_saves_one_csv_file_with_the_configured_name`.
  - `tests/e2e/ui/holidays-file.test.js`: `ui_hol_010_export_downloads_the_three_rows_of_ex_031`,
    `ui_hol_016_the_page_describes_the_columns_the_date_format_and_an_example_beside_the_buttons`.
- **Build:** DEC-032: the byte-order mark, the header `Type,Country,Place,Start date,End date,Name`,
  one row per entry with `\r\n` ends, added holidays by country then date, hidden holidays likewise,
  then vacations by place order. The description is static markup in `index.html` beside the buttons.
  `holidaysFileName` is `zuno-holidays-and-vacations.csv`. The Import button and its JSON reader stay
  as they are until M54.
- **Gate:** the existing export tests that expect JSON are changed, because HOL-010 changed; the report
  says so; the tests pass in the four browsers; the file of EX-031 opens with its header and three rows.

### M54 — Import from CSV with a confirmation

- **Refs:** HOL-011, HOL-012, HOL-017, HOL-018, EX-017, EX-018, EX-032, DEC-032.
- **Owner:** `src/domain/holidays-file.js` (`planImport`), `src/domain/user-holidays.js`
  (`mergeUserHolidays`; the JSON file functions go), `src/controller-holidays.js` (`importHolidays`,
  `confirmImport`, `cancelImport`), `src/controller.js` (`holidayImport`), `src/views/import-dialog.js`
  (new; view layer; the import preview), `src/views/settings-file.js` (the refused message),
  `src/files.js` (the JSON read and save go), `src/main.js`.
- **Tests first:**
  - `tests/unit/holidays-file.test.js`: `test_hol_012_the_text_hello_is_refused_ex_018`,
    `test_hol_012_a_file_without_the_header_row_is_refused`, `test_hol_012_an_old_json_file_is_refused`,
    `test_hol_017_the_plan_counts_importable_rows_out_of_the_total_and_names_the_missing_place_ex_032`,
    `test_hol_017_an_invalid_row_counts_apart`, `test_hol_017_dates_are_read_as_d_mmm_yy_and_d_mmm_yyyy`,
    `test_hol_017_a_country_is_read_by_name_or_by_two_letter_code`.
  - `tests/e2e/controller-holidays.test.js`: `test_hol_017_import_shows_a_preview_and_changes_nothing_yet`,
    `test_hol_011_confirm_adds_the_holidays_and_vacations_and_no_place_ex_032`,
    `test_hol_011_an_identical_vacation_is_skipped`,
    `test_hol_018_cancel_changes_nothing_ex_032`,
    `test_hol_012_a_refused_file_changes_nothing_ex_018`,
    `test_hol_011_a_file_exported_by_browser_a_imports_in_browser_b_ex_017`.
  - `tests/e2e/ui/holidays-file.test.js`:
    `ui_hol_017_the_dialog_says_n_of_m_rows_can_be_imported_and_names_the_missing_place_ex_032`,
    `ui_hol_011_add_adds_the_rows`, `ui_hol_018_cancel_changes_nothing`,
    `ui_hol_012_a_refused_file_shows_the_message_ex_018`,
    `ui_hol_017_country_names_as_chromium_writes_them_import_in_every_browser`.
- **Build:** DEC-032: `planImport` refuses a file that is not CSV or has not the six header names; it
  counts the importable rows, the missing places and the invalid rows; the controller keeps the plan
  in `holidayImport` (`null`, `refused` or `preview`) until Add or Cancel; the dialog is a native
  `<dialog>` with Cancel and "Add N rows" (disabled while N is 0). Remove the JSON import.
- **Gate:** the existing import tests that use JSON are changed, because HOL-010 to HOL-012 changed;
  the report says so; the tests pass in the four browsers.

### M55 — List and delete imported files

- **Refs:** HOL-020, HOL-021, HOL-022, HOL-023, EX-034, DEC-035.
- **Owner:** `src/domain/user-holidays.js` (`imports`, `sources`), `src/domain/vacations.js`
  (`sources`), `src/domain/holidays-file.js` (`importRemovalPlan`), `src/domain/places.js`,
  `src/controller-holidays.js` (`confirmImport` records and tags; `removeImport`),
  `src/views/settings-file.js` (the list), `src/views/import-dialog.js` (the delete form),
  `src/index.html` (the template of the delete form), `src/main.js`.
- **Tests first:**
  - `tests/unit/holidays-file.test.js`: `test_hol_022_the_removal_plan_lists_the_entries_that_go_and_those_that_stay_ex_034`,
    `test_hol_022_an_entry_that_another_file_also_lists_stays`,
    `test_hol_022_an_entry_the_user_typed_is_never_removed`.
  - `tests/unit/user-holidays.test.js`: `test_hol_023_a_record_saved_before_has_no_imports_and_no_sources`,
    `test_hol_020_the_counts_of_an_import_follow_the_entries_that_remain`.
  - `tests/e2e/controller-holidays.test.js`: `test_hol_020_confirm_import_records_the_file_and_tags_its_entries`,
    `test_hol_022_remove_import_a_then_b_ex_034`,
    `test_hol_022_removing_a_place_lowers_the_counts_of_the_imports`,
    `test_hol_023_the_list_of_imports_survives_a_reload`.
  - `tests/e2e/ui/holidays-file.test.js`: `ui_hol_020_the_list_shows_each_file_with_its_time_and_counts_ex_034`,
    `ui_hol_021_the_delete_dialog_says_how_many_entries_go_and_stay_and_cancel_changes_nothing`,
    `ui_hol_022_deleting_a_removes_z_v1_and_v2_and_keeps_x_ex_034`,
    `ui_hol_023_the_list_is_the_same_after_a_reload_ex_034`.
- **Build:** DEC-035: `imports: [{ id, fileName, importedAt }]` in the holidays record (still version
  1, so an old record has none); `sources` on holidays, hidden holidays and vacations; an identical
  entry that the user typed gets no source; a file with no importable row makes no record; the same file
  imported twice makes two records. The list shows the name, the time and date and the counts, worked
  out when drawn. Delete asks first (Cancel or "Delete N entries"), then removes the record, takes its
  id out of every `sources` and deletes the entries left with none; both records are saved.
- **Gate:** EX-034 passes end to end, including the reload; the tests pass in the four browsers.
