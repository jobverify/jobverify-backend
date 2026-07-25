import assert from "node:assert/strict";
import test from "node:test";

import User from "../src/models/User.js";
import {
  ACCESS_ROLES,
  PLAN_IDS,
} from "../src/constants/accessPlans.js";
import {
  buildAdminManagedAccessState,
} from "../src/utils/adminPlanAccess.js";

test("buildAdminManagedAccessState auto-calculates expiry for a newly assigned monthly plan", () => {
  const user = new User({
    email: "monthly-admin@example.com",
    password: "hashed-password",
  });

  const nextState = buildAdminManagedAccessState({
    user,
    accessRole: ACCESS_ROLES.MONTHLY,
    now: new Date("2026-07-01T00:00:00.000Z"),
  });

  assert.equal(nextState.accessRole, ACCESS_ROLES.MONTHLY);
  assert.equal(nextState.premium.planId, PLAN_IDS.MONTHLY);
  assert.equal(nextState.premium.status, "active");
  assert.equal(nextState.premium.startedAt.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(nextState.premium.expiresAt.toISOString(), "2026-08-01T00:00:00.000Z");
});

test("buildAdminManagedAccessState extends from the current active expiry when assigning a new premium plan", () => {
  const user = new User({
    email: "semester-admin@example.com",
    password: "hashed-password",
    accessRole: ACCESS_ROLES.MONTHLY,
    premium: {
      planId: PLAN_IDS.MONTHLY,
      status: "active",
      expiresAt: new Date("2026-07-15T00:00:00.000Z"),
    },
  });

  const nextState = buildAdminManagedAccessState({
    user,
    accessRole: ACCESS_ROLES.SEMESTER,
    now: new Date("2026-07-01T00:00:00.000Z"),
  });

  assert.equal(nextState.accessRole, ACCESS_ROLES.SEMESTER);
  assert.equal(nextState.premium.planId, PLAN_IDS.SEMESTER);
  assert.equal(nextState.premium.startedAt.toISOString(), "2026-07-15T00:00:00.000Z");
  assert.equal(nextState.premium.expiresAt.toISOString(), "2026-11-15T00:00:00.000Z");
});

test("buildAdminManagedAccessState keeps the auto-calculated start date but accepts a manual expiry override", () => {
  const user = new User({
    email: "override-admin@example.com",
    password: "hashed-password",
  });

  const nextState = buildAdminManagedAccessState({
    user,
    accessRole: ACCESS_ROLES.YEARLY,
    expiresAt: "2027-03-31T00:00:00.000Z",
    now: new Date("2026-07-01T00:00:00.000Z"),
  });

  assert.equal(nextState.accessRole, ACCESS_ROLES.YEARLY);
  assert.equal(nextState.premium.planId, PLAN_IDS.YEARLY);
  assert.equal(nextState.premium.startedAt.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(nextState.premium.expiresAt.toISOString(), "2027-03-31T00:00:00.000Z");
});

test("buildAdminManagedAccessState enables WhatsApp alerts for opted-in users on WhatsApp-eligible plans", () => {
  const user = new User({
    email: "whatsapp-admin@example.com",
    password: "hashed-password",
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  });

  const nextState = buildAdminManagedAccessState({
    user,
    accessRole: ACCESS_ROLES.SEMESTER,
    now: new Date("2026-07-01T00:00:00.000Z"),
  });

  assert.equal(nextState.premium.whatsappAlertsEnabled, true);
});

test("buildAdminManagedAccessState clears premium metadata when the admin switches a user back to the free plan", () => {
  const user = new User({
    email: "free-admin@example.com",
    password: "hashed-password",
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "active",
      startedAt: new Date("2026-07-01T00:00:00.000Z"),
      expiresAt: new Date("2026-11-01T00:00:00.000Z"),
      whatsappAlertsEnabled: true,
    },
  });

  const nextState = buildAdminManagedAccessState({
    user,
    accessRole: ACCESS_ROLES.FREE,
    now: new Date("2026-07-01T00:00:00.000Z"),
  });

  assert.equal(nextState.accessRole, ACCESS_ROLES.FREE);
  assert.equal(nextState.premium.planId, PLAN_IDS.FREE);
  assert.equal(nextState.premium.status, "inactive");
  assert.equal(nextState.premium.startedAt, null);
  assert.equal(nextState.premium.expiresAt, null);
  assert.equal(nextState.premium.whatsappAlertsEnabled, false);
});
