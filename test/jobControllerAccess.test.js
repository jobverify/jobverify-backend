import assert from "node:assert/strict";
import test from "node:test";

import Job from "../src/models/Job.js";
import { ACCESS_ROLES, PLAN_IDS } from "../src/constants/accessPlans.js";
import { getAllJobs, getJobMeta } from "../src/controllers/jobController.js";

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

const collectExperienceYearsFilters = (node) => {
  if (!node || typeof node !== "object" || node instanceof RegExp) return [];

  const matches = [];
  if (Array.isArray(node.experienceYears?.$in)) {
    matches.push(node.experienceYears.$in);
  }

  for (const key of ["$and", "$or"]) {
    if (Array.isArray(node[key])) {
      for (const child of node[key]) {
        matches.push(...collectExperienceYearsFilters(child));
      }
    }
  }

  return matches;
};

test("free users cannot send premium job filter parameters", async () => {
  const res = createResponseDouble();

  await getAllJobs(
    {
      query: { company: "Google" },
      user: {
        role: "user",
        accessRole: ACCESS_ROLES.FREE,
        premium: {
          planId: PLAN_IDS.FREE,
          status: "inactive",
        },
      },
    },
    res,
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.premiumRequired, true);
  assert.equal(res.body.feature, "job_filters");
});

test("free users cannot send the experience year premium filter", async () => {
  const res = createResponseDouble();

  await getAllJobs(
    {
      query: { experienceYear: "2" },
      user: {
        role: "user",
        accessRole: ACCESS_ROLES.FREE,
        premium: {
          planId: PLAN_IDS.FREE,
          status: "inactive",
        },
      },
    },
    res,
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.premiumRequired, true);
  assert.equal(res.body.feature, "job_filters");
});

test("free users cannot send the advanced enrichment filters", async () => {
  const res = createResponseDouble();

  await getAllJobs(
    {
      query: {
        skills: "python,aws",
        roleDomain: "Data Science & AI",
        workArrangement: "Remote",
      },
      user: {
        role: "user",
        accessRole: ACCESS_ROLES.FREE,
        premium: {
          planId: PLAN_IDS.FREE,
          status: "inactive",
        },
      },
    },
    res,
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.premiumRequired, true);
  assert.equal(res.body.feature, "job_filters");
});

test("free users cannot request scoped job metadata", async () => {
  const res = createResponseDouble();

  await getJobMeta(
    {
      query: { city: "Bangalore" },
      user: {
        role: "user",
        accessRole: ACCESS_ROLES.FREE,
        premium: {
          planId: PLAN_IDS.FREE,
          status: "inactive",
        },
      },
    },
    res,
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.premiumRequired, true);
  assert.equal(res.body.feature, "job_filters");
});

test("unauthenticated users cannot unlock premium sorting through direct API access", async () => {
  const res = createResponseDouble();

  await getAllJobs(
    {
      query: { sort: "recommended" },
      user: null,
    },
    res,
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.premiumRequired, true);
});

test("free users can request larger job pages up to the public 100-card limit", async () => {
  const originalCountDocuments = Job.countDocuments;
  const originalDistinct = Job.distinct;
  const originalFind = Job.find;
  let capturedLimit = null;

  Job.countDocuments = async () => 24;
  Job.distinct = async () => ["Example Corp"];
  Job.find = () => ({
    select() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit(value) {
      capturedLimit = value;
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [],
  });

  try {
    const res = createResponseDouble();

    await getAllJobs(
      {
        query: { page: "1", limit: "50" },
        user: {
          role: "user",
          accessRole: ACCESS_ROLES.FREE,
          premium: {
            planId: PLAN_IDS.FREE,
            status: "inactive",
          },
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(capturedLimit, 50);
    assert.equal(res.body.pagination.limit, 50);
  } finally {
    Job.countDocuments = originalCountDocuments;
    Job.distinct = originalDistinct;
    Job.find = originalFind;
  }
});

test("premium users can keep using existing filters while requesting larger job pages", async () => {
  const originalCountDocuments = Job.countDocuments;
  const originalDistinct = Job.distinct;
  const originalFind = Job.find;
  let capturedFilter = null;
  let capturedLimit = null;

  Job.countDocuments = async () => 4;
  Job.distinct = async () => ["Google", "YouTube"];
  Job.find = (filter) => {
    capturedFilter = filter;
    return {
      select() {
        return this;
      },
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit(value) {
        capturedLimit = value;
        return this;
      },
      lean() {
        return this;
      },
      exec: async () => [],
    };
  };

  try {
    const res = createResponseDouble();

    await getAllJobs(
      {
        query: { company: "Google", limit: "40" },
        user: {
          role: "user",
          accessRole: ACCESS_ROLES.MONTHLY,
          premium: {
            planId: PLAN_IDS.MONTHLY,
            status: "active",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(capturedLimit, 40);
    assert.equal(res.body.pagination.limit, 40);
    assert.equal(res.body.pagination.totalCompanies, 2);
    assert.equal(
      capturedFilter?.$and?.some(
        (entry) => entry.companyKey === "google",
      ),
      true,
    );
  } finally {
    Job.countDocuments = originalCountDocuments;
    Job.distinct = originalDistinct;
    Job.find = originalFind;
  }
});

test("experience year filtering stays in the Mongo query before pagination", async () => {
  const originalCountDocuments = Job.countDocuments;
  const originalDistinct = Job.distinct;
  const originalFind = Job.find;
  let capturedFilter = null;
  let capturedLimit = null;

  Job.countDocuments = async () => 1;
  Job.distinct = async () => ["Example Corp"];
  Job.find = (filter) => {
    capturedFilter = filter;
    return {
      select() {
        return this;
      },
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit(value) {
        capturedLimit = value;
        return this;
      },
      lean() {
        return this;
      },
      exec: async () => [
        {
          title: "Platform Engineer",
          company: "Example Corp",
          experienceYears: [3, 4, 5],
        },
      ],
    };
  };

  try {
    const res = createResponseDouble();

    await getAllJobs(
      {
        query: { experienceYear: "3", limit: "12" },
        user: {
          role: "user",
          accessRole: ACCESS_ROLES.MONTHLY,
          premium: {
            planId: PLAN_IDS.MONTHLY,
            status: "active",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(capturedLimit, 12);
    assert.equal(
      collectExperienceYearsFilters(capturedFilter)
        .some((years) => years.includes(3)),
      true,
    );
  } finally {
    Job.countDocuments = originalCountDocuments;
    Job.distinct = originalDistinct;
    Job.find = originalFind;
  }
});

test("job list queries select only fields needed for cards", async () => {
  const originalCountDocuments = Job.countDocuments;
  const originalDistinct = Job.distinct;
  const originalFind = Job.find;
  let capturedProjection = null;

  Job.countDocuments = async () => 1;
  Job.distinct = async () => ["Example Corp"];
  Job.find = () => ({
    select(projection) {
      capturedProjection = projection;
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [
      {
        _id: "job-1",
        title: "Frontend Intern",
        company: "Example Corp",
      },
    ],
  });

  try {
    const res = createResponseDouble();

    await getAllJobs(
      {
        query: {},
        user: {
          role: "user",
          accessRole: ACCESS_ROLES.MONTHLY,
          premium: {
            planId: PLAN_IDS.MONTHLY,
            status: "active",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
      },
      res,
    );

    assert.equal(res.statusCode, 200);
    assert.match(capturedProjection, /\btitle\b/);
    assert.match(capturedProjection, /\bcompany\b/);
    assert.match(capturedProjection, /\bjobSkills\b/);
    assert.doesNotMatch(capturedProjection, /\bdescription\b/);
    assert.doesNotMatch(capturedProjection, /\bminimumQualification\b/);
    assert.doesNotMatch(capturedProjection, /\bpreferredQualification\b/);
  } finally {
    Job.countDocuments = originalCountDocuments;
    Job.distinct = originalDistinct;
    Job.find = originalFind;
  }
});
