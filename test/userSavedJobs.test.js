import assert from "node:assert/strict";
import test from "node:test";

import Job from "../src/models/Job.js";
import User from "../src/models/User.js";

const createResponseDouble = () => {
  const result = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return result;
};

test("user schema stores saved job references", () => {
  const savedJobsPath = User.schema.path("savedJobs");

  assert.ok(savedJobsPath);
  assert.equal(savedJobsPath.instance, "Array");
  assert.equal(savedJobsPath.caster.instance, "ObjectId");
  assert.equal(savedJobsPath.caster.options.ref, "Job");
});

test("getUserProfile reports saved job count in the profile overview", async () => {
  const { getUserProfile } = await import("../src/controllers/userController.js");
  const originalFindById = User.findById;
  const originalCountDocuments = Job.countDocuments;

  User.findById = async () => ({
    _id: "user-1",
    email: "student@example.com",
    role: "user",
    profile: { name: "Student" },
    onboardingCompleted: true,
    lastLoginAt: new Date("2025-01-01T00:00:00.000Z"),
    savedJobs: ["job-1", "job-2"],
  });
  Job.countDocuments = async () => 2;

  try {
    const res = createResponseDouble();

    await getUserProfile({ user: { _id: "user-1" } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.profileOverview.savedJobs, 2);
  } finally {
    User.findById = originalFindById;
    Job.countDocuments = originalCountDocuments;
  }
});

test("getSavedJobs drops unavailable saved jobs and returns a consistent count", async () => {
  const { getSavedJobs } = await import("../src/controllers/userController.js");
  const originalFindById = User.findById;
  const originalJobFind = Job.find;

  const user = {
    _id: "user-1",
    savedJobs: [
      "507f191e810c19729de860ea",
      "507f191e810c19729de860eb",
    ],
    async save() {
      return this;
    },
  };

  User.findById = () => ({
    select: async () => user,
  });
  Job.find = async () => [];

  try {
    const res = createResponseDouble();

    await getSavedJobs({ user: { _id: "user-1" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, []);
    assert.equal(res.body.profileOverview.savedJobs, 0);
    assert.deepEqual(user.savedJobs, []);
  } finally {
    User.findById = originalFindById;
    Job.find = originalJobFind;
  }
});

test("saveJob adds a job only once and returns the updated overview count", async () => {
  const { saveJob } = await import("../src/controllers/userController.js");
  const originalUserFindById = User.findById;
  const originalJobFindById = Job.findById;
  const originalCountDocuments = Job.countDocuments;

  const user = {
    _id: "user-1",
    savedJobs: [],
    async save() {
      return this;
    },
  };

  User.findById = async () => user;
  Job.findById = async (jobId) => (jobId === "507f191e810c19729de860ea" ? { _id: jobId } : null);
  Job.countDocuments = async () => user.savedJobs.length;

  try {
    const firstResponse = createResponseDouble();
    await saveJob(
      {
        user: { _id: "user-1" },
        params: { jobId: "507f191e810c19729de860ea" },
      },
      firstResponse,
    );

    assert.equal(firstResponse.statusCode, 200);
    assert.equal(firstResponse.body.saved, true);
    assert.equal(firstResponse.body.profileOverview.savedJobs, 1);
    assert.deepEqual(user.savedJobs, ["507f191e810c19729de860ea"]);

    const secondResponse = createResponseDouble();
    await saveJob(
      {
        user: { _id: "user-1" },
        params: { jobId: "507f191e810c19729de860ea" },
      },
      secondResponse,
    );

    assert.equal(secondResponse.statusCode, 200);
    assert.equal(secondResponse.body.saved, true);
    assert.equal(secondResponse.body.profileOverview.savedJobs, 1);
    assert.deepEqual(user.savedJobs, ["507f191e810c19729de860ea"]);
  } finally {
    User.findById = originalUserFindById;
    Job.findById = originalJobFindById;
    Job.countDocuments = originalCountDocuments;
  }
});

test("removeSavedJob removes the saved job and returns the updated overview count", async () => {
  const { removeSavedJob } = await import("../src/controllers/userController.js");
  const originalFindById = User.findById;
  const originalCountDocuments = Job.countDocuments;

  const user = {
    _id: "user-1",
    savedJobs: ["507f191e810c19729de860ea", "507f191e810c19729de860eb"],
    async save() {
      return this;
    },
  };

  User.findById = async () => user;
  Job.countDocuments = async () => user.savedJobs.length;

  try {
    const res = createResponseDouble();

    await removeSavedJob(
      {
        user: { _id: "user-1" },
        params: { jobId: "507f191e810c19729de860ea" },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.saved, false);
    assert.equal(res.body.profileOverview.savedJobs, 1);
    assert.deepEqual(user.savedJobs, ["507f191e810c19729de860eb"]);
  } finally {
    User.findById = originalFindById;
    Job.countDocuments = originalCountDocuments;
  }
});
