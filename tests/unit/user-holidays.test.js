// @ts-check
/** @module user-holidays.test Unit tests for src/domain/user-holidays.js (HOL-003, HOL-006 to HOL-009, DEC-017). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { toHolidays } from "../../src/domain/holidays.js";
import {
  addHoliday,
  effectiveHolidays,
  emptyUserHolidays,
  hideHoliday,
  isAddedHoliday,
  mergeUserHolidays,
  parseUserHolidays,
  removeHoliday,
  showHoliday,
} from "../../src/domain/user-holidays.js";
import { usRecords2026 } from "./holiday-fixtures.js";

/** @typedef {import("../../src/domain/user-holidays.js").UserHolidays} UserHolidays */

const diwali = Object.freeze({ countryCode: "IN", date: "2026-11-08", name: "Diwali" });
const christmas = Object.freeze({ countryCode: "US", date: "2026-12-25", name: "Christmas Day" });

/**
 * @param {UserHolidays | null} record
 * @returns {UserHolidays} The record, after asserting that the change was accepted.
 */
function accepted(record) {
  assert.notEqual(record, null);
  return /** @type {UserHolidays} */ (record);
}

test("test_hol_003_effective_holidays_are_service_minus_hidden_plus_added", () => {
  const service = toHolidays(usRecords2026());
  const hidden = accepted(hideHoliday(emptyUserHolidays(), christmas));
  const teamDay = { countryCode: "US", date: "2026-11-27", name: "Team Day" };
  const record = accepted(addHoliday(accepted(addHoliday(hidden, teamDay)), diwali));
  assert.deepEqual(effectiveHolidays(service, record, "US"), [
    { date: "2026-04-03", name: "Good Friday", regions: ["US-CT", "US-NC"] },
    { date: "2026-11-27", name: "Team Day", regions: [] },
  ]);
  assert.deepEqual(effectiveHolidays([], record, "IN"), [
    { date: "2026-11-08", name: "Diwali", regions: [] },
  ]);
  assert.deepEqual(effectiveHolidays(service, emptyUserHolidays(), "US"), service);
});

test("test_hol_006_add_refuses_a_bad_date_an_empty_name_and_an_unknown_country", () => {
  const empty = emptyUserHolidays();
  const refused = [
    { ...diwali, date: "2026-02-30" },
    { ...diwali, date: "2026-13-01" },
    { ...diwali, date: "8 Nov 2026" },
    { ...diwali, date: "" },
    { ...diwali, name: "   " },
    { ...diwali, countryCode: "ZZ" },
    { ...diwali, countryCode: "" },
  ];
  for (const entry of refused) {
    assert.equal(addHoliday(empty, entry), null, JSON.stringify(entry));
  }
  const added = accepted(addHoliday(empty, { ...diwali, name: "  Diwali " }));
  assert.deepEqual(added.added, [diwali]);
  assert.deepEqual(empty.added, []);
  assert.equal(addHoliday(added, diwali), null);
});

test("test_hol_007_remove_takes_out_only_that_added_holiday", () => {
  const iqbal = { countryCode: "PK", date: "2026-11-09", name: "Iqbal Day" };
  const record = accepted(addHoliday(accepted(addHoliday(emptyUserHolidays(), diwali)), iqbal));
  assert.equal(isAddedHoliday(record, diwali), true);
  const removed = accepted(removeHoliday(record, diwali));
  assert.deepEqual(removed.added, [iqbal]);
  assert.equal(isAddedHoliday(removed, diwali), false);
  assert.equal(removeHoliday(removed, diwali), null);
});

test("test_hol_008_hide_and_show_a_service_holiday", () => {
  const hidden = accepted(hideHoliday(emptyUserHolidays(), christmas));
  assert.deepEqual(hidden.hidden, [christmas]);
  assert.equal(hideHoliday(hidden, christmas), null);
  assert.equal(hideHoliday(hidden, { ...christmas, date: "2026-12-32" }), null);
  const shown = accepted(showHoliday(hidden, christmas));
  assert.deepEqual(shown.hidden, []);
  assert.equal(showHoliday(shown, christmas), null);
});

test("test_hol_009_parse_accepts_a_valid_record_and_refuses_others", () => {
  const record = { version: 1, added: [diwali], hidden: [christmas] };
  assert.deepEqual(parseUserHolidays(record), record);
  assert.deepEqual(parseUserHolidays(emptyUserHolidays()), emptyUserHolidays());
  const bad = [
    undefined,
    null,
    "text",
    { version: 2, added: [], hidden: [] },
    { version: 1, added: [] },
    { version: 1, added: {}, hidden: [] },
    { version: 1, added: [{ ...diwali, date: "2026-02-30" }], hidden: [] },
    { version: 1, added: [{ ...diwali, name: "" }], hidden: [] },
    { version: 1, added: [{ ...diwali, countryCode: "ZZ" }], hidden: [] },
    { version: 1, added: [{ date: diwali.date, name: diwali.name }], hidden: [] },
    { version: 1, added: [diwali, diwali], hidden: [] },
    { version: 1, added: [], hidden: [null] },
  ];
  for (const value of bad) {
    assert.equal(parseUserHolidays(value), null, JSON.stringify(value));
  }
});

test("test_hol_011_merge_adds_the_imported_entries_and_never_doubles_or_removes_one", () => {
  const teamDay = { countryCode: "US", date: "2026-11-27", name: "Team Day" };
  const saved = accepted(addHoliday(accepted(hideHoliday(emptyUserHolidays(), christmas)), diwali));
  const imported = accepted(addHoliday(accepted(addHoliday(emptyUserHolidays(), diwali)), teamDay));
  assert.deepEqual(mergeUserHolidays(saved, imported), {
    version: 1,
    added: [diwali, teamDay],
    hidden: [christmas],
  });
  assert.deepEqual(mergeUserHolidays(saved, emptyUserHolidays()), saved);
  assert.deepEqual(mergeUserHolidays(saved, saved), saved);
});

test("test_hol_006_an_added_holiday_accepts_any_known_country", () => {
  const jamhuri = { countryCode: "KE", date: "2026-12-12", name: "Jamhuri Day" };
  const added = accepted(addHoliday(emptyUserHolidays(), jamhuri));
  assert.deepEqual(added.added, [jamhuri]);
  assert.deepEqual(parseUserHolidays(added), added);
  assert.ok(hideHoliday(emptyUserHolidays(), { ...jamhuri, countryCode: "PT" }));
});
