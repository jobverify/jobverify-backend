import assert from "node:assert/strict";
import test from "node:test";

import { jobMatchesSavedFilters } from "../src/services/jobFilterMatcher.js";

test("jobMatchesSavedFilters applies the full saved-filter contract except sortBy", () => {
  const matched = jobMatchesSavedFilters({
    userProfile: { branch: "CSE", passingYear: 2027 },
    filters: {
      company: ["Example Corp"],
      jobType: ["Internship"],
      location: ["Bengaluru"],
      experienceYear: "1",
      roleDomain: ["Data Science & AI"],
      workArrangement: ["Remote"],
      datePostedDays: ["7"],
      sortBy: "oldest",
    },
    job: {
      company: "Example Corp",
      jobType: "Intern",
      city: "Bengaluru",
      location: "Bengaluru, India",
      branches: ["CSE"],
      eligibleBatches: [2027],
      experienceYears: [1],
      primaryRoleDomain: "Data Science & AI",
      workArrangement: "Remote",
      postedAt: new Date(2026, 6, 21, 12),
    },
    now: new Date(2026, 6, 28, 12),
  });

  assert.equal(matched, true);
});

test("jobMatchesSavedFilters supports the public zero-day date-posted window", () => {
  const matched = jobMatchesSavedFilters({
    filters: { datePostedDays: ["0"] },
    job: { postedAt: new Date(2026, 6, 28, 12) },
    now: new Date(2026, 6, 28, 23),
  });

  assert.equal(matched, true);
});

test("jobMatchesSavedFilters applies fresher job-type semantics for experience year zero", () => {
  assert.equal(jobMatchesSavedFilters({
    filters: { experienceYear: "0" },
    job: {
      experienceYears: [0],
      jobType: "Full-time Experienced",
    },
  }), false);

  assert.equal(jobMatchesSavedFilters({
    filters: { experienceYear: "0" },
    job: {
      experienceYears: [0],
      jobType: "Full-time Fresher",
    },
  }), true);
});

test("jobMatchesSavedFilters uses calendar-day date-posted windows", () => {
  const now = new Date(2026, 6, 28, 0, 15);

  assert.equal(jobMatchesSavedFilters({
    filters: { datePostedDays: ["0"] },
    job: { postedAt: new Date(2026, 6, 27, 23, 59) },
    now,
  }), false);
  assert.equal(jobMatchesSavedFilters({
    filters: { datePostedDays: ["1"] },
    job: { postedAt: new Date(2026, 6, 27, 23, 59) },
    now,
  }), true);
});
