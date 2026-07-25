import assert from "node:assert/strict";
import test from "node:test";
import { validationResult } from "express-validator";

import User from "../src/models/User.js";
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

test("userProfileValidation accepts nested profilePreferenceFilters payloads", async () => {
  const errors = await runProfileValidation({
    profilePreferenceFilters: {
      company: ["Example Corp"],
      jobType: ["Internship"],
      location: ["Bengaluru"],
      experienceYear: "1",
      roleDomain: ["Data Science & AI"],
      workArrangement: ["Remote"],
      datePostedDays: [7],
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
          datePostedDays: [7],
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
  } finally {
    User.findById = originalFindById;
  }
});
