# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M56**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M55** List and delete imported files | The settings list each imported file; deleting one first asks, then undoes what only that file added | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

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
