# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M20**

## Milestones at a glance

| Milestone | Description | Model | Effort | Status |
| --- | --- | --- | --- | --- |
| **M17** World map | SVG map with pins, names, times and dates, updated by the tick. | sonnet | medium | open |
| **M18** Legend and notices | Bottom legend; notices card with a count badge for missing holiday data. | sonnet | medium | open |
| **M19** Cross-browser and NFR checks | Playwright in four browsers: request check, English text, contrast, EX-002, EX-010; README; coverage floor. | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated.

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
