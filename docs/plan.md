# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M44**

## Milestones at a glance

| Milestone | Description | Model | Effort | Status |
| --- | --- | --- | --- | --- |
| **M30** Month grid columns match the days | With Hijri on, the grid has one column per day again and the day cells keep their width | sonnet | medium | open |
| **M31** Holiday table: generator and data | A script writes the public holidays of seven countries for 2026 to 2028 into `data/`, and a domain module reads them | opus | high | open |
| **M32** Holiday table in the page | Places in the seven countries show the table's holidays, with no request to the service | sonnet | high | open |
| **M33** Notice skips countries with added holidays | The "No holiday data" notice leaves out a country the user added a holiday for | sonnet | medium | open |
| **M34** Real coastlines on the map | The map's outline is Natural Earth's coastlines, put into the page by the build | sonnet | high | open |
| **M35** Half-transparent map labels | The map shows through the city labels, and their text stays readable | sonnet | low | open |
| **M36** Hijri day look and "Day" label | The Hijri day has no chip and regular weight, a darker shade on tinted cells, and the corner reads "Day" | sonnet | medium | open |
| **M37** Smaller month header | The month buttons are 32 px and the header row takes 40 px, not 60 px | sonnet | low | open |
| **M38** Country names as the city list names them | Hong Kong's territory reads "Hong Kong" | sonnet | low | open |
| **M39** Weekend equal to the country's is the default | A place whose ticked days equal its country's weekend stores no choice of its own | sonnet | low | open |
| **M40** Version in the settings panel | The settings footer shows "Version" and the build's date and time in UTC | sonnet | medium | open |
| **M41** No 24-hour fallback in the settings reader | `parseSettings` needs its limits; no default in code | sonnet | low | open |
| **M42** Newer workflows in four browsers | The workflows added since M21 also run in Firefox, WebKit and Edge | sonnet | medium | open |
| **M43** Publish to GitHub Pages | Every push to `main` builds the page and publishes it | sonnet | medium | blocked |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

### M30 — Month grid columns match the days

- **Refs:** CAL-001, HIJ-001.
- **Owner:** `src/views/month-grid.js`.
- **Tests first:** `ui_cal_001_one_column_per_day_and_same_cell_width_with_hijri_on`,
  `ui_hij_001_band_cells_span_exactly_the_days_of_the_month`.
- **Build:** the cells of the Hijri month band span one column too many each (a cell's span starts
  at 0, which the browser reads as 1, and then grows by one per day). Make each band cell span
  exactly its days.
- **Gate:** in November 2026 with Hijri on the grid has 30 day columns, the band's spans add up to
  30, and a day cell is as wide as with Hijri off.

### M31 — Holiday table: generator and data

- **Refs:** HOL-013, NFR-003, EX-022, DEC-024.
- **Owner:** `scripts/make-holiday-table.mjs`, `data/holiday-table.js`,
  `src/domain/holiday-table.js`.
- **Tests first:** `test_hol_013_table_covers_seven_countries_for_2026_to_2028`,
  `test_hol_013_riyadh_and_new_delhi_dates_ex_022`,
  `test_hol_013_year_outside_the_table_gives_null`, `test_nfr_003_table_names_are_english`.
- **Build:** add `date-holidays` as a dev dependency, pinned to the installed version. Write the
  script and generate `data/holiday-table.js` as DEC-024 says (type `public`, whole country, English
  names, 2026 to 2028, a header with the library, its version and the data's licence). Add
  `domain/holiday-table.js` with `isTableCountry` and `tableHolidays`. Extend
  `tests/unit/import-rules.test.js` for the rule that only `domain/holiday-table.js` imports the
  table. README: the generator command, the dev dependency and the licence of the table
  (CC BY-SA 3.0).
- **Gate:** the generated table holds 2026-09-23 for `SA` and 2026-01-26 for `IN`. If the library
  has no `public` holidays or no English names for one of the seven countries, or lacks one of those
  two dates, stop as blocked and report what it gives.
- **Approval:** User, 2026-11-18, dialogs (decision 27, "Built-in table from the library", and the
  plan): the milestone may install `date-holidays` as a dev-only dependency. Nothing else.

### M32 — Holiday table in the page

- **Refs:** HOL-013, HOL-001, HOL-003, HOL-008, NFR-001, EX-022, EX-023, DEC-024.
- **Owner:** `src/controller.js`.
- **Tests first:** `test_hol_013_table_country_shows_table_holidays_ex_022`,
  `test_hol_001_no_service_request_for_a_table_country`, `test_hol_008_hide_a_table_holiday`,
  `test_hol_013_year_after_the_table_is_unavailable_ex_023`,
  `ui_hol_013_riyadh_holiday_and_credit_line_ex_022`.
- **Build:** for a table country the controller takes the holidays of a year from
  `domain/holiday-table.js` instead of `api.js`: a list is a `loaded` result, `null` an `unavailable`
  one. `main.js` passes the table functions in. The Holidays section of the settings panel gets one
  credit line for the table (markup in `index.html`). README: what the table covers and until when.
- **Gate:** a Riyadh place shows 2026-09-23 as a public holiday with no request to the holiday
  service; January 2029 lists Saudi Arabia in the no-data notice; the request check of NFR-001 still
  passes.

### M33 — Notice skips countries with added holidays

- **Refs:** HOL-014, REF-002, EX-023.
- **Owner:** `src/controller-holidays.js`.
- **Tests first:** `test_hol_014_notice_leaves_out_a_country_with_an_added_holiday`,
  `test_hol_014_riyadh_2029_before_and_after_adding_ex_023`,
  `ui_hol_014_notice_goes_after_the_user_adds_a_holiday`.
- **Build:** `noticesOf` leaves a country out of the no-data list while the user's record holds at
  least one added holiday for it. A hidden holiday does not count.
- **Gate:** EX-023 passes as written, in the controller test and in the browser test.

### M34 — Real coastlines on the map

- **Refs:** MAP-001, PKG-001, NFR-001, DEC-026.
- **Owner:** `scripts/make-map.mjs`, `scripts/build.mjs`.
- **Tests first:** `test_map_001_projection_puts_longitude_and_latitude_on_the_grid`,
  `test_pkg_001_built_page_holds_the_outline_and_no_marker`,
  `ui_map_001_outline_is_drawn_and_pins_stay_on_their_places`.
- **Build:** as DEC-026 says. `make-map.mjs --download` fetches `ne_110m_land.geojson` into `data/`;
  without the flag it writes `data/map-outline.svg` from it. `index.html` gets the marker
  `<!--zuno:map-outline-->` in place of the hand-drawn outline, and the build puts the path there.
  Commit the downloaded file and the generated outline. README: the two commands, the source and
  its licence.
- **Gate:** the built page has no marker left and makes no request for the map; the pins of the
  existing map tests are where they were. Report the size of `data/map-outline.svg` and of the built
  page. If the download fails, stop as blocked.
- **Approval:** User, 2026-11-18, dialogs (decision 26, "The milestone downloads it", and the
  plan): the milestone may download the one file `ne_110m_land.geojson` from Natural Earth's public
  GitHub repository. Nothing else.

### M35 — Half-transparent map labels

- **Refs:** MAP-001, DEC-020.
- **Owner:** `src/map.css`, `src/theme.css`.
- **Tests first:** `ui_map_001_label_background_is_the_card_colour_at_half_strength`,
  `ui_map_001_label_text_contrast_over_land_and_over_sea`.
- **Build:** add `--color-map-label` to `theme.css` (the card colour mixed with `transparent` at
  50%) and use it as the background of a map label.
- **Gate:** in both themes every text of a label has at least 4.5:1 against the label's colour laid
  over the land colour and over the sea colour. If one does not, stop as blocked and report the
  ratios.

### M36 — Hijri day look and "Day" label

- **Refs:** HIJ-001, DSP-003, CAL-001, DEC-027, DEC-020.
- **Owner:** `src/month-grid.css`, `src/theme.css`, `src/views/month-grid.js`.
- **Tests first:** `ui_hij_001_hijri_day_has_no_background_and_regular_weight`,
  `ui_hij_001_hijri_day_colour_on_weekend_and_holiday_cells`,
  `ui_cal_001_corner_label_reads_day_with_hijri_on_and_off`.
- **Build:** as DEC-027 says: no chip, weight `normal`, `--color-hijri-on-tint` (`#8F1A5B` light,
  `#2B1464` dark) on weekend, holiday and split cells; `--color-chip` leaves `theme.css`. The corner
  label of the day header reads "Day" whether Hijri is on or off.
- **Gate:** measured contrast of the Hijri day: at least 4.5:1 on the card and on the weekend
  colour in both themes and on the dark holiday colour, and at least 3:1 on the light holiday
  colour. Report the measured ratios.
- **Approval:** User, 2026-11-18, dialogs (decision 2, "Slightly darker everywhere"; decision 3,
  "Regular weight"; decision 4, "Day only"; and the plan): the milestone may change the existing
  contrast test so that the Hijri day on the holiday colour needs 3:1 instead of 4.5:1, and the
  existing tests that expect the chip or the label "Day and Hijri day". Name each changed test in
  the report. Nothing else.

### M37 — Smaller month header

- **Refs:** CAL-005, DEC-020.
- **Owner:** `src/month-grid.css`, `src/theme.css`.
- **Tests first:** `ui_cal_005_month_buttons_are_32_px_and_the_header_row_takes_40_px`.
- **Build:** add `--month-nav-size` (32 px) to `theme.css`. In the month grid's header the previous
  and next buttons are squares of that size with `--icon-size-small` arrows, the title is
  `--font-size-body`, and `--space-2` lies under the row. No other button changes.
- **Gate:** the two buttons still change the month (the existing tests of CAL-005 pass unchanged).

### M38 — Country names as the city list names them

- **Refs:** DSP-004, SET-010, EX-025, DEC-015.
- **Owner:** `src/domain/cities.js`.
- **Tests first:** `test_dsp_004_every_country_name_matches_the_city_list`,
  `test_dsp_004_hong_kong_ex_025`, `ui_dsp_004_hong_kong_place_and_city_list_ex_025`.
- **Build:** `countryName` first looks in `territoryNames`, a frozen object with `HK`: "Hong Kong",
  then asks `Intl`.
- **Gate:** the names of all 55 rows equal the country column of the spec's section 9.

### M39 — Weekend equal to the country's is the default

- **Refs:** SET-017, SET-016, EX-024.
- **Owner:** `src/domain/places.js`.
- **Tests first:** `test_set_017_weekend_equal_to_the_countrys_stores_no_choice_ex_024`,
  `test_set_017_edit_place_back_to_the_default_is_saved`.
- **Build:** an edit that sets a place's weekend days to exactly the weekend of its country stores
  `null` for the place's weekend days. The order of the days does not matter.
- **Gate:** EX-024 passes as written.

### M40 — Version in the settings panel

- **Refs:** VER-001, DSP-001, EX-026, DEC-025.
- **Owner:** `scripts/build.mjs`, `src/index.html`.
- **Tests first:** `test_ver_001_version_text_from_the_build_time_ex_026`,
  `test_ver_001_built_page_holds_the_version_and_no_marker`,
  `ui_ver_001_settings_footer_shows_the_version_ex_026`.
- **Build:** `buildPage` takes `builtAt`; `versionText(builtAt)` gives `YYYY.MM.DD.HHmm` in UTC; the
  build replaces the marker `<!--zuno:version-->` after the word "Version" in the settings panel's
  footer. The command-line entry passes the current time; `tests/e2e/ui/page-fixture.js` and the
  build tests pass a fixed time. README: what the version means.
- **Gate:** a page built with 2026-11-18 14:32 UTC shows "Version 2026.11.18.1432" in the settings
  panel.

### M41 — No 24-hour fallback in the settings reader

- **Refs:** LAY-003, DEC-016, DEC-019.
- **Owner:** `src/domain/settings.js`.
- **Tests first:** `test_lay_003_parse_settings_without_limits_throws`.
- **Build:** remove the default value of the `limits` parameter of `parseSettings` and the constant
  behind it; a call without limits throws a `TypeError` that names the missing argument. Every
  caller passes its limits.
- **Gate:** no expected result of an existing test changes.
- **Approval:** User, 2026-11-18, dialog (the plan): the milestone may add the missing limits
  argument (the whole day: 24, 24, 24) to the existing tests that call `parseSettings` without it.
  Name each changed test file in the report. Nothing else.

### M42 — Newer workflows in four browsers

- **Refs:** NFR-002, LAY-002, PCK-007, PCK-008, HOL-006, HOL-008, HOL-013, VER-001, DEC-011.
- **Owner:** `tests/e2e/ui/nfr.test.js`.
- **Tests first:** `ui_nfr_002_newer_workflows_in_chromium_firefox_webkit_edge`.
- **Build:** one test that runs, in each of the four browsers: widen the picker by its handle,
  read a hover time, choose the next day, add a holiday, hide a holiday of the built-in table, and
  read the version. Tests only. If a browser fails a step, fix the cause in the owning module.
- **Gate:** the test passes in Chromium, Firefox, WebKit and Edge. Remove the row "The newer
  workflows ... in Chromium only" from `docs/design.md` section 5.
- **Approval:** User, 2026-11-18, dialog (the plan): this milestone adds tests only, so its new test
  need not fail first (step 4.2 of the workflow). Nothing else.

### M43 — Publish to GitHub Pages

- **Refs:** PKG-001, DEC-023.
- **Owner:** `.github/workflows/pages.yml`.
- **Tests first:** `test_pkg_001_pages_workflow_builds_and_deploys_the_one_file`.
- **Build:** add `.github/workflows/pages.yml` as DEC-023 says (the file prepared in the Git stash
  `stash@{0}` may be used; its README and design changes are replaced by DEC-023). README: a section
  "How to publish".
- **Gate:** after the push, the workflow run succeeds and the site's address answers with the page.
  Report the address.
- **Blocked:** The milestone needs a public repository on the `alkashef` account, and only the user can make it.
  - The current remote is `ahmad-alkashef_teradata/zuno`, whose plan has no GitHub Pages for this repository (`docs/design.md`, DEC-023).
  - User decision, 2026-11-18, dialogs: "Move to `alkashef` and use Pages", and "Milestones first, Pages last".
  - Nothing else was changed. To continue, approve one of these:
    1. The repository is on `alkashef` as a public repository with this history, this clone's `origin` points to it, and Pages is set to the source "GitHub Actions": run M43.
    2. Drop M43: delete its row and block, and share `dist/zuno.html` as a file.
