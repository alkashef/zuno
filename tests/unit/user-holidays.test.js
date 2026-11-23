// @ts-check
/** @module user-holidays.test Unit tests for src/domain/user-holidays.js (HOL-003, HOL-006 to HOL-009, HOL-020, HOL-022, HOL-023, DEC-017, DEC-035). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { toHolidays } from "../../src/domain/holidays.js";
import {
  addHoliday,
  countFrom,
  effectiveHolidays,
  emptyUserHolidays,
  hideHoliday,
  importsOf,
  isAddedHoliday,
  mergeUserHolidays,
  nextImportId,
  parseUserHolidays,
  removeHoliday,
  showHoliday,
  withoutImport,
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

const importOne = Object.freeze({ id: "import-1", fileName: "a.csv", importedAt: 1_000 });
const importTwo = Object.freeze({ id: "import-2", fileName: "b.csv", importedAt: 2_000 });
const teamDay = Object.freeze({ countryCode: "US", date: "2026-11-27", name: "Team Day" });

test("test_hol_023_a_record_saved_before_has_no_imports_and_no_sources", () => {
  const saved = { version: 1, added: [diwali], hidden: [christmas] };
  const parsed = parseUserHolidays(saved);
  assert.deepEqual(parsed, saved);
  assert.deepEqual(importsOf(/** @type {UserHolidays} */ (parsed)), []);
  assert.equal("sources" in /** @type {UserHolidays} */ (parsed).added[0], false);
  assert.deepEqual(importsOf(emptyUserHolidays()), []);
});

test("test_hol_023_parse_keeps_imports_and_sources_and_drops_a_source_without_its_import", () => {
  const record = {
    version: 1,
    imports: [importOne],
    added: [
      { ...diwali, sources: ["import-1"] },
      { ...teamDay, sources: ["import-7"] },
    ],
    hidden: [{ ...christmas, sources: [] }],
  };
  assert.deepEqual(parseUserHolidays(record), {
    version: 1,
    imports: [importOne],
    added: [{ ...diwali, sources: ["import-1"] }, teamDay],
    hidden: [christmas],
  });
  const bad = [
    { ...record, imports: "x" },
    { ...record, imports: [{ id: "", fileName: "a.csv", importedAt: 1 }] },
    { ...record, imports: [{ id: "import-1", fileName: 3, importedAt: 1 }] },
    { ...record, imports: [{ id: "import-1", fileName: "a.csv", importedAt: "now" }] },
    { ...record, imports: [importOne, importOne] },
  ];
  for (const value of bad) {
    assert.equal(parseUserHolidays(value), null, JSON.stringify(value));
  }
});

test("test_hol_020_merge_tags_new_entries_shares_imported_ones_and_leaves_typed_ones", () => {
  const typed = accepted(addHoliday(emptyUserHolidays(), diwali));
  const first = mergeUserHolidays(typed, { added: [diwali, teamDay], hidden: [] }, importOne);
  assert.deepEqual(first, {
    version: 1,
    imports: [importOne],
    added: [diwali, { ...teamDay, sources: ["import-1"] }],
    hidden: [],
  });
  const second = mergeUserHolidays(first, { added: [teamDay], hidden: [christmas] }, importTwo);
  assert.deepEqual(second.added[1].sources, ["import-1", "import-2"]);
  assert.deepEqual(second.hidden, [{ ...christmas, sources: ["import-2"] }]);
  assert.deepEqual(importsOf(second), [importOne, importTwo]);
  assert.deepEqual(second.added[0], diwali);
});

test("test_hol_020_the_counts_of_an_import_follow_the_entries_that_remain", () => {
  const merged = mergeUserHolidays(
    emptyUserHolidays(),
    { added: [diwali, teamDay], hidden: [] },
    importOne,
  );
  assert.equal(countFrom(merged.added, "import-1"), 2);
  const fewer = accepted(removeHoliday(merged, teamDay));
  assert.equal(countFrom(fewer.added, "import-1"), 1);
  assert.equal(countFrom(fewer.added, "import-2"), 0);
});

test("test_hol_022_without_import_removes_its_record_and_the_entries_only_it_listed", () => {
  const typed = accepted(addHoliday(emptyUserHolidays(), christmas));
  const one = mergeUserHolidays(typed, { added: [diwali, teamDay], hidden: [] }, importOne);
  const both = mergeUserHolidays(one, { added: [diwali], hidden: [] }, importTwo);
  const afterOne = withoutImport(both, "import-1");
  assert.deepEqual(afterOne, {
    version: 1,
    imports: [importTwo],
    added: [christmas, { ...diwali, sources: ["import-2"] }],
    hidden: [],
  });
  const afterBoth = withoutImport(afterOne, "import-2");
  assert.deepEqual(afterBoth, { version: 1, imports: [], added: [christmas], hidden: [] });
  assert.deepEqual(withoutImport(afterBoth, "import-9"), afterBoth);
});

test("test_hol_022_next_import_id_is_free_after_a_deletion", () => {
  assert.equal(nextImportId(emptyUserHolidays()), "import-1");
  const record = { ...emptyUserHolidays(), imports: [importTwo] };
  assert.equal(nextImportId(record), "import-3");
});
