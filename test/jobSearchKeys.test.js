import assert from "node:assert/strict";
import test from "node:test";

import {
  buildJobSearchKeys,
  normalizeJobSearchKey,
} from "../src/utils/jobSearchKeys.js";

test("normalizeJobSearchKey creates stable equality keys for categorical filters", () => {
  assert.equal(normalizeJobSearchKey("  Bengaluru   "), "bengaluru");
  assert.equal(normalizeJobSearchKey("São Paulo"), "sao paulo");
  assert.equal(normalizeJobSearchKey(""), null);
});

test("buildJobSearchKeys stores company, city, and all location aliases", () => {
  assert.deepEqual(
    buildJobSearchKeys({
      company: "Acme Labs",
      city: "Bangalore",
      location: "Bengaluru, India",
      locations: ["Bangalore", "Remote", "Bengaluru, India"],
    }),
    {
      companyKey: "acme labs",
      cityKey: "bangalore",
      locationKeys: ["bangalore", "bengaluru, india", "remote"],
    },
  );
});
