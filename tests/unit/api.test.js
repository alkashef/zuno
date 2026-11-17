// @ts-check
/** @module api.test Unit tests for src/api.js with a fake fetch (HOL-001, HOL-002, REF-002). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { getHolidays } from "../../src/api.js";
import { config } from "../../src/config.js";
import { usRecords2026 } from "./holiday-fixtures.js";

/**
 * @typedef {object} FakeFetch
 * @property {typeof fetch} fetchFn
 * @property {{ url: string, init: RequestInit | undefined }[]} calls
 */

/**
 * @param {() => Promise<Response>} respond What every request returns.
 * @returns {FakeFetch} A fetch that records its calls and never touches the network.
 */
function fakeFetch(respond) {
  /** @type {FakeFetch["calls"]} */
  const calls = [];
  /** @type {typeof fetch} */
  const fetchFn = async (input, init) => {
    calls.push({ url: String(input), init });
    return respond();
  };
  return { fetchFn, calls };
}

/** @param {unknown} body @param {number} [status] */
function jsonResponse(body, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

test("test_hol_001_gets_holidays_for_country_and_year", async () => {
  const records = usRecords2026();
  const { fetchFn, calls } = fakeFetch(() => jsonResponse(records));
  const result = await getHolidays("US", 2026, fetchFn);
  assert.deepEqual(result, { status: "loaded", holidays: records });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${config.holidayServiceBaseUrl}/Holidays/US/2026`);
});

test("test_hol_002_request_has_only_country_code_and_year", async () => {
  const { fetchFn, calls } = fakeFetch(() => jsonResponse([]));
  await getHolidays("BR", 2027, fetchFn);
  const init = calls[0].init ?? {};
  assert.deepEqual(Object.keys(init).sort(), ["credentials", "signal"]);
  assert.equal(init.credentials, "omit");
  assert.equal(calls[0].url, `${config.holidayServiceBaseUrl}/Holidays/BR/2027`);
});

test("test_ref_002_network_failure_returns_unavailable_with_reason", async () => {
  const { fetchFn } = fakeFetch(() => Promise.reject(new TypeError("Failed to fetch")));
  const result = await getHolidays("US", 2026, fetchFn);
  assert.equal(result.status, "unavailable");
  assert.match(String(result.status === "unavailable" && result.reason), /Failed to fetch/);
});

test("test_ref_002_timeout_returns_unavailable", async () => {
  const timeout = new DOMException("The operation timed out", "TimeoutError");
  const { fetchFn } = fakeFetch(() => Promise.reject(timeout));
  const result = await getHolidays("US", 2026, fetchFn);
  assert.equal(result.status, "unavailable");
});

test("test_ref_002_non_success_status_returns_unavailable", async () => {
  const { fetchFn } = fakeFetch(() => jsonResponse({}, 503));
  const result = await getHolidays("US", 2026, fetchFn);
  assert.equal(result.status, "unavailable");
  assert.match(String(result.status === "unavailable" && result.reason), /503/);
});

test("test_ref_002_wrong_shape_returns_unavailable", async () => {
  const { fetchFn } = fakeFetch(() => jsonResponse([{ date: "2026-12-25" }]));
  const result = await getHolidays("US", 2026, fetchFn);
  assert.equal(result.status, "unavailable");
});

test("test_ref_002_body_that_is_not_json_returns_unavailable", async () => {
  const { fetchFn } = fakeFetch(() => Promise.resolve(new Response("<html>", { status: 200 })));
  const result = await getHolidays("US", 2026, fetchFn);
  assert.equal(result.status, "unavailable");
});

test("test_dec_006_bad_argument_throws", async () => {
  const { fetchFn, calls } = fakeFetch(() => jsonResponse([]));
  await assert.rejects(getHolidays("usa", 2026, fetchFn), /country code/);
  await assert.rejects(getHolidays("US", 26, fetchFn), /year/);
  assert.equal(calls.length, 0);
});
