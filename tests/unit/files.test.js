// @ts-check
/** @module files.test Unit tests for src/files.js with a fake document and a fake URL maker (HOL-010, HOL-012, DEC-018). */
import assert from "node:assert/strict";
import { test } from "node:test";

import { createFiles } from "../../src/files.js";

/**
 * @returns {{ files: ReturnType<typeof createFiles>, events: string[], link: Record<string, unknown>, blobs: Blob[] }}
 *   `files` over a fake document and a fake URL maker; `events` lists what happened, in order.
 */
function fakeFiles() {
  /** @type {string[]} */
  const events = [];
  /** @type {Blob[]} */
  const blobs = [];
  /** @type {Record<string, unknown>} */
  const link = {
    click: () => events.push(`click ${link.download} ${link.href}`),
    remove: () => events.push("remove"),
  };
  const doc = /** @type {Document} */ (
    /** @type {unknown} */ ({
      createElement: () => link,
      body: { append: () => events.push("append") },
    })
  );
  const urls = {
    createObjectURL: (/** @type {Blob} */ blob) => {
      blobs.push(blob);
      return "blob:fake-1";
    },
    revokeObjectURL: (/** @type {string} */ url) => void events.push(`revoke ${url}`),
  };
  return { files: createFiles({ doc, urls }), events, link, blobs };
}

test("test_hol_010_save_json_clicks_a_download_link_with_the_file_name_and_revokes_the_url", async () => {
  const { files, events, blobs } = fakeFiles();
  files.saveJson("zuno-holidays.json", { version: 1, added: [], hidden: [] });
  assert.deepEqual(events, [
    "append",
    "click zuno-holidays.json blob:fake-1",
    "remove",
    "revoke blob:fake-1",
  ]);
  assert.equal(blobs.length, 1);
  assert.equal(blobs[0].type, "application/json");
  assert.deepEqual(JSON.parse(await blobs[0].text()), { version: 1, added: [], hidden: [] });
});

test("test_hol_011_read_json_returns_the_value_of_a_json_file", async () => {
  const { files } = fakeFiles();
  const file = new File(['{"version":1,"added":[],"hidden":[]}'], "a.json");
  assert.deepEqual(await files.readJson(file), {
    status: "read",
    value: { version: 1, added: [], hidden: [] },
  });
});

test("test_hol_012_read_json_reports_text_that_is_not_json_as_unreadable", async () => {
  const { files } = fakeFiles();
  assert.deepEqual(await files.readJson(new File(["hello"], "a.json")), { status: "unreadable" });
  assert.deepEqual(await files.readJson(new File([""], "empty.json")), { status: "unreadable" });
});
