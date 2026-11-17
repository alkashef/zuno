# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M20**

## Milestones at a glance

| Milestone | Description | Model | Effort | Status |
| --- | --- | --- | --- | --- |
| **M19** Cross-browser and NFR checks | Playwright in four browsers: request check, English text, contrast, EX-002, EX-010; README; coverage floor. | sonnet | high | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated.

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
