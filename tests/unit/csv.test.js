// @ts-check
/** @module csv.test Unit tests for src/domain/csv.js (HOL-010, HOL-012, DEC-032). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { format, parse } from "../../src/domain/csv.js";

const bom = String.fromCharCode(0xfeff);

test("test_hol_010_format_quotes_only_the_fields_that_need_it_and_ends_lines_with_crlf", () => {
  const rows = [
    ["plain", "with space", ""],
    ["a,b", 'say "hi"', "two\nlines"],
  ];
  assert.equal(format(rows), 'plain,with space,\r\n"a,b","say ""hi""","two\nlines"\r\n');
  assert.equal(format([]), "");
});

test("test_hol_010_parse_reads_what_format_writes", () => {
  const rows = [
    ["Type", "Name"],
    ["holiday", 'He said "yes", then left'],
    ["vacation", "first\r\nsecond"],
    ["", ""],
  ];
  assert.deepEqual(parse(format(rows)), rows);
  assert.deepEqual(parse("a,b\nc,d"), [
    ["a", "b"],
    ["c", "d"],
  ]);
  assert.deepEqual(parse("a,"), [["a", ""]]);
  assert.deepEqual(parse(""), []);
});

test("test_hol_012_parse_ignores_a_byte_order_mark_and_returns_null_for_an_open_quote", () => {
  assert.deepEqual(parse(`${bom}Type,Name\r\n`), [["Type", "Name"]]);
  assert.equal(parse('a,"b'), null);
  assert.equal(parse('a,"b""\r\n'), null);
  assert.equal(parse('a,"b"c\r\n'), null);
});
