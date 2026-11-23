# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M56**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M52** Add, edit and remove a vacation from the menu | The day menu and its forms add, change and remove a vacation, and refuse a reversed range | sonnet | high | open |
| **M53** Export to CSV with its description | Export writes one CSV file of holidays, hidden holidays and vacations; the page describes the format | sonnet | high | open |
| **M54** Import from CSV with a confirmation | Import reads the CSV file, shows how many rows can be imported, and adds them or cancels | sonnet | high | open |
| **M55** List and delete imported files | The settings list each imported file; deleting one first asks, then undoes what only that file added | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

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
