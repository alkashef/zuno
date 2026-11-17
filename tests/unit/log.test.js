// @ts-check
/** @module log.test Unit tests for src/log.js with a fake console. */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createLog } from "../../src/log.js";

/** @returns {{ sink: Pick<Console, "debug" | "info" | "warn" | "error">, lines: string[] }} */
function fakeConsole() {
  /** @type {string[]} */
  const lines = [];
  /** @param {string} level */
  const record = (level) => (/** @type {string} */ message) => lines.push(`${level}:${message}`);
  const sink = {
    debug: record("debug"),
    info: record("info"),
    warn: record("warn"),
    error: record("error"),
  };
  return { sink, lines };
}

test("test_log_prints_messages_at_or_above_the_level", () => {
  const { sink, lines } = fakeConsole();
  const log = createLog("warn", sink);
  log.debug("a");
  log.info("b");
  log.warn("c");
  log.error("d");
  assert.deepEqual(lines, ["warn:c", "error:d"]);
});

test("test_log_debug_level_prints_everything", () => {
  const { sink, lines } = fakeConsole();
  const log = createLog("debug", sink);
  log.debug("a");
  log.error("b");
  assert.deepEqual(lines, ["debug:a", "error:b"]);
});
