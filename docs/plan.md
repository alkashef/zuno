# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M20**

## Milestones at a glance

| Milestone | Description | Model | Effort | Status |
| --- | --- | --- | --- | --- |
| **M1** Build the one-file page | `scripts/build.mjs` (esbuild) bundles `src/` into `dist/zuno.html` with the CSP tag. | sonnet | high | approved |
| **M2** Holiday service and facts | `api.js` returns `HolidayResult`; `domain/holidays.js` keeps `Public` holidays and handles regions and missing data. | sonnet | high | open |
| **M3** Time zones and formats | Local date and time with DST; dd-mmm-yy and 12-hour formats; the import-rule test. | sonnet | high | open |
| **M4** Country table | `data/countries.js` and `domain/countries.js`: capital default and other zones. | sonnet | medium | open |
| **M5** Places, settings, storage | Place and settings logic with validation; `storage.js`. | sonnet | medium | open |
| **M6** Weekends and Hijri | `weekends.js`, `hijri.js` (variants, ±1 adjustment) and the Hijri date format. | sonnet | high | open |
| **M7** Month-grid model | `domain/calendar.js`: weekend, holiday, split cell, today, Hijri day. | sonnet | high | open |
| **M8** Picker model | `domain/picker.js`: reference window (23 or 25 hours on DST days), segments, day-off colour, marker moves. | opus | high | open |
| **M9** Controller: page workflows | `controller.js` with fakes: open, tick, refresh, marker, month, notices, selected holiday. | opus | high | open |
| **M10** Controller: settings workflows | Add, remove, move and edit places; hours; display switches; save and restore. | sonnet | high | open |
| **M11** Page shell, theme, empty page | `main.js` wiring, `index.html`, theme tokens, header, Refresh, empty page; installs Playwright (Chromium first). | sonnet | high | open |
| **M12** Settings panel: places | Add, remove, reorder and edit places in the panel; saved and restored. | sonnet | medium | open |
| **M13** Settings panel: hours and display | Working hours, country names, Hijri switch, region, Hijri variant and adjustment. | sonnet | medium | open |
| **M14** Picker view | Day selector, hour axis, rows, draggable marker, scroll. | sonnet | high | open |
| **M15** Month-grid view | Grid, month buttons, weekend, holiday, split and today cells, holiday card, scroll. | sonnet | medium | open |
| **M16** Hijri in the views | Hijri band, cell days, picker dates, information button. | sonnet | medium | open |
| **M17** World map | SVG map with pins, names, times and dates, updated by the tick. | sonnet | medium | open |
| **M18** Legend and notices | Bottom legend; notices card with a count badge for missing holiday data. | sonnet | medium | open |
| **M19** Cross-browser and NFR checks | Playwright in four browsers: request check, English text, contrast, EX-002, EX-010; README; coverage floor. | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated.

### M1 — Build the one-file page

- **Refs:** PKG-001, NFR-001 (CSP part), DEC-002, DEC-012, DEC-013.
- **Owner:** `scripts/build.mjs`, `src/config.js`, `src/index.html`, `src/main.js`.
- **Tests first:** `test_pkg_001_built_file_has_no_external_src_href_or_import`,
  `test_nfr_001_csp_allows_only_holiday_host_and_inline_hashes`.
- **Build:** install esbuild pinned (dev-only; record version and licence check in `design.md`
  section 5). Add `build.mjs` to bundle modules and CSS and write `dist/zuno.html` with one `<style>`,
  one `<script>` and the CSP `<meta>` with hashes. Add `config.js` with `holidayServiceBaseUrl` (the
  CSP reads its host). Add a minimal `index.html` and `main.js`. Add `dist/` to `.gitignore`, ESLint
  and Prettier ignores, and an `npm run build` script. Update the README build line.
- **Gate:** `npm run build` writes `dist/zuno.html`; `dist/` is not tracked. If the ESLint or
  Prettier config edits need approval, block with that exact question.
- **Blocked:** The milestone must install esbuild and edit `package.json` and `eslint.config.js`, and `.claude/settings.json` makes each of these ask the user, who cannot answer in an unattended run.
  - `npm install --save-dev --save-exact esbuild@0.28.2` was refused: `.claude/settings.json` lists `Bash(npm install *)` under `ask`; CLAUDE.md "Dependencies" says to ask before adding any dependency. The plan block and DEC-002 name esbuild, but no **Approval** entry permits the install. Checked at npm: esbuild 0.28.2, licence MIT, one install script (`postinstall: node install.js`).
  - The build also needs edits to `package.json` (the `build` script, the `esbuild` dev dependency) and `eslint.config.js` (ignore `dist/`; Node globals for `scripts/*.mjs`, which ESLint lints with browser-less defaults). Both are under `ask` in `.claude/settings.json`; this is the question the Gate names.
  - Nothing else was changed; the failing tests were written, seen to fail, and removed again so that only this plan edit is committed.
  - To continue, approve one of these:
    1. Permit exactly: install `esbuild@0.28.2` as a dev dependency (with its install script); add the `build` script to `package.json`; in `eslint.config.js` add `dist/**` to `ignores` and a block giving `scripts/**/*.mjs` the Node globals. (Prettier needs no edit: `format:check` checks only `src/` and `tests/`.)
    2. Run `npm install --save-dev --save-exact esbuild@0.28.2` yourself and commit it, then approve only the `package.json` script and `eslint.config.js` edits.
- **Approval:** Option 1. Install `esbuild@0.28.2` as a dev dependency (with its install script); add the `build` script to `package.json`; in `eslint.config.js` add `dist/**` to `ignores` and a block giving `scripts/**/*.mjs` the Node globals. Nothing more.

### M2 — Holiday service and facts

- **Refs:** HOL-001, HOL-002, HOL-003, HOL-004, SET-006, REF-002, EX-004, DEC-005, DEC-006.
- **Owner:** `src/api.js`, `src/log.js`, `src/config.js`, `src/domain/holidays.js`.
- **Tests first:** `test_hol_001_gets_holidays_for_country_and_year`,
  `test_hol_002_request_has_only_country_code_and_year`,
  `test_hol_003_only_public_type_kept_and_region_added_when_chosen`,
  `test_hol_004_missing_regional_data_reports_place_and_shows_national`,
  `test_set_006_no_region_uses_national_holidays_only`,
  `test_ref_002_network_failure_returns_unavailable_with_reason`,
  `test_ex_004_us_christmas_2026_is_public_holiday`.
- **Build:** add `log.js`, and `config.js` settings `holidayRequestTimeoutMs` and `logLevel`
  (`design.md` section 2.3). `api.getHolidays(countryCode, year, fetchFn?)` returns `loaded` or
  `unavailable` (DEC-006) for a network failure, a non-success status, a timeout or a wrong shape.
  `domain/holidays.js` makes `Holiday` records, per-day facts for a place, region lists, and the
  lists of countries and places with missing data. Check the live response shape once with one
  country and year (no user data) and record the result in `design.md` section 5.
- **Gate:** the tests use a fake `fetch`; no test calls a live server. Spec section 7 holiday-service
  item is updated.

### M3 — Time zones and formats

- **Refs:** CLK-001 (domain part), CLK-002, DSP-001, DSP-002, EX-001, EX-005, EX-006, DEC-001,
  DEC-007.
- **Owner:** `src/domain/zones.js`, `src/domain/format.js`, `src/clock.js`.
- **Tests first:** `test_clk_001_local_date_and_time_for_zone`,
  `test_clk_002_london_dst_offsets_ex_001`, `test_dsp_001_date_is_dd_mmm_yy_ex_005`,
  `test_dsp_002_time_is_12_hour_uppercase_ex_006`,
  `test_import_rules_domain_imports_only_domain_and_data`.
- **Build:** `zones.js` gives the local date and time of an instant in a zone through `Intl`, for any
  date. `format.js` formats dates and times as the spec says. `clock.js` is the only reader of the
  current time and the colour-scheme query. Add the unit test that walks the imports and fails on a
  broken rule of `design.md` section 2.1.
- **Gate:** tests cover DST change days in at least two zones.

### M4 — Country table

- **Refs:** SET-002, SET-003, NFR-003 (country names), DEC-004.
- **Owner:** `data/countries.js`, `src/domain/countries.js`.
- **Tests first:** `test_set_002_adding_country_uses_capital_zone`,
  `test_set_003_multi_zone_country_lists_other_city_zones`,
  `test_dec_004_every_zone_valid_and_every_country_has_capital`.
- **Build:** one row per country from IANA `zone.tab` with the capital zone chosen; English country
  names from `Intl.DisplayNames`.
- **Gate:** the report lists any country whose capital zone was a judgement call, for the user's
  review (`design.md` section 5).

### M5 — Places, settings, storage

- **Refs:** SET-001, SET-004, SET-005, SET-007 (data), SET-008, SET-009, SET-010, SET-011, DEC-008.
- **Owner:** `src/domain/places.js`, `src/domain/settings.js`, `src/storage.js`, `src/config.js`.
- **Tests first:** `test_set_001_add_and_remove_places`, `test_set_004_settings_round_trip_in_storage`,
  `test_set_004_invalid_record_loads_as_null_and_logs_warning`,
  `test_set_005_default_hours_9am_to_5pm_and_start_before_end`,
  `test_set_007_no_saved_places_means_empty_state`, `test_set_008_move_place_changes_order`,
  `test_set_009_display_name_overrides_city_name`, `test_set_010_country_names_off_by_default`,
  `test_set_011_hijri_off_by_default`.
- **Build:** `Place` and `Settings` types, defaults and validation as in `design.md` section 3;
  `storage.js` reads and writes one versioned `localStorage` record under `storageKey`. Add
  `storageKey`, `defaultWorkStartMinutes` and `defaultWorkEndMinutes` to `config.js`.
- **Gate:** the storage tests use a fake store.

### M6 — Weekends and Hijri

- **Refs:** CAL-002, HIJ-001 (data), HIJ-002, HIJ-003, DSP-003, SET-011, EX-002, EX-010, DEC-003.
- **Owner:** `src/domain/weekends.js`, `src/domain/hijri.js`, `src/domain/format.js`.
- **Tests first:** `test_cal_002_saudi_weekend_is_friday_and_saturday_ex_002`,
  `test_hij_001_hijri_date_of_local_date`,
  `test_hij_002_umalqura_and_tabular_differ_on_a_chosen_date`,
  `test_hij_003_adjustment_minus_one_to_plus_one_ex_010`,
  `test_dsp_003_hijri_date_format_dd_month_yyyy`.
- **Build:** weekend days from `Intl.Locale.getWeekInfo()`; Hijri date from `Intl.DateTimeFormat`
  with `islamic-umalqura` and `islamic-civil`, adjusted by -1, 0 or +1 days before conversion.
  Choose and record a date where the variants differ (spec section 7).
- **Gate:** the differing-variant example is added to spec section 6 only with the user's approval;
  until then it lives in the test.

### M7 — Month-grid model

- **Refs:** CAL-001, CAL-002, CAL-003, CAL-004, CAL-007, HIJ-001 (data), EX-002, EX-004, EX-007.
- **Owner:** `src/domain/calendar.js`.
- **Tests first:** `test_cal_001_one_row_per_place_one_cell_per_day`,
  `test_cal_002_weekend_cells_by_country`, `test_cal_003_holiday_cell_has_holiday_kind`,
  `test_cal_004_today_uses_place_local_date`, `test_cal_007_holiday_on_weekend_is_split_ex_007`.
- **Build:** `buildMonth(settings, year, month, holidays, nowInstant)` returns `DayFacts[][]` using
  `zones`, `weekends`, `holidays` and `hijri`.
- **Gate:** none beyond the common gate.

### M8 — Picker model

- **Refs:** PCK-001, PCK-002, PCK-003, PCK-005, PCK-006, PCK-007, SET-005, EX-003, EX-008, EX-009,
  DEC-009 (day kinds).
- **Owner:** `src/domain/picker.js`.
- **Tests first:** `test_pck_001_one_row_per_place`, `test_pck_002_local_time_at_marker_ex_003`,
  `test_pck_003_working_and_non_working_segments_ex_008`,
  `test_pck_005_weekend_or_holiday_is_day_off_ex_009`,
  `test_pck_006_window_midnight_to_midnight_of_first_place_23_and_25_hour_days`,
  `test_pck_007_shift_day_keeps_time_of_day_in_first_place`.
- **Build:** `buildPicker(settings, marker, holidays)` gives the window, one row per place with
  segments that cover it exactly, and each local date and time. Add the marker-day shift logic.
  Day kinds `working`, `nonWorking`, `dayOff` are a frozen object in this module.
- **Gate:** tests cover a window that crosses midnight for another place and a DST change day.

### M9 — Controller: page workflows

- **Refs:** PCK-004, PCK-007, CAL-005, CAL-006 (state), CLK-003, REF-001, REF-002, HOL-001,
  HOL-004, SET-007, DEC-007.
- **Owner:** `src/controller.js`.
- **Tests first:** `test_pck_004_open_puts_marker_at_now`,
  `test_set_007_open_with_no_places_shows_empty_state`, `test_hol_001_open_requests_each_country_year_once`,
  `test_clk_003_tick_updates_time_but_not_marker`, `test_ref_001_refresh_clears_and_refetches_holidays`,
  `test_ref_002_failed_country_listed_and_times_still_shown`,
  `test_hol_004_missing_region_listed_in_notices`, `test_pck_007_shift_day_and_pick_day`,
  `test_cal_005_show_previous_and_next_month`, `test_cal_006_select_and_close_holiday_cell`.
- **Build:** `createController({ api, storage, clock })` returns `{ getState, dispatch, subscribe }`
  with the actions `open`, `refresh`, `tick`, `setMarker`, `shiftMarkerDay`, `showMonth`,
  `selectHoliday`, `toggleNotices`, `openSettings`, `closeSettings`. Tests in `tests/e2e/` use
  fakes for `api`, `storage` and `clock`.
- **Gate:** the controller imports `domain/*` only.

### M10 — Controller: settings workflows

- **Refs:** SET-001 to SET-011, HIJ-002, HIJ-003, DEC-008.
- **Owner:** `src/controller.js`.
- **Tests first:** `test_set_001_add_and_remove_place_workflow`,
  `test_set_002_add_country_sets_capital_zone`, `test_set_003_choose_other_city_zone`,
  `test_set_004_change_is_saved_and_restored_on_next_open`, `test_set_005_set_working_hours`,
  `test_set_006_choose_region`, `test_set_008_move_place_reorders_picker_and_grid`,
  `test_set_009_set_display_name`, `test_set_010_turn_on_country_names`,
  `test_set_011_turn_on_hijri`, `test_hij_002_choose_variant_per_place`,
  `test_hij_003_adjust_hijri_per_place`.
- **Build:** add the actions `addPlace`, `removePlace`, `movePlace`, `editPlace`,
  `setWorkingHours`, `setShowCountry`, `setShowHijri`. Validate through `domain/settings.js`, save
  through `storage`, request holidays for a new country. A removed place keeps data another place
  still uses.
- **Gate:** none beyond the common gate.

### M11 — Page shell, theme, empty page

- **Refs:** THM-001, SET-007, REF-001, DEC-007, DEC-009, DEC-011.
- **Owner:** `src/main.js`, `src/index.html`, `src/theme.css`, `src/base.css`, `src/layout.css`,
  `src/views/header.js`, `src/views/empty.js`.
- **Tests first:** `ui_thm_001_follows_light_and_dark_color_scheme`,
  `ui_set_007_empty_page_prompts_to_add_a_place`, `ui_ref_001_refresh_button_refetches_holidays`.
- **Build:** install Playwright pinned (dev-only; record version and licence check in `design.md`
  section 5) and run these tests against `dist/zuno.html` in Chromium, with the holiday service
  faked by request routing. `main.js` creates the state, controller and views and starts the clock
  tick; it holds no logic. `theme.css` has the tokens of DEC-009. Add the header (logo, title,
  "Updated" time, Refresh, Settings) and the empty page. The logo is `src/assets/zuno-logo.jpg`
  (already shrunk), inlined by `build.mjs` as a data URI, so the file stays one file. Add the browsers to the README setup.
- **Gate:** the page opens as a file. The title stays "Global Timer" until the user locks the UI.

### M12 — Settings panel: places

- **Refs:** SET-001, SET-002, SET-003, SET-004, SET-008, SET-009.
- **Owner:** `src/views/settings.js`, `src/settings.css`.
- **Tests first:** `ui_set_001_add_and_remove_a_place`, `ui_set_002_new_place_shows_capital_time`,
  `ui_set_003_choose_another_city_zone`, `ui_set_004_places_survive_reload`,
  `ui_set_008_move_arrows_reorder_places`, `ui_set_009_display_name_shown_instead_of_city`.
- **Build:** the settings panel with the place list, add by country, expand to edit, reorder with
  arrows, remove. Every control is a real element; icon-only buttons have an `aria-label`; Escape
  closes the panel and focus returns to its button.
- **Gate:** none beyond the common gate.

### M13 — Settings panel: hours and display

- **Refs:** SET-005, SET-006, SET-010, SET-011, HIJ-002, HIJ-003.
- **Owner:** `src/views/settings.js`.
- **Tests first:** `ui_set_005_working_hours_default_and_invalid_end_refused`,
  `ui_set_006_region_listed_by_code_and_empty_means_national`,
  `ui_set_010_country_names_toggle`, `ui_set_011_hijri_toggle_off_by_default`,
  `ui_hij_002_variant_choice_per_place`, `ui_hij_003_adjustment_range_minus_one_to_plus_one`.
- **Build:** working-hours inputs, the Display section (country names, Hijri), and per-place region,
  Hijri variant and Hijri adjustment (shown only while Hijri is on).
- **Gate:** none beyond the common gate.

### M14 — Picker view

- **Refs:** PCK-001 to PCK-007, LAY-001, DSP-001, DSP-002, EX-003.
- **Owner:** `src/views/picker.js`, `src/views/day-selector.js`, `src/picker.css`.
- **Tests first:** `ui_pck_001_one_row_per_place`, `ui_pck_002_moving_marker_updates_row_times_ex_003`,
  `ui_pck_003_row_colours_working_and_non_working`, `ui_pck_004_marker_starts_at_now`,
  `ui_pck_005_day_off_colour`, `ui_pck_006_first_place_is_reference`,
  `ui_pck_007_previous_next_and_calendar_day_keep_time`,
  `ui_lay_001_picker_rows_scroll_axis_stays_in_view`.
- **Build:** the day selector (previous, date button with month calendar, next), the hour axis, one
  row per place with the reference background on the first, the marker moved by drag or arrow keys.
- **Gate:** none beyond the common gate.

### M15 — Month-grid view

- **Refs:** CAL-001 to CAL-007, LAY-001, EX-007.
- **Owner:** `src/views/month-grid.js`, `src/month-grid.css`.
- **Tests first:** `ui_cal_001_grid_has_row_per_place_and_cell_per_day`,
  `ui_cal_002_weekend_cells_marked`, `ui_cal_003_holiday_cells_use_other_colour`,
  `ui_cal_004_today_column_highlighted`, `ui_cal_005_previous_and_next_month_buttons`,
  `ui_cal_006_holiday_card_opens_and_closes`, `ui_cal_007_weekend_holiday_cell_is_split`,
  `ui_lay_001_grid_rows_scroll_headers_stay_in_view`.
- **Build:** the month grid with month buttons, cell kinds and the holiday card beside the place
  name. Colours come only from `theme.css`.
- **Gate:** none beyond the common gate.

### M16 — Hijri in the views

- **Refs:** HIJ-001, HIJ-004, DSP-003, SET-011, EX-010.
- **Owner:** `src/views/month-grid.js`, `src/views/picker.js`, `src/views/hijri-note.js`.
- **Tests first:** `ui_hij_001_hijri_band_cell_days_and_picker_dates_only_when_on_ex_010`,
  `ui_hij_004_info_button_shows_calculated_date_note`, `ui_dsp_003_hijri_format_in_picker_and_card`.
- **Build:** the Hijri month band, the two-digit Hijri day in each cell, each place's Hijri date
  beside the marker date, and the information button with its card (closes on Escape, focus
  returns).
- **Gate:** none beyond the common gate.

### M17 — World map

- **Refs:** MAP-001, CLK-001, CLK-003, DEC-010.
- **Owner:** `src/views/map.js`, `src/map.css`, the map SVG in `src/index.html`.
- **Tests first:** `ui_map_001_pin_per_place_with_name_time_and_date`,
  `ui_clk_001_pin_shows_current_local_time_and_date`, `ui_clk_003_pin_time_updates_each_tick`.
- **Build:** a static SVG of simplified outlines; each pin is placed by CSS custom properties from
  the country table coordinates; the label follows the display name and country-name settings.
- **Gate:** the tick test uses a fake clock, no real wait.

### M18 — Legend and notices

- **Refs:** LEG-001, REF-002, HOL-004.
- **Owner:** `src/views/legend.js`, `src/views/notices.js`.
- **Tests first:** `ui_leg_001_legend_names_every_colour`,
  `ui_ref_002_failed_service_lists_countries_with_no_data_and_keeps_times`,
  `ui_hol_004_missing_region_listed_with_national_shown`.
- **Build:** the full-width legend banner fixed at the bottom; the notices card behind the header
  button with a count badge; Escape closes it.
- **Gate:** none beyond the common gate.

### M19 — Cross-browser and NFR checks

- **Refs:** NFR-001, NFR-002, NFR-003, EX-002, EX-010, DEC-009 (contrast), DEC-011, DEC-013.
- **Owner:** `tests/e2e/ui/`, `playwright.config.*`, `README.md`.
- **Tests first:** `ui_nfr_001_only_holiday_service_requests`,
  `ui_nfr_002_core_workflows_in_chromium_firefox_webkit_edge`,
  `ui_nfr_003_all_visible_text_is_english`, `ui_dec_009_text_contrast_at_least_4_5_to_1`,
  `ui_ex_002_saudi_weekend_in_four_browsers`, `ui_ex_010_hijri_names_in_four_browsers`.
- **Build:** add the Firefox, WebKit and Edge (`msedge` channel) projects; add the coverage flags
  for `node --test` and enforce the 80% floor; complete the README (What it does, Stack, File
  structure, Setup, How to run, How to test, GitHub Pages note).
- **Gate:** all four browsers pass; coverage on `src/` is at least 80%. Update the CLAUDE.md stack
  and command lines only with the user's approval.
