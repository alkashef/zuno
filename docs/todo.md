# To do — Zuno

Every open issue, one line each. Not requirements (those are in `spec.md`) and not milestones
(those are in `plan.md`). Remove a line when it is done.

## Repository and hosting

- Move the repository from the `ahmad-alkashef_teradata` GitHub account to `alkashef`.
- Publish the page to GitHub Pages (the workflow is prepared in a Git stash, where its decision must be renumbered DEC-023; the current account's plan has no Pages for this repository).
- Decide where to host until then: a public repository on a personal account, ask the account's admin, or share the file.
- Rename the local folder `global-timer` to `zuno`.

## Decisions waiting for the user

- The name shown for Hong Kong (today "Hong Kong SAR China").
- Whether the "No holiday data" notice goes once the user adds holidays for that country.
- Whether ticking exactly the country's weekend days should count as the default again.
- Confirm the values that are proposals, not from the spec: picker limit 48 hours, marker step 15 minutes, holiday request timeout 10 seconds.
- Confirm the requirements still marked "Proposed (inference)": PCK-004, REF-002, HOL-002, NFR-001.
- Confirm the scenarios SCN-001 and SCN-002 (marked "partly confirmed").
- CSS class names: the code uses `header-title`, the rules ask for BEM, and Stylelint rejects BEM's `__`.
- Whether to delete the unused logo file `src/assets/zuno-logo.jpg`.
- Fill in Stack, Test command and Run command in `CLAUDE.md` (still "TBD"; an edit needs approval).
- Approve the design as a whole (`design.md` is still "Draft").
- Read the holiday service's terms of service before a public release.

## Code

- Remove the 24-hour fallback in the settings functions (the rule is no defaults in code).
- Make the picker's hover time reachable without a mouse (PCK-008 is pointer-only today).
- A second holiday service for the seven countries with no data (optional; needs approval as a new outside data flow).

## Tests

- Run the new browser tests in all four browsers, not only Chromium.
- Check that a test covers a date where the Umm al-Qura and tabular Hijri variants differ (`spec.md` section 7).

## Docs

- Remove the rows of `design.md` section 5 that are already done (coverage flags, `dist/` ignore, Hijri month names, city table).

## Canvas

- Update the canvas: the Holidays section, the city list in "Add a place", no time-zone field.
- Go through the older comment threads on the canvas that are still open (about four).
