import assert from "node:assert/strict";
import test from "node:test";

import { extractJobFilterSignals } from "../src/utils/jobFilterSignals.js";

test("extractJobFilterSignals classifies required and preferred skills with domain, seniority, and experience signals", () => {
  const signals = extractJobFilterSignals({
    title: "Senior Backend Engineer",
    location: "Hybrid - Bengaluru, India",
    description: [
      "Build backend APIs and distributed services for a payments platform.",
      "Responsibilities include Java microservices, AWS deployment, and PostgreSQL optimization.",
      "Preferred Qualifications: Kubernetes and Kafka experience.",
    ].join(" "),
    minimumQualification: "Required skills: Java, Spring Boot, AWS, PostgreSQL.",
    preferredQualification: "Preferred: Kubernetes, Kafka.",
    requiredSkills: ["Java", "Spring Boot", "AWS"],
    experienceRequired: "3 to 5 years of backend engineering experience",
  });

  assert.equal(signals.experienceBucket, "3-5");
  assert.equal(signals.experienceProfile.minimumYears, 3);
  assert.equal(signals.experienceProfile.maximumYears, 5);
  assert.equal(signals.experienceProfile.isOpenEnded, false);
  assert.deepEqual(signals.experienceYears, [3, 4, 5]);
  assert.equal(signals.experienceProfile.confidence, "high");
  assert.equal(signals.seniority, "Senior");
  assert.equal(signals.primaryRoleDomain, "Backend Engineering");
  assert.equal(signals.workArrangement, "Hybrid");
  assert.deepEqual(signals.requiredSkillIds, ["java", "spring-boot", "aws", "postgresql"]);
  assert.deepEqual(signals.preferredSkillIds, ["kubernetes", "kafka"]);
  assert.deepEqual(
    signals.skillIds,
    ["java", "spring-boot", "aws", "postgresql", "kubernetes", "kafka"],
  );
});

test("extractJobFilterSignals expands arbitrary bounded ranges into experienceYears", () => {
  const signals = extractJobFilterSignals({
    title: "Platform Engineer",
    experienceRequired: "4-6 years of platform engineering experience",
  });

  assert.equal(signals.experienceProfile.minimumYears, 4);
  assert.equal(signals.experienceProfile.maximumYears, 6);
  assert.equal(signals.experienceProfile.isOpenEnded, false);
  assert.deepEqual(signals.experienceYears, [4, 5, 6]);
});

test("extractJobFilterSignals expands open-ended ranges into capped experienceYears", () => {
  const signals = extractJobFilterSignals({
    title: "Principal Engineer",
    experienceRequired: "5+ years of engineering leadership experience",
  });

  assert.equal(signals.experienceProfile.minimumYears, 5);
  assert.equal(signals.experienceProfile.maximumYears, null);
  assert.equal(signals.experienceProfile.isOpenEnded, true);
  assert.deepEqual(signals.experienceYears, [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
});

test("extractJobFilterSignals avoids ambiguous false-positive skill aliases", () => {
  const signals = extractJobFilterSignals({
    title: "Customer Success Specialist",
    description: [
      "Help new clients react quickly to onboarding issues.",
      "Own spring planning notes and go-live coordination.",
      "Build customer trust and improve support metrics.",
    ].join(" "),
    location: "On-site - Chennai, India",
  });

  assert.deepEqual(signals.skillIds, []);
  assert.equal(signals.primaryRoleDomain, "Sales & Customer Success");
  assert.equal(signals.workArrangement, "On-site");
});

test("extractJobFilterSignals treats entry-level and no-experience wording as early-career signals", () => {
  const signals = extractJobFilterSignals({
    title: "Graduate Software Engineer",
    location: "Remote, India",
    description: "Entry-level role. No prior experience required. Work with React and TypeScript.",
    experienceRequired: "No prior experience required",
  });

  assert.equal(signals.experienceBucket, "0-1");
  assert.equal(signals.experienceProfile.minimumYears, 0);
  assert.equal(signals.experienceProfile.maximumYears, 0);
  assert.equal(signals.experienceProfile.isOpenEnded, false);
  assert.deepEqual(signals.experienceYears, [0]);
  assert.equal(signals.seniority, "Entry Level");
  assert.equal(signals.workArrangement, "Remote");
  assert.deepEqual(signals.skillIds, ["react", "typescript"]);
});
