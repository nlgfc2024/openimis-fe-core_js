const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Searcher defaults a missing searcherActions prop to an empty list", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/components/generics/Searcher.js"), "utf8");

  assert.match(source, /const \{ searcherActions = \[\], classes \} = this\.props;/);
});
