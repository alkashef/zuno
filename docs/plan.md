# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M56**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M54** Import from CSV with a confirmation | Import reads the CSV file, shows how many rows can be imported, and adds them or cancels | sonnet | high | open |
| **M55** List and delete imported files | The settings list each imported file; deleting one first asks, then undoes what only that file added | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

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
