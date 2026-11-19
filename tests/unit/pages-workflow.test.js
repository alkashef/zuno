// @ts-check
/** @module pages-workflow.test Unit test for .github/workflows/pages.yml (PKG-001, DEC-023, including the release download). */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const workflowFile = fileURLToPath(new URL("../../.github/workflows/pages.yml", import.meta.url));

test("test_pkg_001_pages_workflow_builds_and_deploys_the_one_file", async () => {
  const text = await readFile(workflowFile, "utf8");
  assert.match(text, /on:\s*\n\s+push:\s*\n\s+branches:\s*\[main\]/);
  assert.match(text, /actions\/checkout@/);
  assert.match(text, /actions\/setup-node@/);
  assert.match(text, /run: npm ci/);
  assert.match(text, /run: npm run build/);
  assert.match(text, /actions\/upload-pages-artifact@/);
  assert.match(text, /actions\/deploy-pages@/);
  assert.match(text, /pages: write/);
  assert.match(text, /id-token: write/);
  assert.match(text, /cp dist\/zuno\.html [^\n]*\/index\.html/);
});

test("test_pkg_001_pages_workflow_attaches_the_file_to_the_latest_release", async () => {
  const text = await readFile(workflowFile, "utf8");
  assert.match(text, /contents: write/);
  assert.match(text, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(text, /gh release delete latest --cleanup-tag --yes/);
  assert.match(text, /gh release create latest dist\/zuno\.html[^\n]*--target "\$GITHUB_SHA"/);
  const deploy = text.indexOf("actions/deploy-pages@");
  assert.ok(
    deploy > 0 && text.indexOf("gh release create") > deploy,
    "the release follows the deploy",
  );
});
