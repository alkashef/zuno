# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M46**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |
| **M45** Share and download | README "Open Zuno" and "Download" links and install steps; the workflow attaches zuno.html to the release `latest`; repository description and website | sonnet | medium | open |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

### M45 — Share and download

- **Refs:** PKG-001, DEC-023 (changes of 2026-11-19).
- **Owner:** `.github/workflows/pages.yml`, `README.md`.
- **Tests first:** `test_pkg_001_pages_workflow_attaches_the_file_to_the_latest_release`.
- **Build:** `contents: write` and a release step after the deployment; a "Use Zuno" section at the top of the README; the repository's description and website set with `gh repo edit`.
- **Gate:** the workflow run after the push succeeds and the download address answers with the file.
