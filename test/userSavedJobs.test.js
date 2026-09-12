import assert from "node:assert/strict";
import test from "node:test";

import Job from "../src/models/Job.js";
import User from "../src/models/User.js";
import { buildAggregateHiringSignalFilter } from "../src/utils/jobListingEvidence.js";

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

const assertHasPublicSavedJobScope = (scope) => {
  const [postedUpperBound, closingLowerBound] =
    scope?.$expr?.$and ?? [];
  const now = postedUpperBound?.$lte?.[1];
  const today = closingLowerBound?.$gte?.[1];

  assert.equal(scope?.isPublicIndia, true);
  assert.equal(scope?.status, "active");
  assert.ok(now instanceof Date);
  assert.ok(today instanceof Date);
  assert.equal(scope.$expr.$and.length, 2);
  assert.deepEqual(scope.$nor, [buildAggregateHiringSignalFilter()]);
  assert.equal(today.getUTCHours(), 0);
  assert.equal(today.getUTCMinutes(), 0);
};

test("user schema stores saved job references", () => {
  const savedJobsPath = User.schema.path("savedJobs");

  assert.ok(savedJobsPath);
  assert.equal(savedJobsPath.instance, "Array");
  assert.equal(savedJobsPath.caster.instance, "ObjectId");
  assert.equal(savedJobsPath.caster.options.ref, "Job");
});

test("user routes expose protected saved job endpoints", async () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = originalJwtSecret || "x".repeat(32);

  try {
    const { default: router } = await import("../src/routes/userRoutes.js");

    const listLayer = router.stack.find(
      (layer) => layer.route?.path === "/saved-jobs" && layer.route.methods.get,
    );
    assert.ok(listLayer);
    assert.equal(listLayer.route.stack[0].name, "protect");
    assert.equal(listLayer.route.stack.at(-1).name, "getSavedJobs");

    const saveLayer = router.stack.find(
      (layer) => layer.route?.path === "/saved-jobs/:jobId" && layer.route.methods.post,
    );
    assert.ok(saveLayer);
    assert.equal(saveLayer.route.stack[0].name, "protect");
    assert.equal(
      saveLayer.route.stack.filter((layer) => layer.method === "post").at(-1)?.name,
      "saveJob",
    );

    const removeLayer = router.stack.find(
      (layer) => layer.route?.path === "/saved-jobs/:jobId" && layer.route.methods.delete,
    );
    assert.ok(removeLayer);
    assert.equal(removeLayer.route.stack[0].name, "protect");
    assert.equal(
      removeLayer.route.stack.filter((layer) => layer.method === "delete").at(-1)?.name,
      "removeSavedJob",
    );
  } finally {
    process.env.JWT_SECRET = originalJwtSecret;
  }
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

test("getSavedJobs applies the public job visibility scope", async () => {
  const { getSavedJobs } = await import("../src/controllers/userController.js");
  const originalFindById = User.findById;
  const originalJobFind = Job.find;
  let capturedFilter = null;

  const user = {
    _id: "user-1",
    savedJobs: ["507f191e810c19729de860ea"],
    async save() { return this; },
  };
  User.findById = () => ({ select: async () => user });
  Job.find = (filter) => {
    capturedFilter = filter;
    return [];
  };

  try {
    await getSavedJobs({ user: { _id: "user-1" } }, createResponseDouble());

    assertHasPublicSavedJobScope(capturedFilter);
  } finally {
    User.findById = originalFindById;
    Job.find = originalJobFind;
  }
});

test("getSavedJobs returns the public job card shape instead of raw job documents", async () => {
  const { getSavedJobs } = await import("../src/controllers/userController.js");
  const originalFindById = User.findById;
  const originalJobFind = Job.find;

  const user = {
    _id: "user-1",
    savedJobs: ["507f191e810c19729de860ea"],
    async save() { return this; },
  };
  User.findById = () => ({ select: async () => user });
  Job.find = async () => ([
    {
      _id: "507f191e810c19729de860ea",
      title: "Security Engineer",
      company: "Example Corp",
      city: "Pune",
      jobType: "Full-time",
      status: "active",
      isPublicIndia: true,
      applyUrl: "https://example.com/apply",
      clickCount: 42,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      sortDate: new Date("2026-01-02T00:00:00.000Z"),
      _cursorDate: new Date("2026-01-03T00:00:00.000Z"),
      workdayApplicationStatus: "open",
      workdayApplicationStatusReason: "available",
      workdayApplicationStatusCheckedAt: new Date("2026-01-04T00:00:00.000Z"),
    },
  ]);

  try {
    const res = createResponseDouble();

    await getSavedJobs({ user: { _id: "user-1" } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal("clickCount" in res.body.data[0], false);
    assert.equal("createdAt" in res.body.data[0], false);
    assert.equal("sortDate" in res.body.data[0], false);
    assert.equal("_cursorDate" in res.body.data[0], false);
    assert.equal("workdayApplicationStatus" in res.body.data[0], false);
    assert.equal("workdayApplicationStatusReason" in res.body.data[0], false);
    assert.equal("workdayApplicationStatusCheckedAt" in res.body.data[0], false);
  } finally {
    User.findById = originalFindById;
    Job.find = originalJobFind;
  }
});

test("saveJob adds a job only once and returns the updated overview count", async () => {
  const { saveJob } = await import("../src/controllers/userController.js");
  const originalUserFindById = User.findById;
  const originalJobFindById = Job.findById;
  const originalJobFindOne = Job.findOne;
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
  Job.findOne = async (filter) => (
    filter?._id === "507f191e810c19729de860ea"
      ? { _id: filter._id }
      : null
  );
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
    Job.findOne = originalJobFindOne;
    Job.countDocuments = originalCountDocuments;
  }
});

test("saveJob only accepts jobs that are still publicly visible", async () => {
  const { saveJob } = await import("../src/controllers/userController.js");
  const originalUserFindById = User.findById;
  const originalJobFindById = Job.findById;
  const originalJobFindOne = Job.findOne;

  let capturedFilter = null;
  const user = {
    _id: "user-1",
    savedJobs: [],
    async save() {
      return this;
    },
  };

  User.findById = async () => user;
  Job.findById = async () => {
    throw new Error("saveJob must apply the public job visibility scope");
  };
  Job.findOne = async (filter) => {
    capturedFilter = filter;
    return null;
  };

  try {
    const res = createResponseDouble();

    await saveJob(
      {
        user: { _id: "user-1" },
        params: { jobId: "507f191e810c19729de860ea" },
      },
      res,
    );

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Job not found");
    assertHasPublicSavedJobScope(capturedFilter);
  } finally {
    User.findById = originalUserFindById;
    Job.findById = originalJobFindById;
    Job.findOne = originalJobFindOne;
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

test("getSavedJobs hides unexpected storage errors behind a generic 500", async () => {
  const { getSavedJobs } = await import("../src/controllers/userController.js");
  const originalFindById = User.findById;
  const rawErrorMessage = "Mongo topology details should stay server-side";

  User.findById = () => ({
    select: async () => {
      throw new Error(rawErrorMessage);
    },
  });

  try {
    const res = createResponseDouble();

    await getSavedJobs({ user: { _id: "user-1" } }, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, 500);
    assert.equal(res.body.message, "Internal Server Error");
    assert.equal(JSON.stringify(res.body).includes(rawErrorMessage), false);
  } finally {
    User.findById = originalFindById;
  }
});
