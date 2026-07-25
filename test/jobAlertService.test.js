import assert from "node:assert/strict";
import test from "node:test";

import JobAlertDelivery from "../src/models/JobAlertDelivery.js";
import User from "../src/models/User.js";
import {
  jobMatchesUserPreferences,
  normalizePhoneE164,
  queueJobAlertsForJobs,
} from "../src/services/jobAlertService.js";

test("normalizePhoneE164 converts local Indian numbers into E.164 format", () => {
  assert.equal(normalizePhoneE164("9876543210"), "+919876543210");
  assert.equal(normalizePhoneE164("+14155552671"), "+14155552671");
  assert.equal(normalizePhoneE164("not-a-phone"), null);
});

test("jobMatchesUserPreferences accepts jobs that satisfy eligibility constraints and a strong preference", () => {
  const matched = jobMatchesUserPreferences(
    {
      profile: {
        branch: "CSE",
        passingYear: 2027,
        preferredJobTypes: ["Intern"],
        locationPreference: ["Bengaluru"],
      },
    },
    {
      jobType: "Intern",
      city: "Bengaluru",
      location: "Bengaluru, India",
      eligibleBatches: [2027],
      branches: ["CSE", "IT"],
      title: "Frontend Intern",
      description: "React internship role",
    },
  );

  assert.equal(matched, true);
});

test("jobMatchesUserPreferences rejects jobs that fail branch or batch eligibility even when location matches", () => {
  const branchMismatch = jobMatchesUserPreferences(
    {
      profile: {
        branch: "ECE",
        passingYear: 2027,
        preferredJobTypes: ["Intern"],
        locationPreference: ["Bengaluru"],
      },
    },
    {
      jobType: "Intern",
      city: "Bengaluru",
      location: "Bengaluru, India",
      eligibleBatches: [2027],
      branches: ["CSE"],
      title: "Frontend Intern",
      description: "React internship role",
    },
  );

  const batchMismatch = jobMatchesUserPreferences(
    {
      profile: {
        branch: "CSE",
        passingYear: 2028,
        preferredJobTypes: ["Intern"],
        locationPreference: ["Bengaluru"],
      },
    },
    {
      jobType: "Intern",
      city: "Bengaluru",
      location: "Bengaluru, India",
      eligibleBatches: [2027],
      branches: ["CSE"],
      title: "Frontend Intern",
      description: "React internship role",
    },
  );

  assert.equal(branchMismatch, false);
  assert.equal(batchMismatch, false);
});

test("queueJobAlertsForJobs deduplicates WhatsApp deliveries per user and job", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;

  const createdPayloads = [];
  const updatedPayloads = [];

  User.find = () => ({
    lean() {
      return this;
    },
    exec: async () => [
      {
        _id: "user-1",
        accessRole: "semester_premium_user",
        premium: {
          status: "active",
          whatsappAlertsEnabled: true,
          expiresAt: new Date("2026-10-27T00:00:00.000Z"),
        },
        contact: {
          phoneE164: "+919999999999",
          whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
        },
        profile: {
          branch: "CSE",
          passingYear: 2027,
          preferredJobTypes: ["Intern"],
          locationPreference: ["Bengaluru"],
        },
      },
    ],
  });

  let createCount = 0;
  JobAlertDelivery.create = async (payload) => {
    createCount += 1;
    if (createCount === 2) {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    }

    createdPayloads.push(payload);
    return {
      _id: `delivery-${createCount}`,
      ...payload,
    };
  };
  JobAlertDelivery.updateMany = async (_filter, update) => {
    updatedPayloads.push(update);
    return { modifiedCount: 1 };
  };

  try {
    await queueJobAlertsForJobs([
      {
        _id: "job-1",
        title: "Frontend Intern",
        company: "Example",
        city: "Bengaluru",
        location: "Bengaluru, India",
        jobType: "Intern",
        eligibleBatches: [2027],
        branches: ["CSE"],
        requiredSkills: ["React"],
        description: "React internship role",
      },
      {
        _id: "job-1",
        title: "Frontend Intern",
        company: "Example",
        city: "Bengaluru",
        location: "Bengaluru, India",
        jobType: "Intern",
        eligibleBatches: [2027],
        branches: ["CSE"],
        requiredSkills: ["React"],
        description: "React internship role",
      },
    ]);

    assert.equal(createdPayloads.length, 1);
    assert.equal(updatedPayloads.length, 1);
    assert.equal(updatedPayloads[0].$set.status, "sent");
  } finally {
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
  }
});
