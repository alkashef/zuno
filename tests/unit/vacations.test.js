// @ts-check
/** @module vacations.test Unit tests for src/domain/vacations.js (VAC-002, VAC-003, VAC-004, VAC-006, EX-029, DEC-030). */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addVacation,
  changeVacation,
  checkVacation,
  parseVacations,
  removeVacation,
  vacationsOn,
} from "../../src/domain/vacations.js";

const winter = { start: "2026-12-21", end: "2026-12-31", label: "Winter break" };
const trip = { start: "2026-12-28", end: "2027-01-03", label: "Trip" };

test("test_vac_002_adding_a_copy_of_a_saved_vacation_changes_nothing_and_overlap_is_allowed", () => {
  const added = addVacation([], { ...winter, label: "  Winter break  " });
  assert.deepEqual(added, [winter]);
  assert.equal(addVacation([winter], { ...winter }), null);
  const overlapping = addVacation([winter], trip);
  assert.deepEqual(overlapping, [winter, trip]);
  assert.deepEqual(addVacation([winter], { ...winter, label: "" }), [
    winter,
    { ...winter, label: "" },
  ]);
});

test("test_vac_002_change_replaces_in_place_and_refuses_a_copy_of_another_vacation", () => {
  const changed = changeVacation([winter, trip], winter, { ...winter, end: "2026-12-30" });
  assert.deepEqual(changed, [{ ...winter, end: "2026-12-30" }, trip]);
  assert.equal(changeVacation([winter, trip], winter, { ...trip }), null);
  assert.equal(changeVacation([trip], winter, winter), null);
  assert.equal(changeVacation([winter], winter, { ...winter, end: "2026-12-01" }), null);
  assert.deepEqual(changeVacation([winter], winter, winter), [winter]);
});

test("test_vac_002_remove_deletes_the_whole_vacation_and_keeps_the_others", () => {
  assert.deepEqual(removeVacation([winter, trip], winter), [trip]);
  assert.deepEqual(removeVacation([trip], winter), [trip]);
});

test("test_vac_003_a_vacation_that_ends_before_it_starts_is_refused", () => {
  assert.equal(addVacation([], { start: "2026-12-31", end: "2026-12-21", label: "" }), null);
  assert.deepEqual(addVacation([], { start: "2026-12-21", end: "2026-12-21", label: "" }), [
    { start: "2026-12-21", end: "2026-12-21", label: "" },
  ]);
});

test("test_vac_003_check_vacation_names_what_is_missing", () => {
  assert.equal(checkVacation(winter), "ok");
  assert.equal(checkVacation({ ...winter, start: "" }), "start-missing");
  assert.equal(checkVacation({ ...winter, start: "2026-02-30" }), "start-missing");
  assert.equal(checkVacation({ ...winter, end: "" }), "end-missing");
  assert.equal(checkVacation({ ...winter, end: "2026-12-20" }), "end-before-start");
  assert.equal(checkVacation({ start: "", end: "" }), "start-missing");
});

test("test_vac_004_vacations_on_a_date_in_the_order_added", () => {
  const list = [winter, trip];
  assert.deepEqual(vacationsOn(list, "2026-12-20"), []);
  assert.deepEqual(vacationsOn(list, "2026-12-21"), [winter]);
  assert.deepEqual(vacationsOn(list, "2026-12-28"), [winter, trip]);
  assert.deepEqual(vacationsOn(list, "2026-12-31"), [winter, trip]);
  assert.deepEqual(vacationsOn(list, "2027-01-03"), [trip]);
  assert.deepEqual(vacationsOn([trip, winter], "2026-12-30"), [trip, winter]);
});

test("test_vac_006_parse_vacations_keeps_valid_entries_and_drops_the_rest", () => {
  assert.deepEqual(parseVacations(undefined), []);
  assert.deepEqual(parseVacations("text"), []);
  const parsed = parseVacations([
    winter,
    { ...trip, label: " Trip " },
    { ...winter },
    { start: "2026-12-31", end: "2026-12-21", label: "" },
    { start: "2026-12-21", end: "2026-12-22" },
    { start: 5, end: "2026-12-22", label: "" },
    null,
  ]);
  assert.deepEqual(parsed, [winter, trip]);
});
