import assert from "node:assert/strict";
import test from "node:test";

import { resolveJobType } from "../utils/normalizeScrapedJob.js";

test("resolveJobType normalizes common full-time source labels", () => {
  for (const employmentType of [
    "Full time",
    "Full Time",
    "FULL_TIME",
    "Full-Time",
    "Permanent",
    "Regular",
    "Unlimited",
    "Full Time Employee",
    "FTE",
  ]) {
    assert.equal(
      resolveJobType({ employmentType, title: "Software Engineer" }),
      "Full-time Experienced",
      employmentType,
    );
  }
});

test("resolveJobType classifies every label containing contract as contract", () => {
  for (const employmentType of [
    "Fixed-term contract",
    "Contractual",
    "Permanent Contract",
    "Project-specific contract",
    "Trainee on contract",
    "Full-time or Contract",
  ]) {
    assert.equal(resolveJobType({ employmentType, title: "Software Engineer" }), "Contract", employmentType);
  }
});

test("resolveJobType classifies the selected permanent and employment labels as experienced full-time", () => {
  for (const employmentType of [
    "Professional",
    "On-site with Flexibility",
    "Permanent Full-Time",
    "Regular - Permanent",
    "Business Regular",
    "Full Time Employee",
    "Full-time Employment",
    "Employee",
    "Full Time Employees",
    "Permanent Full Time",
    "Employee - Regular",
    "Full-Time Employment",
    "Full Time Employment",
    "Regular Full Time",
    "Permanant (Full Time)",
  ]) {
    assert.equal(
      resolveJobType({ employmentType, title: "Software Engineer" }),
      "Full-time Experienced",
      employmentType,
    );
  }
});

test("resolveJobType classifies unrecognized source labels as Others", () => {
  for (const employmentType of ["Onsite", "Hybrid", "Remote Local", "J"]) {
    assert.equal(resolveJobType({ employmentType, title: "Software Engineer" }), "Others", employmentType);
  }
});
