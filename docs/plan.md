# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M44**

## Milestones at a glance

| Milestone                                             | Description                                                                                                          | Model  | Effort | Status   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ------ | -------- |
| **M40** Version in the settings panel                 | The settings footer shows "Version" and the build's date and time in UTC                                             | sonnet | medium | open     |
| **M41** No 24-hour fallback in the settings reader    | `parseSettings` needs its limits; no default in code                                                                 | sonnet | low    | open     |
| **M42** Newer workflows in four browsers              | The workflows added since M21 also run in Firefox, WebKit and Edge                                                   | sonnet | medium | open     |
| **M43** Publish to GitHub Pages                       | Every push to `main` builds the page and publishes it                                                                | sonnet | medium | blocked  |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

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
