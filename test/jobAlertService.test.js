import assert from "node:assert/strict";
import test from "node:test";

import JobAlertDelivery from "../src/models/JobAlertDelivery.js";
import User from "../src/models/User.js";
import {
  buildWhatsappMessageBody,
  jobMatchesUserPreferences,
  normalizePhoneE164,
  recoverQueuedJobAlerts,
  queueJobAlertsForJobs,
} from "../src/services/jobAlertService.js";

const claimAlways = async (filter, update) => ({
  _id: filter._id,
  channel: filter.channel ?? "whatsapp",
  status: "queued",
  ...update.$set,
});

const createClaimStore = (deliveries) => {
  const state = new Map(deliveries.map((delivery) => [String(delivery._id), { ...delivery }]));

  return async (filter, update) => {
    const delivery = state.get(String(filter._id));
    if (!delivery) {
      return null;
    }

    if (filter.status && delivery.status !== filter.status) {
      return null;
    }

    const claimable = !Array.isArray(filter.$or) || filter.$or.some((clause) => {
      if (clause.lastAttemptAt === null) {
        return (!clause.status || delivery.status === clause.status)
          && delivery.lastAttemptAt === null;
      }
      if (clause.lastAttemptAt?.$lte) {
        return (!clause.status || delivery.status === clause.status)
          && delivery.lastAttemptAt instanceof Date
          && delivery.lastAttemptAt <= clause.lastAttemptAt.$lte;
      }
      if (clause.status && clause.claimExpiresAt?.$lte) {
        return delivery.status === clause.status
          && delivery.claimExpiresAt instanceof Date
          && delivery.claimExpiresAt <= clause.claimExpiresAt.$lte;
      }
      if (clause.status) {
        return delivery.status === clause.status;
      }
      return false;
    });

    if (!claimable) {
      return null;
    }

    Object.assign(delivery, update.$set);
    return { ...delivery };
  };
};

test("buildWhatsappMessageBody includes title, company, location, summary, and direct link", () => {
  const body = buildWhatsappMessageBody([{
    title: "Frontend Intern",
    company: "Example Corp",
    city: "Bengaluru",
    summary: "Build React landing pages for the campus product.",
    jobUrl: "https://jobify.example/jobs/frontend-intern",
  }]);

  assert.match(body, /Frontend Intern/);
  assert.match(body, /Example Corp/);
  assert.match(body, /Bengaluru/);
  assert.match(body, /React landing pages/);
  assert.match(body, /https:\/\/jobify\.example\/jobs\/frontend-intern/);
});

test("buildWhatsappMessageBody uses persisted job description and apply URL fields", () => {
  const body = buildWhatsappMessageBody([{
    title: "Backend Intern",
    company: "Example Corp",
    location: "Pune, India",
    description: "Build API services for the campus product.",
    applyUrl: "https://jobify.example/jobs/backend-intern",
  }]);

  assert.match(body, /Build API services/);
  assert.match(body, /https:\/\/jobify\.example\/jobs\/backend-intern/);
});

test("queueJobAlertsForJobs records providerName and failure metadata without aborting later users", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const originalFetch = global.fetch;
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalEnabled = process.env.WHATSAPP_ENABLED;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalRetryCount = process.env.WHATSAPP_RETRY_COUNT;
  const updates = [];

  process.env.WHATSAPP_PROVIDER = "meta";
  process.env.WHATSAPP_ENABLED = "true";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  process.env.WHATSAPP_RETRY_COUNT = "0";
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Meta outage");
  };

  User.find = () => ({
    lean() {
      return this;
    },
    exec: async () => ["user-1", "user-2"].map((_id) => ({
      _id,
      accessRole: "semester_premium_user",
      premium: { status: "active", whatsappAlertsEnabled: true },
      contact: { phoneE164: "+919999999999", whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z") },
      profile: {
        whatsappAlertFilters: { jobType: ["Internship"], location: ["Bengaluru"] },
      },
    })),
  });
  JobAlertDelivery.create = async (payload) => ({ _id: `${payload.user}-${payload.job}`, ...payload });
  JobAlertDelivery.findOneAndUpdate = claimAlways;
  JobAlertDelivery.updateMany = async (_filter, update) => {
    updates.push(update);
    return { modifiedCount: 1 };
  };

  try {
    await queueJobAlertsForJobs([{
      _id: "job-1",
      title: "Frontend Intern",
      company: "Example Corp",
      city: "Bengaluru",
      jobType: "Intern",
    }]);

    assert.equal(updates.length, 2);
    assert.equal(updates.at(-1).$set.status, "failed");
    assert.equal(updates.at(-1).$set.providerName, "meta");
    assert.equal(typeof updates.at(-1).$set.attemptCount, "number");
    assert.match(updates.at(-1).$set.payloadPreview, /Frontend Intern/);
    assert.equal(fetchCalls, 2);
  } finally {
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
    global.fetch = originalFetch;
    process.env.WHATSAPP_PROVIDER = originalProvider;
    process.env.WHATSAPP_ENABLED = originalEnabled;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    process.env.WHATSAPP_RETRY_COUNT = originalRetryCount;
  }
});

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

test("queueJobAlertsForJobs skips opted-in users with no saved whatsappAlertFilters", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const createdPayloads = [];

  User.find = () => ({
    lean() {
      return this;
    },
    exec: async () => [{
      _id: "user-1",
      accessRole: "semester_premium_user",
      premium: { status: "active", whatsappAlertsEnabled: true },
      contact: { phoneE164: "+919999999999", whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z") },
      profile: {
        preferredJobTypes: ["Intern"],
        locationPreference: ["Bengaluru"],
        whatsappAlertFilters: {},
      },
    }],
  });
  JobAlertDelivery.create = async (payload) => {
    createdPayloads.push(payload);
    return { _id: "delivery-1", ...payload };
  };
  JobAlertDelivery.updateMany = async () => ({ modifiedCount: 1 });

  try {
    await queueJobAlertsForJobs([{
      _id: "job-1",
      title: "Frontend Intern",
      company: "Example",
      jobType: "Intern",
      city: "Bengaluru",
    }]);
    assert.equal(createdPayloads.length, 0);
  } finally {
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
  }
});

test("queueJobAlertsForJobs deduplicates WhatsApp deliveries per user and job", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
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
          whatsappAlertFilters: {
            jobType: ["Internship"],
            location: ["Bengaluru"],
          },
        },
      },
    ],
  });

  let createCount = 0;
  JobAlertDelivery.create = async (payload) => {
    createCount += 1;
    if (createCount === 1) {
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
  JobAlertDelivery.findOneAndUpdate = claimAlways;
  JobAlertDelivery.updateMany = async (_filter, update) => {
    updatedPayloads.push(update);
    return { modifiedCount: 1 };
  };

  try {
    await queueJobAlertsForJobs([
      {
        _id: "job-1",
        title: "Previously Delivered Intern",
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
        _id: "job-2",
        title: "Newly Queued Intern",
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
    assert.match(updatedPayloads[0].$set.payloadPreview, /Newly Queued Intern/);
    assert.doesNotMatch(updatedPayloads[0].$set.payloadPreview, /Previously Delivered Intern/);
  } finally {
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
  }
});

test("queueJobAlertsForJobs persists and sends every match in five-job batches", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const originalFetch = global.fetch;
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalEnabled = process.env.WHATSAPP_ENABLED;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const createdJobs = [];
  const sentBodies = [];

  process.env.WHATSAPP_PROVIDER = "meta";
  process.env.WHATSAPP_ENABLED = "true";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  global.fetch = async (_url, options) => {
    sentBodies.push(JSON.parse(options.body).text.body);
    return {
      ok: true,
      json: async () => ({ messages: [{ id: `message-${sentBodies.length}` }] }),
    };
  };
  User.find = () => ({
    lean() {
      return this;
    },
    exec: async () => [{
      _id: "user-1",
      accessRole: "semester_premium_user",
      premium: { status: "active", whatsappAlertsEnabled: true },
      contact: {
        phoneE164: "+919999999999",
        whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      profile: {
        whatsappAlertFilters: { jobType: ["Internship"] },
      },
    }],
  });
  JobAlertDelivery.create = async (payload) => {
    createdJobs.push(payload.job);
    return { _id: `delivery-${payload.job}`, ...payload };
  };
  JobAlertDelivery.findOneAndUpdate = claimAlways;
  JobAlertDelivery.updateMany = async () => ({ modifiedCount: 1 });

  try {
    const jobs = Array.from({ length: 6 }, (_, index) => ({
      _id: `job-${index + 1}`,
      title: `Intern ${index + 1}`,
      company: "Example",
      jobType: "Intern",
    }));

    await queueJobAlertsForJobs(jobs);

    assert.deepEqual(createdJobs, jobs.map((job) => job._id));
    assert.equal(sentBodies.length, 2);
    assert.match(sentBodies[0], /Intern 5/);
    assert.doesNotMatch(sentBodies[0], /Intern 6/);
    assert.match(sentBodies[1], /Intern 6/);
  } finally {
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
    global.fetch = originalFetch;
    process.env.WHATSAPP_PROVIDER = originalProvider;
    process.env.WHATSAPP_ENABLED = originalEnabled;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
  }
});

test("recoverQueuedJobAlerts sends persisted queued rows after an interrupted process", async () => {
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const updates = [];
  const user = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    profile: {
      whatsappAlertFilters: { jobType: ["Internship"] },
    },
  };
  JobAlertDelivery.find = (query = {}) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [{
      _id: "delivery-1",
      status: "queued",
      user,
      job: {
        _id: "job-1",
        title: "Recovered Intern",
        company: "Example",
        jobType: "Intern",
      },
    }],
  });
  JobAlertDelivery.findOneAndUpdate = claimAlways;
  JobAlertDelivery.updateMany = async (_filter, update) => {
    updates.push(update.$set);
    return { modifiedCount: 1 };
  };

  try {
    await recoverQueuedJobAlerts();

    assert.equal(updates.at(-1).status, "sent");
    assert.match(updates.at(-1).payloadPreview, /Recovered Intern/);
  } finally {
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
  }
});

test("recoverQueuedJobAlerts skips queued rows when the user no longer has saved filters", async () => {
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const updates = [];
  const user = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    profile: { whatsappAlertFilters: {} },
  };
  JobAlertDelivery.find = (query = {}) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [{
      _id: "delivery-1",
      status: "queued",
      user,
      job: {
        _id: "job-1",
        title: "Recovered Intern",
        company: "Example",
        city: "Bengaluru",
        jobType: "Intern",
      },
    }],
  });
  JobAlertDelivery.findOneAndUpdate = claimAlways;
  JobAlertDelivery.updateMany = async (_filter, update) => {
    updates.push(update.$set);
    return { modifiedCount: 1 };
  };

  try {
    await recoverQueuedJobAlerts();

    assert.equal(updates.at(-1).status, "skipped");
    assert.equal(updates.at(-1).reason, "filters_cleared");
  } finally {
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
  }
});

test("recoverQueuedJobAlerts skips queued rows that no longer match the user's current filters", async () => {
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const updates = [];
  const user = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    profile: { whatsappAlertFilters: { location: ["Mumbai"] } },
  };
  JobAlertDelivery.find = (query = {}) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [{
      _id: "delivery-1",
      status: "queued",
      user,
      job: {
        _id: "job-1",
        title: "Recovered Intern",
        company: "Example",
        city: "Bengaluru",
        location: "Bengaluru, India",
        jobType: "Intern",
      },
    }],
  });
  JobAlertDelivery.findOneAndUpdate = claimAlways;
  JobAlertDelivery.updateMany = async (_filter, update) => {
    updates.push(update.$set);
    return { modifiedCount: 1 };
  };

  try {
    await recoverQueuedJobAlerts();

    assert.equal(updates.at(-1).status, "skipped");
    assert.equal(updates.at(-1).reason, "filters_no_longer_match");
  } finally {
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
  }
});

test("recoverQueuedJobAlerts rechecks saved filters after claiming rows", async () => {
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const updates = [];
  let findCalls = 0;
  const staleUser = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    profile: { whatsappAlertFilters: { jobType: ["Internship"] } },
  };
  const clearedUser = {
    ...staleUser,
    profile: { whatsappAlertFilters: {} },
  };
  const job = {
    _id: "job-1",
    title: "Recovered Intern",
    company: "Example",
    city: "Bengaluru",
    location: "Bengaluru, India",
    jobType: "Intern",
  };

  JobAlertDelivery.find = (query = {}) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => {
      findCalls += 1;
      return [{
        _id: "delivery-1",
        status: findCalls === 1 ? "queued" : "processing",
        claimToken: findCalls === 1 ? null : "claim-1",
        user: findCalls === 1 ? staleUser : clearedUser,
        job,
      }];
    },
  });
  JobAlertDelivery.findOneAndUpdate = async (filter, update) => ({
    _id: filter._id,
    channel: "whatsapp",
    status: "processing",
    claimToken: update.$set.claimToken ?? "claim-1",
    claimExpiresAt: update.$set.claimExpiresAt ?? new Date("2026-07-29T12:05:00.000Z"),
  });
  JobAlertDelivery.updateMany = async (_filter, update) => {
    updates.push(update.$set);
    return { modifiedCount: 1 };
  };

  try {
    await recoverQueuedJobAlerts();

    assert.equal(updates.at(-1).status, "skipped");
    assert.equal(updates.at(-1).reason, "filters_cleared");
  } finally {
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
  }
});

test("recoverQueuedJobAlerts does not reclaim legacy queued claims by default", async () => {
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const originalFetch = global.fetch;
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalEnabled = process.env.WHATSAPP_ENABLED;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalLegacyReclaim = process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM;
  const originalDate = global.Date;
  const baseNow = Date.now();
  let fakeNow = baseNow + (6 * 60 * 1000);

  class FakeDate extends Date {
    constructor(value) {
      super(value ?? fakeNow);
    }

    static now() {
      return fakeNow;
    }
  }

  process.env.WHATSAPP_PROVIDER = "meta";
  process.env.WHATSAPP_ENABLED = "true";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  delete process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM;
  global.Date = FakeDate;

  const user = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date(baseNow),
    },
    profile: { whatsappAlertFilters: { jobType: ["Internship"] } },
  };
  const job = {
    _id: "job-1",
    title: "Recovered Intern",
    company: "Example",
    city: "Bengaluru",
    jobType: "Intern",
  };
  const legacyDelivery = {
    _id: "delivery-legacy-1",
    user,
    job,
    channel: "whatsapp",
    status: "queued",
    lastAttemptAt: new Date(baseNow),
    claimToken: null,
    claimExpiresAt: null,
  };

  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      json: async () => ({ messages: [{ id: `message-${fetchCalls}` }] }),
    };
  };

  JobAlertDelivery.find = (query = {}) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [legacyDelivery],
  });
  JobAlertDelivery.findOneAndUpdate = createClaimStore([legacyDelivery]);
  JobAlertDelivery.updateMany = async () => ({ modifiedCount: 1 });

  try {
    await recoverQueuedJobAlerts();

    assert.equal(fetchCalls, 0);
  } finally {
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
    global.fetch = originalFetch;
    global.Date = originalDate;
    process.env.WHATSAPP_PROVIDER = originalProvider;
    process.env.WHATSAPP_ENABLED = originalEnabled;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM = originalLegacyReclaim;
  }
});

test("recoverQueuedJobAlerts reclaims stale legacy queued claims only when explicitly enabled", async () => {
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const originalFetch = global.fetch;
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalEnabled = process.env.WHATSAPP_ENABLED;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalLegacyReclaim = process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM;
  const originalDate = global.Date;
  const baseNow = Date.now();
  let fakeNow = baseNow + (6 * 60 * 1000);

  class FakeDate extends Date {
    constructor(value) {
      super(value ?? fakeNow);
    }

    static now() {
      return fakeNow;
    }
  }

  process.env.WHATSAPP_PROVIDER = "meta";
  process.env.WHATSAPP_ENABLED = "true";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM = "true";
  global.Date = FakeDate;

  const user = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date(baseNow),
    },
    profile: { whatsappAlertFilters: { jobType: ["Internship"] } },
  };
  const job = {
    _id: "job-1",
    title: "Recovered Intern",
    company: "Example",
    city: "Bengaluru",
    jobType: "Intern",
  };
  const legacyDelivery = {
    _id: "delivery-legacy-1",
    user,
    job,
    channel: "whatsapp",
    status: "queued",
    lastAttemptAt: new Date(baseNow),
    claimToken: null,
    claimExpiresAt: null,
  };

  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    return {
      ok: true,
      json: async () => ({ messages: [{ id: `message-${fetchCalls}` }] }),
    };
  };

  JobAlertDelivery.find = (query = {}) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [legacyDelivery],
  });
  JobAlertDelivery.findOneAndUpdate = createClaimStore([legacyDelivery]);
  JobAlertDelivery.updateMany = async () => ({ modifiedCount: 1 });

  try {
    await recoverQueuedJobAlerts();

    assert.equal(fetchCalls, 1);
  } finally {
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
    global.fetch = originalFetch;
    global.Date = originalDate;
    process.env.WHATSAPP_PROVIDER = originalProvider;
    process.env.WHATSAPP_ENABLED = originalEnabled;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM = originalLegacyReclaim;
  }
});

test("queue and recovery do not both send the same queued delivery", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const originalFetch = global.fetch;
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalEnabled = process.env.WHATSAPP_ENABLED;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  process.env.WHATSAPP_PROVIDER = "meta";
  process.env.WHATSAPP_ENABLED = "true";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";

  const user = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    profile: { whatsappAlertFilters: { jobType: ["Internship"] } },
  };
  const job = {
    _id: "job-1",
    title: "Recovered Intern",
    company: "Example",
    city: "Bengaluru",
    jobType: "Intern",
  };
  const queuedDelivery = {
    _id: "delivery-1",
    user,
    job,
    channel: "whatsapp",
    status: "queued",
    lastAttemptAt: null,
  };

  let fetchCalls = 0;
  let resolveFirstFetch;
  let firstFetchStartedResolve;
  const firstFetchStarted = new Promise((resolve) => {
    firstFetchStartedResolve = resolve;
  });
  global.fetch = async (_url, options) => {
    fetchCalls += 1;
    const response = {
      ok: true,
      json: async () => ({ messages: [{ id: `message-${fetchCalls}` }] }),
    };

    if (fetchCalls === 1) {
      firstFetchStartedResolve(JSON.parse(options.body).text.body);
      await new Promise((resolve) => {
        resolveFirstFetch = resolve;
      });
    }

    return response;
  };

  User.find = () => ({
    lean() {
      return this;
    },
    exec: async () => [user],
  });
  JobAlertDelivery.create = async () => queuedDelivery;
  JobAlertDelivery.findOneAndUpdate = createClaimStore([queuedDelivery]);
  JobAlertDelivery.find = () => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => [queuedDelivery],
  });
  JobAlertDelivery.updateMany = async () => ({ modifiedCount: 1 });

  try {
    const queuePromise = queueJobAlertsForJobs([job]);
    await firstFetchStarted;
    await recoverQueuedJobAlerts();
    resolveFirstFetch();
    await queuePromise;

    assert.equal(fetchCalls, 1);
  } finally {
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
    global.fetch = originalFetch;
    process.env.WHATSAPP_PROVIDER = originalProvider;
    process.env.WHATSAPP_ENABLED = originalEnabled;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
  }
});

test("queueJobAlertsForJobs times out a stuck send before recovery can reclaim the row", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryFind = JobAlertDelivery.find;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const originalFetch = global.fetch;
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalEnabled = process.env.WHATSAPP_ENABLED;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalClaimTtl = process.env.WHATSAPP_CLAIM_TTL_MS;
  const originalSendTimeout = process.env.WHATSAPP_SEND_TIMEOUT_MS;
  const originalLegacyReclaim = process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM;
  const originalDate = global.Date;

  process.env.WHATSAPP_PROVIDER = "meta";
  process.env.WHATSAPP_ENABLED = "true";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  process.env.WHATSAPP_CLAIM_TTL_MS = "50";
  process.env.WHATSAPP_SEND_TIMEOUT_MS = "10";
  process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM = "false";

  const realNow = Date.now();
  let fakeNow = realNow;
  class FakeDate extends Date {
    constructor(value) {
      super(value ?? fakeNow);
    }

    static now() {
      return fakeNow;
    }
  }
  global.Date = FakeDate;

  const user = {
    _id: "user-1",
    accessRole: "semester_premium_user",
    premium: { status: "active", whatsappAlertsEnabled: true },
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
    profile: { whatsappAlertFilters: { jobType: ["Internship"] } },
  };
  const job = {
    _id: "job-1",
    title: "Recovered Intern",
    company: "Example",
    city: "Bengaluru",
    jobType: "Intern",
  };
  const deliveryState = {
    _id: "delivery-1",
    user,
    job,
    channel: "whatsapp",
    status: "queued",
    lastAttemptAt: null,
    claimToken: null,
    claimExpiresAt: null,
  };
  const snapshotDelivery = () => ({
    ...deliveryState,
    user,
    job,
  });
  const matchesLegacyOrClaimQuery = (query = {}) => {
    if (query._id?.$in && !query._id.$in.map(String).includes(String(deliveryState._id))) {
      return false;
    }
    if (query.status && deliveryState.status !== query.status) {
      return false;
    }
    if (query.claimToken && deliveryState.claimToken !== query.claimToken) {
      return false;
    }
    if (!Array.isArray(query.$or) || query.$or.length === 0) {
      return true;
    }

    return query.$or.some((clause) => {
      if (clause.lastAttemptAt === null) {
        return (!clause.status || deliveryState.status === clause.status)
          && deliveryState.lastAttemptAt === null;
      }
      if (clause.lastAttemptAt?.$lte) {
        return (!clause.status || deliveryState.status === clause.status)
          && deliveryState.lastAttemptAt instanceof Date
          && deliveryState.lastAttemptAt <= clause.lastAttemptAt.$lte;
      }
      if (clause.status && clause.claimExpiresAt?.$lte) {
        return deliveryState.status === clause.status
          && deliveryState.claimExpiresAt instanceof Date
          && deliveryState.claimExpiresAt <= clause.claimExpiresAt.$lte;
      }
      if (clause.status) {
        return deliveryState.status === clause.status;
      }
      return false;
    });
  };
  const canClaim = (filter) => {
    if (String(filter._id) !== String(deliveryState._id)) return false;
    if (filter.channel && filter.channel !== deliveryState.channel) return false;
    if (filter.status && filter.status !== deliveryState.status) return false;

    if (Array.isArray(filter.$or) && filter.$or.length > 0) {
      return filter.$or.some((clause) => {
        if (clause.lastAttemptAt === null) {
          return (!clause.status || deliveryState.status === clause.status)
            && deliveryState.lastAttemptAt === null;
        }
        if (clause.lastAttemptAt?.$lte) {
          return (!clause.status || deliveryState.status === clause.status)
            && deliveryState.lastAttemptAt instanceof Date
            && deliveryState.lastAttemptAt <= clause.lastAttemptAt.$lte;
        }
        if (clause.status && clause.claimExpiresAt?.$lte) {
          return deliveryState.status === clause.status
            && deliveryState.claimExpiresAt instanceof Date
            && deliveryState.claimExpiresAt <= clause.claimExpiresAt.$lte;
        }
        if (clause.status) {
          return deliveryState.status === clause.status;
        }
        return false;
      });
    }

    return true;
  };

  let fetchCalls = 0;
  let resolveFirstFetch = null;
  let firstFetchStartedResolve;
  const firstFetchStarted = new Promise((resolve) => {
    firstFetchStartedResolve = resolve;
  });
  global.fetch = async (_url, options = {}) => {
    fetchCalls += 1;
    if (fetchCalls === 1) {
      firstFetchStartedResolve();
      const signal = options.signal;
      await new Promise((resolve, reject) => {
        resolveFirstFetch = resolve;
        const handleAbort = () => {
          signal?.removeEventListener("abort", handleAbort);
          reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
        };
        if (signal?.aborted) {
          handleAbort();
          return;
        }
        signal?.addEventListener("abort", handleAbort, { once: true });
      });
    }

    return {
      ok: true,
      json: async () => ({ messages: [{ id: `message-${fetchCalls}` }] }),
    };
  };

  User.find = () => ({
    lean() {
      return this;
    },
    exec: async () => [user],
  });
  JobAlertDelivery.create = async () => snapshotDelivery();
  JobAlertDelivery.findOneAndUpdate = async (filter, update) => {
    if (!canClaim(filter)) {
      return null;
    }

    Object.assign(deliveryState, update.$set);
    return snapshotDelivery();
  };
  JobAlertDelivery.find = (query = {}) => ({
    sort() {
      return this;
    },
    limit() {
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      return this;
    },
    exec: async () => {
      if (matchesLegacyOrClaimQuery(query)) {
        return [snapshotDelivery()];
      }
      return [];
    },
  });
  JobAlertDelivery.updateMany = async (filter, update) => {
    const ids = filter._id?.$in?.map(String) ?? [];
    if (!ids.includes(String(deliveryState._id))) {
      return { modifiedCount: 0 };
    }
    if (filter.status && filter.status !== deliveryState.status) {
      return { modifiedCount: 0 };
    }
    if (filter.claimToken && filter.claimToken !== deliveryState.claimToken) {
      return { modifiedCount: 0 };
    }

    Object.assign(deliveryState, update.$set);
    return { modifiedCount: 1 };
  };

  try {
    const queuePromise = queueJobAlertsForJobs([job]);
    await firstFetchStarted;
    fakeNow += 6 * 60 * 1000;
    await new Promise((resolve) => setTimeout(resolve, 25));
    await recoverQueuedJobAlerts();
    if (resolveFirstFetch) {
      resolveFirstFetch();
    }
    await queuePromise.catch(() => null);

    assert.equal(fetchCalls, 1);
  } finally {
    if (resolveFirstFetch) {
      resolveFirstFetch();
    }
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.find = originalDeliveryFind;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
    global.fetch = originalFetch;
    global.Date = originalDate;
    process.env.WHATSAPP_PROVIDER = originalProvider;
    process.env.WHATSAPP_ENABLED = originalEnabled;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    process.env.WHATSAPP_CLAIM_TTL_MS = originalClaimTtl;
    process.env.WHATSAPP_SEND_TIMEOUT_MS = originalSendTimeout;
    process.env.WHATSAPP_ALLOW_LEGACY_QUEUE_RECLAIM = originalLegacyReclaim;
  }
});

test("invalid retry settings fail safe without additional provider attempts", async () => {
  const originalUserFind = User.find;
  const originalDeliveryCreate = JobAlertDelivery.create;
  const originalDeliveryFindOneAndUpdate = JobAlertDelivery.findOneAndUpdate;
  const originalDeliveryUpdateMany = JobAlertDelivery.updateMany;
  const originalFetch = global.fetch;
  const originalProvider = process.env.WHATSAPP_PROVIDER;
  const originalEnabled = process.env.WHATSAPP_ENABLED;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const originalPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const originalRetryCount = process.env.WHATSAPP_RETRY_COUNT;
  const originalRetryDelay = process.env.WHATSAPP_RETRY_DELAY_MS;
  let fetchCalls = 0;

  process.env.WHATSAPP_PROVIDER = "meta";
  process.env.WHATSAPP_ENABLED = "true";
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-number-id";
  process.env.WHATSAPP_RETRY_DELAY_MS = "not-a-number";
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Meta outage");
  };
  User.find = () => ({
    lean() {
      return this;
    },
    exec: async () => [{
      _id: "user-1",
      accessRole: "semester_premium_user",
      premium: { status: "active", whatsappAlertsEnabled: true },
      contact: {
        phoneE164: "+919999999999",
        whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      profile: {
        whatsappAlertFilters: { jobType: ["Internship"] },
      },
    }],
  });
  JobAlertDelivery.create = async (payload) => ({ _id: "delivery-1", ...payload });
  JobAlertDelivery.findOneAndUpdate = claimAlways;
  JobAlertDelivery.updateMany = async () => ({ modifiedCount: 1 });

  try {
    for (const retryCount of ["-1", "2oops"]) {
      process.env.WHATSAPP_RETRY_COUNT = retryCount;
      fetchCalls = 0;

      await queueJobAlertsForJobs([{
        _id: `job-${retryCount}`,
        title: "Frontend Intern",
        company: "Example",
        jobType: "Intern",
      }]);

      assert.equal(fetchCalls, 1, `retryCount=${retryCount}`);
    }
  } finally {
    User.find = originalUserFind;
    JobAlertDelivery.create = originalDeliveryCreate;
    JobAlertDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate;
    JobAlertDelivery.updateMany = originalDeliveryUpdateMany;
    global.fetch = originalFetch;
    process.env.WHATSAPP_PROVIDER = originalProvider;
    process.env.WHATSAPP_ENABLED = originalEnabled;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    process.env.WHATSAPP_PHONE_NUMBER_ID = originalPhoneNumberId;
    process.env.WHATSAPP_RETRY_COUNT = originalRetryCount;
    process.env.WHATSAPP_RETRY_DELAY_MS = originalRetryDelay;
  }
});
