// @ts-check
/** @module files.test Unit tests for src/files.js with a fake document and a fake URL maker (HOL-010, HOL-012, DEC-032). */
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

test("test_hol_010_save_text_makes_a_blob_link_and_revokes_the_url", async () => {
  const { files, events, blobs } = fakeFiles();
  files.saveText("zuno-holidays-and-vacations.csv", "a,b\r\n", "text/csv");
  assert.deepEqual(events, [
    "append",
    "click zuno-holidays-and-vacations.csv blob:fake-1",
    "remove",
    "revoke blob:fake-1",
  ]);
  assert.equal(blobs.length, 1);
  assert.equal(blobs[0].type, "text/csv");
  assert.equal(await blobs[0].text(), "a,b\r\n");
});

test("test_hol_012_read_text_returns_the_text_of_a_file", async () => {
  const { files } = fakeFiles();
  assert.deepEqual(await files.readText(new File(["a,b\r\n"], "a.csv")), {
    status: "read",
    text: "a,b\r\n",
  });
});

test("test_hol_012_read_text_reports_an_unreadable_file", async () => {
  const { files } = fakeFiles();
  const broken = /** @type {Blob} */ (
    /** @type {unknown} */ ({ text: () => Promise.reject(new Error("cannot read")) })
  );
  assert.deepEqual(await files.readText(broken), { status: "unreadable" });
});
