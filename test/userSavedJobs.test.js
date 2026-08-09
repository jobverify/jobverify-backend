import assert from "node:assert/strict";
import test from "node:test";

import Job from "../src/models/Job.js";
import User from "../src/models/User.js";

const PUBLIC_SCOPE_NOW_PLACEHOLDER = "__PUBLIC_SCOPE_NOW__";

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

const normalizePublishedDateScope = (value) => {
  if (value instanceof Date) return PUBLIC_SCOPE_NOW_PLACEHOLDER;
  if (Array.isArray(value)) return value.map(normalizePublishedDateScope);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizePublishedDateScope(nestedValue),
      ]),
    );
  }
  return value;
};

const assertHasPublishedDateScope = (scope) => {
  const lowerBound = scope?.$expr?.$lte?.[0]?.$ifNull?.[1];
  const upperBound = scope?.$expr?.$lte?.[1];

  assert.ok(lowerBound instanceof Date);
  assert.ok(upperBound instanceof Date);
  assert.equal(lowerBound.getTime(), upperBound.getTime());
  assert.equal(JSON.stringify(scope).includes("$$NOW"), false);
  assert.deepEqual(normalizePublishedDateScope(scope.$expr), {
    $lte: [
      { $ifNull: ["$postedAt", PUBLIC_SCOPE_NOW_PLACEHOLDER] },
      PUBLIC_SCOPE_NOW_PLACEHOLDER,
    ],
  });
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

test("getSavedJobs excludes future-posted jobs from the saved-jobs view", async () => {
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

    assertHasPublishedDateScope(capturedFilter);
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
