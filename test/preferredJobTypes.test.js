import assert from "node:assert/strict";
import test from "node:test";

import { getPreferredJobTypeMatches } from "../src/constants/preferredJobTypes.js";

test("full-time experienced preferences also match legacy full-time records", () => {
  assert.deepEqual(
    getPreferredJobTypeMatches("Full-time Experienced"),
    ["Full-time Experienced", "Full-time"],
  );
});
