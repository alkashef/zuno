# Zuno

## What it does

A timer app that tracks time across time zones.

## Stack

TBD

## File structure

| Path | Holds |
| --- | --- |
| `src/` | All source code. |
| `tests/` | `unit/` and `e2e/` tests. |
| `docs/` | Workflow, spec, design, and plan. |
| `config/` | `.env` (never committed) and `.env.example`. |
| `scripts/` | `check.py` (the checks), `milestones-runner.py`, `cleanup.py`, setup scripts. |
| `.claude/` | Claude Code settings, including the hook that checks each edit. |
| `.githooks/` | `pre-commit`: refuses a commit unless the checks pass. |
| `.vscode/` | Shared editor settings. |

## Setup

TBD

After a fresh clone, turn on the pre-commit hook, which refuses a commit unless the checks pass:

```bash
git config core.hooksPath .githooks
```

## How to run

```bash
TBD
```

## How to test

```bash
TBD
```
