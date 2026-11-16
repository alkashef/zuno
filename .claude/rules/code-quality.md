---
paths:
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - "main.py"
---

## Code smells

Ruff, mypy, and ESLint enforce the limits below (`ruff.toml`, `mypy.ini`, `eslint.config.js`).
Never weaken their configuration, and never add `noqa`, `type: ignore`, or `eslint-disable` to make
a change pass. Fix the code.

Two hooks run `scripts/check.py`. After each edit, ruff or ESLint fixes the file and reports what is
left: fix it before moving on. Before each commit, every check and test runs, and a failure
refuses the commit. Never bypass the hooks (`--no-verify`, `core.hooksPath`). Editing the check configs or
the hook files asks the user first; ask only to change a rule on purpose, never to pass a check.

- Each function, class, and module does one thing. If its name needs two verbs, or describing it
  needs "and", split it. Keep functions near 20 lines (15 statements), 4 parameters, and complexity
  8. When a file passes about 300 lines, check it for a second responsibility and split it only if
  you find one.
- Prefer composition to inheritance. Group values that always travel together into one typed
  object. Inject long-lived collaborators through the constructor, not through every call.
- Do not write: duplicated logic (search for a helper first; extract on the second use); dead code;
  abstractions or design patterns the task does not need; pass-through wrappers or classes too small
  to justify themselves (the single owner of an external system is not one); mutable global state.
- Write code a beginner-to-intermediate programmer can read. Prefer plain constructs to clever ones.

## Naming and code documentation

- Name things for their purpose, not for how they look or are built. Use one term per concept.
- Every module, class, and function has a docstring. Tests are exempt: their names carry the
  requirement ID.
  - Module: what it does, what it does not do (and which module does), and the requirement or
    decision IDs it implements.
  - Class: its single responsibility, stated explicitly, and the state it owns, if any.
  - Public function: a summary, then parameters, return value, and errors raised. A private or
    trivial function gets a one-line summary.
- Comment only where the behavior is not obvious. Do not narrate the code.
- Leave no TODO comments. Report out-of-scope findings under "Assumptions and open questions".

## Error handling

- Catch an exception only at an external boundary (file system, network, database, LLM,
  subprocess), and only to add context (what was being done, on which resource) and re-raise with
  the original error attached. Never catch to recover, fall back, continue, or swallow. Ruff and
  ESLint block bare and blind catches.
- Do not catch unexpected errors. The top level shows the raw error and the full stack trace, logs
  it, and stops. No friendly message, no retry.
- Invalid user input is not an error. Handle it as Input validation says. Error messages name what
  failed and the resource (path, endpoint, ID), never secrets or user content.
- If other users can reach the app, `docs/design.md` records a `DEC-NNN` that shows a short message
  and logs the trace instead.
