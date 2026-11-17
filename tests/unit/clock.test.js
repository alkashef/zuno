// @ts-check
/** @module clock.test Unit tests for src/clock.js (CLK-001, CLK-003, THM-001). */
import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { now, prefersDark } from "../../src/clock.js";

test("test_clk_001_now_reads_the_current_time_in_milliseconds", () => {
  mock.method(Date, "now", () => 1_700_000_000_000);
  try {
    assert.equal(now(), 1_700_000_000_000);
  } finally {
    mock.restoreAll();
  }
});

test("test_thm_001_prefers_dark_reads_the_color_scheme_query", () => {
  const queries = /** @type {string[]} */ ([]);
  /** @type {any} */ (globalThis).matchMedia = (/** @type {string} */ query) => {
    queries.push(query);
    return { matches: true };
  };
  try {
    assert.equal(prefersDark(), true);
    assert.deepEqual(queries, ["(prefers-color-scheme: dark)"]);
  } finally {
    delete (/** @type {any} */ (globalThis).matchMedia);
  }
});
