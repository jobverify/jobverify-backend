import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import User from "../src/models/User.js";
import Job from "../src/models/Job.js";
import AdminAudit from "../src/models/AdminAudit.js";
import ScraperRun from "../src/models/ScraperRun.js";
import ScraperStatus from "../src/models/ScraperStatus.js";
import {
  ACCESS_ROLES,
  PLAN_IDS,
} from "../src/constants/accessPlans.js";
import {
  getScrapeStatus,
  triggerScrapeAdmin,
  updateUserAccess,
} from "../src/controllers/adminController.js";
import { getScraperCatalog } from "../scraper/providers/index.js";

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

const setReadyState = (value) => {
  const hadOwn = Object.prototype.hasOwnProperty.call(mongoose.connection, "readyState");
  const original = hadOwn
    ? Object.getOwnPropertyDescriptor(mongoose.connection, "readyState")
    : null;

  Object.defineProperty(mongoose.connection, "readyState", {
    configurable: true,
    value,
  });

  return () => {
    if (hadOwn && original) {
      Object.defineProperty(mongoose.connection, "readyState", original);
      return;
    }

    delete mongoose.connection.readyState;
  };
};

test("updateUserAccess lets an admin set a premium plan with a manual expiry override", async () => {
  const originalFindById = User.findById;
  const originalAdminAuditCreate = AdminAudit.create;

  const user = new User({
    email: "managed-user@example.com",
    password: "hashed-password",
  });
  user.save = async function saveDouble() {
    return this;
  };

  const audits = [];

  User.findById = async () => user;
  AdminAudit.create = async (payload) => {
    audits.push(payload);
    return payload;
  };

  try {
    const res = createResponseDouble();

    await updateUserAccess(
      {
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          accessRole: ACCESS_ROLES.SEMESTER,
          expiresAt: "2026-12-31T00:00:00.000Z",
        },
        user: {
          _id: "admin-1",
          email: "admin@example.com",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(user.accessRole, ACCESS_ROLES.SEMESTER);
    assert.equal(user.premium.planId, PLAN_IDS.SEMESTER);
    assert.equal(user.premium.expiresAt.toISOString(), "2026-12-31T00:00:00.000Z");
    assert.equal(res.body.data.accessRole, ACCESS_ROLES.SEMESTER);
    assert.equal(res.body.data.premium.planId, PLAN_IDS.SEMESTER);
    assert.equal(res.body.data.premium.expiresAt, "2026-12-31T00:00:00.000Z");
    assert.equal(audits.length, 1);
    assert.match(audits[0].details, /Plan role changed/i);
  } finally {
    User.findById = originalFindById;
    AdminAudit.create = originalAdminAuditCreate;
  }
});

test("getScrapeStatus backfills newly added catalog scrapers before building the admin summary", async () => {
  const restoreReadyState = setReadyState(1);
  const originalFind = ScraperStatus.find;
  const originalFindOne = ScraperStatus.findOne;
  const originalBulkWrite = ScraperStatus.bulkWrite;
  const originalJobCountDocuments = Job.countDocuments;
  const originalScraperRunFindOne = ScraperRun.findOne;
  const originalAdminAuditFindOne = AdminAudit.findOne;

  const catalogSources = [...new Set(getScraperCatalog().map((provider) => provider.source))];
  const [firstSource] = catalogSources;
  const recordsBySource = new Map([
    [firstSource, {
      _id: `status-${firstSource}`,
      source: firstSource,
      companyName: "Existing Source",
      url: "https://example.com/existing",
      isActive: true,
      lastRanAt: new Date("2026-07-10T00:00:00.000Z"),
      lastSuccess: true,
      consecutiveFailures: 0,
    }],
  ]);

  const createQueryDouble = (value) => ({
    sort() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => value,
  });

  ScraperStatus.find = () => ({
    lean() {
      return {
        exec: async () => Array.from(recordsBySource.values()),
      };
    },
  });
  ScraperStatus.findOne = () => createQueryDouble(null);

  ScraperStatus.bulkWrite = async (operations) => {
    operations.forEach(({ updateOne }) => {
      const source = updateOne.filter.source;
      const existing = recordsBySource.get(source);
      const next = {
        _id: existing?._id || `status-${source}`,
        source,
        ...(existing || {}),
        ...(updateOne.update.$setOnInsert || {}),
        ...(updateOne.update.$set || {}),
      };

      recordsBySource.set(source, next);
    });
  };

  Job.countDocuments = async () => 0;
  ScraperRun.findOne = () => createQueryDouble(null);
  AdminAudit.findOne = () => createQueryDouble(null);

  try {
    const res = createResponseDouble();

    await getScrapeStatus({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.sources.length, catalogSources.length);
    assert.equal(recordsBySource.size, catalogSources.length);

    const seededSource = res.body.sources.find((source) => source.source !== firstSource);
    assert.ok(seededSource);
    assert.equal(seededSource.isActive, true);
    assert.equal(seededSource.lastSuccess, true);
    assert.equal(seededSource.consecutiveFailures, 0);
  } finally {
    ScraperStatus.find = originalFind;
    ScraperStatus.findOne = originalFindOne;
    ScraperStatus.bulkWrite = originalBulkWrite;
    Job.countDocuments = originalJobCountDocuments;
    ScraperRun.findOne = originalScraperRunFindOne;
    AdminAudit.findOne = originalAdminAuditFindOne;
    restoreReadyState();
  }
});

test("getScrapeStatus prefers the live pipeline status document while a run is active", async () => {
  const restoreReadyState = setReadyState(1);
  const originalFind = ScraperStatus.find;
  const originalFindOne = ScraperStatus.findOne;
  const originalBulkWrite = ScraperStatus.bulkWrite;
  const originalJobCountDocuments = Job.countDocuments;
  const originalScraperRunFindOne = ScraperRun.findOne;
  const originalAdminAuditFindOne = AdminAudit.findOne;

  const createQueryDouble = (value) => ({
    sort() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => value,
  });

  const sources = [
    {
      _id: "status-abb",
      source: "abb",
      companyName: "ABB",
      url: "https://example.com/abb",
      isActive: true,
      lastRanAt: new Date("2026-07-10T00:00:00.000Z"),
      lastSuccess: true,
      consecutiveFailures: 0,
    },
    {
      _id: "status-airbus",
      source: "airbus",
      companyName: "Airbus",
      url: "https://example.com/airbus",
      isActive: false,
      lastRanAt: new Date("2026-07-10T00:00:00.000Z"),
      lastSuccess: true,
      consecutiveFailures: 0,
    },
  ];

  ScraperStatus.find = () => ({
    lean() {
      return {
        exec: async () => sources,
      };
    },
  });
  ScraperStatus.findOne = () => createQueryDouble({
    source: "__pipeline__",
    pipelineState: "running",
    lastTriggeredAt: new Date("2026-07-12T05:53:57.867Z"),
    lastCompletedAt: new Date("2026-07-11T21:23:50.154Z"),
  });
  ScraperStatus.bulkWrite = async () => {};

  Job.countDocuments = async () => 42;
  ScraperRun.findOne = () => createQueryDouble({
    overall: {
      totalJobs: 123,
      sourcesSucceeded: 10,
      sourcesFailed: 2,
    },
    ranAt: new Date("2026-07-11T21:23:50.154Z"),
  });
  AdminAudit.findOne = () => createQueryDouble({
    timestamp: new Date("2026-07-11T13:44:20.001Z"),
  });

  try {
    const res = createResponseDouble();

    await getScrapeStatus({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.sources.length, 2);
    assert.equal(res.body.summary.pipeline.status, "running");
    assert.equal(res.body.summary.pipeline.activeSources, 1);
    assert.equal(
      new Date(res.body.summary.pipeline.lastTriggeredAt).toISOString(),
      "2026-07-12T05:53:57.867Z",
    );
    assert.equal(
      new Date(res.body.summary.pipeline.lastCompletedAt).toISOString(),
      "2026-07-11T21:23:50.154Z",
    );
  } finally {
    ScraperStatus.find = originalFind;
    ScraperStatus.findOne = originalFindOne;
    ScraperStatus.bulkWrite = originalBulkWrite;
    Job.countDocuments = originalJobCountDocuments;
    ScraperRun.findOne = originalScraperRunFindOne;
    AdminAudit.findOne = originalAdminAuditFindOne;
    restoreReadyState();
  }
});

test("getScrapeStatus does not report running when completion is newer than the latest trigger", async () => {
  const restoreReadyState = setReadyState(1);
  const originalFind = ScraperStatus.find;
  const originalFindOne = ScraperStatus.findOne;
  const originalBulkWrite = ScraperStatus.bulkWrite;
  const originalJobCountDocuments = Job.countDocuments;
  const originalScraperRunFindOne = ScraperRun.findOne;
  const originalAdminAuditFindOne = AdminAudit.findOne;

  const createQueryDouble = (value) => ({
    sort() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => value,
  });

  ScraperStatus.find = () => ({
    lean() {
      return {
        exec: async () => [],
      };
    },
  });
  ScraperStatus.findOne = () => createQueryDouble({
    source: "__pipeline__",
    pipelineState: "running",
    lastTriggeredAt: new Date("2026-07-12T08:20:00.000Z"),
    lastCompletedAt: new Date("2026-07-12T08:21:00.000Z"),
  });
  ScraperStatus.bulkWrite = async () => {};

  Job.countDocuments = async () => 0;
  ScraperRun.findOne = () => createQueryDouble({
    overall: {
      totalJobs: 1192,
      sourcesSucceeded: 1188,
      sourcesFailed: 4,
    },
    ranAt: new Date("2026-07-12T08:21:00.000Z"),
  });
  AdminAudit.findOne = () => createQueryDouble({
    timestamp: new Date("2026-07-12T08:19:30.000Z"),
  });

  try {
    const res = createResponseDouble();

    await getScrapeStatus({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.summary.pipeline.status, "idle");
    assert.equal(
      new Date(res.body.summary.pipeline.lastTriggeredAt).toISOString(),
      "2026-07-12T08:20:00.000Z",
    );
    assert.equal(
      new Date(res.body.summary.pipeline.lastCompletedAt).toISOString(),
      "2026-07-12T08:21:00.000Z",
    );
  } finally {
    ScraperStatus.find = originalFind;
    ScraperStatus.findOne = originalFindOne;
    ScraperStatus.bulkWrite = originalBulkWrite;
    Job.countDocuments = originalJobCountDocuments;
    ScraperRun.findOne = originalScraperRunFindOne;
    AdminAudit.findOne = originalAdminAuditFindOne;
    restoreReadyState();
  }
});

test("getScrapeStatus treats a newer manual trigger as running even when the last stored pipeline state is error", async () => {
  const restoreReadyState = setReadyState(1);
  const originalFind = ScraperStatus.find;
  const originalFindOne = ScraperStatus.findOne;
  const originalBulkWrite = ScraperStatus.bulkWrite;
  const originalJobCountDocuments = Job.countDocuments;
  const originalScraperRunFindOne = ScraperRun.findOne;
  const originalAdminAuditFindOne = AdminAudit.findOne;

  const createQueryDouble = (value) => ({
    sort() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => value,
  });

  ScraperStatus.find = () => ({
    lean() {
      return {
        exec: async () => [],
      };
    },
  });
  ScraperStatus.findOne = () => createQueryDouble({
    source: "__pipeline__",
    pipelineState: "error",
    lastTriggeredAt: new Date("2026-07-12T06:16:58.986Z"),
    lastCompletedAt: new Date("2026-07-12T06:49:32.017Z"),
  });
  ScraperStatus.bulkWrite = async () => {};

  Job.countDocuments = async () => 0;
  ScraperRun.findOne = () => createQueryDouble({
    overall: {
      totalJobs: 1182,
      sourcesSucceeded: 10,
      sourcesFailed: 4,
    },
    ranAt: new Date("2026-07-12T06:49:32.017Z"),
  });
  AdminAudit.findOne = () => createQueryDouble({
    timestamp: new Date("2026-07-12T07:00:00.000Z"),
  });

  try {
    const res = createResponseDouble();

    await getScrapeStatus({}, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.summary.pipeline.status, "running");
    assert.equal(
      new Date(res.body.summary.pipeline.lastTriggeredAt).toISOString(),
      "2026-07-12T07:00:00.000Z",
    );
  } finally {
    ScraperStatus.find = originalFind;
    ScraperStatus.findOne = originalFindOne;
    ScraperStatus.bulkWrite = originalBulkWrite;
    Job.countDocuments = originalJobCountDocuments;
    ScraperRun.findOne = originalScraperRunFindOne;
    AdminAudit.findOne = originalAdminAuditFindOne;
    restoreReadyState();
  }
});

test("triggerScrapeAdmin marks the pipeline as running immediately after GitHub accepts the dispatch", async () => {
  const restoreReadyState = setReadyState(1);
  const originalFetch = global.fetch;
  const originalAdminAuditCreate = AdminAudit.create;
  const originalFindOneAndUpdate = ScraperStatus.findOneAndUpdate;
  const originalGithubPat = process.env.GITHUB_PAT;
  const originalGithubRepo = process.env.GITHUB_REPO;

  const pipelineWrites = [];
  const auditWrites = [];

  global.fetch = async () => ({
    ok: true,
    status: 204,
    text: async () => "",
  });
  ScraperStatus.findOneAndUpdate = async (filter, update) => {
    pipelineWrites.push({ filter, update });
    return {};
  };
  AdminAudit.create = async (payload) => {
    auditWrites.push(payload);
    return payload;
  };
  process.env.GITHUB_PAT = "test-pat";
  process.env.GITHUB_REPO = "owner/repo";

  try {
    const res = createResponseDouble();

    await triggerScrapeAdmin(
      {
        user: {
          _id: "admin-1",
          email: "admin@example.com",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 202);
    assert.equal(res.body.success, true);
    assert.equal(res.body.auditLogged, true);
    assert.equal(pipelineWrites.length, 1);
    assert.equal(pipelineWrites[0].filter.source, "__pipeline__");
    assert.equal(pipelineWrites[0].update.$set.pipelineState, "running");
    assert.equal(auditWrites.length, 1);
    assert.equal(auditWrites[0].action, "triggerScrapeAdmin");
  } finally {
    restoreReadyState();
    global.fetch = originalFetch;
    AdminAudit.create = originalAdminAuditCreate;
    ScraperStatus.findOneAndUpdate = originalFindOneAndUpdate;
    process.env.GITHUB_PAT = originalGithubPat;
    process.env.GITHUB_REPO = originalGithubRepo;
  }
});

test("triggerScrapeAdmin still succeeds when the audit log write fails after the dispatch", async () => {
  const restoreReadyState = setReadyState(1);
  const originalFetch = global.fetch;
  const originalAdminAuditCreate = AdminAudit.create;
  const originalFindOneAndUpdate = ScraperStatus.findOneAndUpdate;
  const originalGithubPat = process.env.GITHUB_PAT;
  const originalGithubRepo = process.env.GITHUB_REPO;

  global.fetch = async () => ({
    ok: true,
    status: 204,
    text: async () => "",
  });
  ScraperStatus.findOneAndUpdate = async () => ({});
  AdminAudit.create = async () => {
    throw new Error("Audit write failed");
  };
  process.env.GITHUB_PAT = "test-pat";
  process.env.GITHUB_REPO = "owner/repo";

  try {
    const res = createResponseDouble();

    await triggerScrapeAdmin(
      {
        user: {
          _id: "admin-1",
          email: "admin@example.com",
        },
      },
      res,
    );

    assert.equal(res.statusCode, 202);
    assert.equal(res.body.success, true);
    assert.equal(res.body.auditLogged, false);
    assert.equal(res.body.triggeredBy, "admin@example.com");
  } finally {
    restoreReadyState();
    global.fetch = originalFetch;
    AdminAudit.create = originalAdminAuditCreate;
    ScraperStatus.findOneAndUpdate = originalFindOneAndUpdate;
    process.env.GITHUB_PAT = originalGithubPat;
    process.env.GITHUB_REPO = originalGithubRepo;
  }
});
