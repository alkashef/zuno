# Plan — Zuno

Only unfinished milestones. Delete a milestone's row and block in the commit that finishes it; git
history is the record. Template: `docs/workflow.md`.

**Next milestone number: M61**

## Milestones at a glance

| Milestone                       | Description                                           | Model  | Effort | Status   |
| ------------------------------- | ----------------------------------------------------- | ------ | ------ | -------- |

## Milestones

Every Gate below also requires: `npm test`, `npm run typecheck`, `npm run lint`,
`npm run lint:css` and `npm run format:check` pass, and docs the change made inaccurate are updated
(`docs/design.md` rows of the modules changed, `README.md`).

## Human checks

For the user, after the run. A session cannot do them.

- ICN-001, DEC-038: open `dist/zuno.html` in Chrome, Edge, Firefox and Safari and look at the tab.
  Playwright cannot see the tab, and an older Safari may show no icon.
- PIN-001, PIN-002, DEC-039: look at the pins in the picker and in the settings, light and dark.
- PCK-012, PCK-013, DEC-037: leave the page open for a few minutes, then drag the marker, wait a
  minute, and press Now; look at the Now button's muted and normal look.
- The "Zuno UI" canvas does not show the Now button, the pins or the tab icon (design, DEC-037 to
  DEC-039): update it if you keep it as the visual reference.
