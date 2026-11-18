# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M44**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M43** Publish to GitHub Pages | Every push to `main` builds the page and publishes it | sonnet | medium | Approved |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

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
