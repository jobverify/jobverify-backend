import assert from "node:assert/strict";
import test from "node:test";
import { validationResult } from "express-validator";

import Job from "../src/models/Job.js";
import User from "../src/models/User.js";
import { ACCESS_ROLES, PLAN_IDS } from "../src/constants/accessPlans.js";
import { getPreferredJobTypeMatches } from "../src/constants/preferredJobTypes.js";
import { getAllJobs } from "../src/controllers/jobController.js";
import { updateUserProfile } from "../src/controllers/userController.js";
import { userProfileValidation } from "../src/validation/requestValidators.js";

const createResponseDouble = () => ({
  statusCode: 200,
  headers: {},
  body: null,
  set(name, value) {
    this.headers[name] = value;
    return this;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

async function runProfileValidation(body) {
  const req = { body };
  for (const rule of userProfileValidation) {
    await rule.run(req);
  }
  return validationResult(req).array().map((entry) => ({
    path: entry.path,
    msg: entry.msg,
  }));
}

test("full-time experienced preferences also match legacy full-time records", () => {
  assert.deepEqual(
    getPreferredJobTypeMatches("Full-time Experienced"),
    ["Full-time Experienced", "Full-time"],
  );
});

test("updateUserProfile persists preferred job types and marks onboarding complete without skills", async () => {
  const originalFindById = User.findById;

  const fakeUser = {
    _id: "user-1",
    email: "student@example.com",
    role: "user",
    profile: {
      name: "Mohan",
      branch: "",
      passingYear: null,
      preferredJobTypes: [],
      locationPreference: [],
    },
    onboardingCompleted: false,
    savedJobs: [],
    lastLoginAt: null,
    async save() {
      return this;
    },
  };

  User.findById = async () => fakeUser;

  try {
    const req = {
      user: { _id: "user-1" },
      body: {
        branch: "CSE",
        passingYear: 2027,
        preferredJobTypes: ["Intern", "Full-time Fresher"],
        locationPreference: ["Bengaluru"],
      },
    };
    const res = createResponseDouble();

    await updateUserProfile(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(fakeUser.profile.preferredJobTypes, ["Intern", "Full-time Fresher"]);
    assert.equal(fakeUser.onboardingCompleted, true);
  } finally {
    User.findById = originalFindById;
  }
});

test("recommended jobs sort boosts matching preferred job types ahead of non-matching jobs", async () => {
  const originalCountDocuments = Job.countDocuments;
  const originalDistinct = Job.distinct;
  const originalAggregate = Job.aggregate;

  let capturedPipeline = null;

  Job.countDocuments = async () => 2;
  Job.distinct = async () => ["Example Corp"];
  Job.aggregate = (pipeline) => {
    capturedPipeline = pipeline;
    return {
      exec: async () => [
        { _id: "job-1", title: "Frontend Intern", jobType: "Intern", recommendationScore: 25 },
        { _id: "job-2", title: "Senior Platform Engineer", jobType: "Full-time Experienced", recommendationScore: 5 },
      ],
    };
  };

  try {
    const req = {
      query: { sort: "recommended", page: "1", limit: "20" },
      user: {
        role: "user",
        accessRole: ACCESS_ROLES.MONTHLY,
        premium: {
          planId: PLAN_IDS.MONTHLY,
          status: "active",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        profile: {
          branch: "CSE",
          passingYear: 2027,
          preferredJobTypes: ["Intern"],
          locationPreference: ["Bengaluru"],
        },
      },
    };
    const res = createResponseDouble();

    await getAllJobs(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data[0].jobType, "Intern");
    assert.ok(capturedPipeline, "expected aggregate pipeline to be captured");
    assert.match(JSON.stringify(capturedPipeline), /_jobTypeText/);
    assert.equal(
      capturedPipeline.find((stage) => stage.$limit != null)?.$limit,
      12,
    );

    const finalProject = capturedPipeline.at(-1)?.$project;
    assert.equal(finalProject?.title, 1);
    assert.equal(finalProject?.company, 1);
    assert.equal(finalProject?.jobSkills, 1);
    assert.equal(finalProject?.description, undefined);
    assert.equal(finalProject?.minimumQualification, undefined);
    assert.equal(finalProject?.preferredQualification, undefined);
  } finally {
    Job.countDocuments = originalCountDocuments;
    Job.distinct = originalDistinct;
    Job.aggregate = originalAggregate;
  }
});

test("userProfileValidation accepts nested profilePreferenceFilters payloads", async () => {
  const errors = await runProfileValidation({
    profilePreferenceFilters: {
      company: ["Example Corp"],
      jobType: ["Internship"],
      location: ["Bengaluru"],
      experienceYear: "1",
      roleDomain: ["Data Science & AI"],
      workArrangement: ["Remote"],
      datePostedDays: ["7", "na"],
      sortBy: "latest",
    },
  });

  assert.deepEqual(errors, []);
});

test("userProfileValidation accepts nested whatsappAlertFilters payloads", async () => {
  const errors = await runProfileValidation({
    whatsappAlertFilters: {
      company: ["Example Corp"],
      jobType: ["Internship"],
      location: ["Bengaluru"],
      experienceYear: "1",
      roleDomain: ["Data Science & AI"],
      workArrangement: ["Remote"],
      datePostedDays: ["7"],
      sortBy: "latest",
    },
  });
  assert.deepEqual(errors, []);
});

test("userProfileValidation accepts a blank profile preference experience year", async () => {
  const errors = await runProfileValidation({
    profilePreferenceFilters: {
      jobType: ["Full-time Experienced"],
      location: ["Bangalore"],
      experienceYear: "",
      sortBy: "latest",
    },
  });

  assert.deepEqual(errors, []);
});

test("userProfileValidation rejects recursive profile preference sort values", async () => {
  const errors = await runProfileValidation({
    profilePreferenceFilters: {
      sortBy: "recommended",
    },
  });

  assert.deepEqual(errors, [
    {
      path: "profilePreferenceFilters.sortBy",
      msg: "Profile preference sort must be one of: all, popularity, latest, oldest.",
    },
  ]);
});

test("updateUserProfile persists profilePreferenceFilters and synchronizes legacy preference arrays", async () => {
  const originalFindById = User.findById;

  const fakeUser = {
    _id: "user-1",
    email: "student@example.com",
    role: "user",
    profile: {
      name: "Mohan",
      branch: "CSE",
      passingYear: 2027,
      preferredJobTypes: [],
      locationPreference: [],
      profilePreferenceFilters: undefined,
    },
    onboardingCompleted: false,
    savedJobs: [],
    lastLoginAt: null,
    async save() {
      return this;
    },
  };

  User.findById = async () => fakeUser;

  try {
    const req = {
      user: { _id: "user-1" },
      body: {
        profilePreferenceFilters: {
          company: ["Example Corp"],
          jobType: ["Internship", "Full-time Fresher"],
          location: ["Bengaluru"],
          experienceYear: "1",
          roleDomain: ["Data Science & AI"],
          workArrangement: ["Remote"],
          datePostedDays: ["7", "na"],
          sortBy: "popularity",
        },
      },
    };
    const res = createResponseDouble();

    await updateUserProfile(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(fakeUser.profile.profilePreferenceFilters.jobType, [
      "Internship",
      "Full-time Fresher",
    ]);
    assert.deepEqual(fakeUser.profile.locationPreference, ["Bengaluru"]);
    assert.deepEqual(fakeUser.profile.preferredJobTypes, [
      "Intern",
      "Full-time Fresher",
    ]);
    assert.equal(fakeUser.profile.profilePreferenceFilters.sortBy, "popularity");
    assert.deepEqual(fakeUser.profile.profilePreferenceFilters.datePostedDays, ["7", "na"]);
  } finally {
    User.findById = originalFindById;
  }
});
