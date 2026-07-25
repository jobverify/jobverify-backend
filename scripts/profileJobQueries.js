import { performance } from "node:perf_hooks";
import mongoose from "mongoose";

import connectDB from "../db/db.js";
import Job from "../src/models/Job.js";
import {
  JOB_CARD_PAGE_LIMIT,
  JOB_LIST_CARD_PROJECTION,
  buildJobListFilters,
  buildJobMetaFilter,
  buildRecommendationPipeline,
  resolveJobListSortOption,
} from "../src/controllers/jobController.js";

const getFlag = (name, fallback = null) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const getIntegerFlag = (name, fallback) => {
  const value = Number.parseInt(String(getFlag(name, "")), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const percentile = (values, fraction) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return Number(sorted[index].toFixed(2));
};

const buildDatePostedCutoff = (days) => {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
};

const collectValues = (node, predicate, values = []) => {
  if (!node || typeof node !== "object") return values;

  if (predicate(node)) {
    values.push(node);
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((item) => collectValues(item, predicate, values));
    } else {
      collectValues(value, predicate, values);
    }
  }

  return values;
};

const summarizeExplain = (explain) => {
  const executionStats = collectValues(
    explain,
    (node) => node.executionStats && typeof node.executionStats === "object",
  )
    .map((node) => node.executionStats)
    .find((stats) => (
      stats.totalDocsExamined != null
      || stats.totalKeysExamined != null
      || stats.executionTimeMillis != null
    ));

  const winningPlan = collectValues(
    explain,
    (node) => node.winningPlan && typeof node.winningPlan === "object",
  )[0]?.winningPlan;
  const planStages = collectValues(
    winningPlan,
    (node) => typeof node.stage === "string",
  ).map((node) => node.stage);
  const indexNames = [...new Set(
    collectValues(winningPlan, (node) => typeof node.indexName === "string")
      .map((node) => node.indexName),
  )];

  return {
    executionTimeMillis: executionStats?.executionTimeMillis ?? null,
    nReturned: executionStats?.nReturned ?? null,
    totalDocsExamined: executionStats?.totalDocsExamined ?? null,
    totalKeysExamined: executionStats?.totalKeysExamined ?? null,
    planStages,
    indexNames,
  };
};

const measure = async (run, repeat) => {
  const timings = [];
  let lastResult = null;

  for (let index = 0; index < repeat; index += 1) {
    const startedAt = performance.now();
    lastResult = await run();
    timings.push(performance.now() - startedAt);
  }

  const rowsReturned = Array.isArray(lastResult) ? lastResult.length : lastResult;
  return {
    timingsMs: {
      p50: percentile(timings, 0.5),
      p95: percentile(timings, 0.95),
      p99: percentile(timings, 0.99),
      max: Number(Math.max(...timings).toFixed(2)),
    },
    rowsReturned,
    payloadBytes: Buffer.byteLength(JSON.stringify(lastResult ?? null)),
  };
};

const buildFindQuery = (queryParams) => {
  const filters = buildJobListFilters(queryParams);

  return Job.find(filters)
    .select(JOB_LIST_CARD_PROJECTION)
    .sort(resolveJobListSortOption({
      sort: queryParams.sort,
      hasTextSearch: Boolean(filters.$text),
    }))
    .skip(0)
    .limit(JOB_CARD_PAGE_LIMIT)
    .lean();
};

const buildCases = () => {
  const shared = {
    query: getFlag("query", "developer"),
    company: getFlag("company", "Google"),
    city: getFlag("city", "Bangalore"),
    jobType: getFlag("job-type", "Intern"),
    experienceYear: getFlag("experience-year", "3"),
    roleDomain: getFlag("role-domain", "Software Engineering"),
    workArrangement: getFlag("work-arrangement", "Remote"),
    datePostedDays: getFlag("date-posted-days", "30"),
    limit: String(JOB_CARD_PAGE_LIMIT),
  };
  const recommendedProfile = {
    branch: getFlag("profile-branch", "CSE"),
    passingYear: Number.parseInt(getFlag("profile-passing-year", "2027"), 10),
    preferredJobTypes: [shared.jobType],
    locationPreference: [shared.city],
  };

  return [
    {
      name: "jobs.latest.unfiltered",
      kind: "find",
      query: { limit: shared.limit, sort: "latest" },
    },
    {
      name: "jobs.text",
      kind: "find",
      query: { query: shared.query, limit: shared.limit },
    },
    {
      name: "jobs.company_city",
      kind: "find",
      query: {
        company: shared.company,
        city: shared.city,
        limit: shared.limit,
        sort: "latest",
      },
    },
    {
      name: "jobs.all_filters",
      kind: "find",
      query: { ...shared, sort: "latest" },
    },
    {
      name: "jobs.recommended",
      kind: "aggregate",
      query: {
        city: shared.city,
        jobType: shared.jobType,
        limit: shared.limit,
        sort: "recommended",
      },
      profile: recommendedProfile,
    },
    {
      name: "meta.company.scoped",
      kind: "distinct",
      field: "company",
      excludedKeys: ["company"],
      query: { ...shared, sort: undefined },
    },
    {
      name: "meta.experienceYears.scoped",
      kind: "distinct",
      field: "experienceYears",
      excludedKeys: ["experienceYear", "experienceBucket"],
      query: { ...shared, sort: undefined },
    },
    {
      name: "meta.datePosted.7d",
      kind: "count",
      query: { ...shared, sort: undefined },
      excludedKeys: ["datePostedDays"],
      extraFilters: { postedAt: { $gte: buildDatePostedCutoff(7) } },
    },
  ];
};

const profileCase = async (testCase, repeat) => {
  if (testCase.kind === "find") {
    const explain = await buildFindQuery(testCase.query).explain("executionStats");
    const timing = await measure(() => buildFindQuery(testCase.query).exec(), repeat);
    return { explain: summarizeExplain(explain), timing };
  }

  if (testCase.kind === "aggregate") {
    const filters = buildJobListFilters(testCase.query);
    const pipeline = buildRecommendationPipeline(
      filters,
      testCase.profile,
      { skip: 0, limit: JOB_CARD_PAGE_LIMIT },
    );
    const explain = await mongoose.connection.db.command({
      explain: {
        aggregate: Job.collection.name,
        pipeline,
        cursor: {},
      },
      verbosity: "executionStats",
    });
    const timing = await measure(() => Job.aggregate(pipeline).exec(), repeat);
    return { explain: summarizeExplain(explain), timing };
  }

  if (testCase.kind === "distinct") {
    const filter = buildJobMetaFilter(testCase.query, testCase.excludedKeys);
    const explain = await mongoose.connection.db.command({
      explain: {
        distinct: Job.collection.name,
        key: testCase.field,
        query: filter,
      },
      verbosity: "executionStats",
    });
    const timing = await measure(() => Job.distinct(testCase.field, filter), repeat);
    return { explain: summarizeExplain(explain), timing };
  }

  if (testCase.kind === "count") {
    const filter = buildJobMetaFilter(
      testCase.query,
      testCase.excludedKeys,
      testCase.extraFilters,
    );
    const explain = await mongoose.connection.db.command({
      explain: {
        count: Job.collection.name,
        query: filter,
      },
      verbosity: "executionStats",
    });
    const timing = await measure(() => Job.countDocuments(filter), repeat);
    return { explain: summarizeExplain(explain), timing };
  }

  throw new Error(`Unsupported profile case kind: ${testCase.kind}`);
};

const main = async () => {
  const repeat = getIntegerFlag("repeat", 5);
  await connectDB();

  try {
    const cases = [];

    for (const testCase of buildCases()) {
      try {
        cases.push({
          name: testCase.name,
          kind: testCase.kind,
          query: testCase.query,
          ...(await profileCase(testCase, repeat)),
        });
      } catch (error) {
        cases.push({
          name: testCase.name,
          kind: testCase.kind,
          query: testCase.query,
          error: error.message,
        });
      }
    }

    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(),
      repeat,
      collection: Job.collection.name,
      pageLimit: JOB_CARD_PAGE_LIMIT,
      note: "Run against the same dataset before and after query/index changes; compare docs examined, keys examined, p95 timing, and payload bytes.",
      cases,
    }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error("Job query profiling failed:", error);
  process.exitCode = 1;
});
