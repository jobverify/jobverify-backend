import assert from "node:assert/strict";
import test from "node:test";

import User from "../src/models/User.js";
import {
  ACCESS_ROLES,
  PLAN_IDS,
} from "../src/constants/accessPlans.js";
import {
  applyExpiredAccessDowngrade,
  buildAccessSummary,
  canUsePremiumFilters,
  canUseTelegramAlerts,
  canUseWhatsappAlerts,
  getEffectiveAccess,
  shouldShowAds,
} from "../src/utils/accessControl.js";

test("User model defaults new accounts to the free access role", () => {
  const user = new User({
    email: "student@example.com",
    password: "hashed-password",
  });

  assert.equal(user.role, "user");
  assert.equal(user.accessRole, ACCESS_ROLES.FREE);
  assert.equal(user.premium.planId, PLAN_IDS.FREE);
  assert.equal(user.premium.status, "inactive");
  assert.equal(user.premium.whatsappAlertsEnabled, false);
});

test("getEffectiveAccess treats admins as premium without overwriting their stored access role", () => {
  const access = getEffectiveAccess({
    role: "admin",
    accessRole: ACCESS_ROLES.FREE,
    premium: {
      planId: PLAN_IDS.FREE,
      status: "inactive",
      expiresAt: null,
    },
  });

  assert.equal(access.isAdmin, true);
  assert.equal(access.accessRole, ACCESS_ROLES.FREE);
  assert.equal(access.planId, PLAN_IDS.FREE);
  assert.equal(access.isPremium, true);
  assert.equal(access.canUseFilters, true);
  assert.equal(access.shouldShowAds, false);
});

test("applyExpiredAccessDowngrade returns expired users to the free plan", () => {
  const user = new User({
    email: "expired@example.com",
    password: "hashed-password",
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "active",
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 60 * 1000),
      whatsappAlertsEnabled: true,
    },
  });

  const changed = applyExpiredAccessDowngrade(user);

  assert.equal(changed, true);
  assert.equal(user.accessRole, ACCESS_ROLES.FREE);
  assert.equal(user.premium.planId, PLAN_IDS.FREE);
  assert.equal(user.premium.status, "expired");
  assert.equal(user.premium.whatsappAlertsEnabled, false);
});

test("buildAccessSummary exposes premium capabilities and remaining time", () => {
  const expiresAt = new Date(Date.now() + 3.2 * 24 * 60 * 60 * 1000);
  const user = new User({
    email: "premium@example.com",
    password: "hashed-password",
    accessRole: ACCESS_ROLES.YEARLY,
    premium: {
      planId: PLAN_IDS.YEARLY,
      status: "active",
      startedAt: new Date(),
      expiresAt,
      whatsappAlertsEnabled: true,
    },
  });

  const summary = buildAccessSummary(user);

  assert.equal(summary.accessRole, ACCESS_ROLES.YEARLY);
  assert.equal(summary.planId, PLAN_IDS.YEARLY);
  assert.equal(summary.isPremium, true);
  assert.equal(summary.canUseFilters, true);
  assert.equal(summary.canSkipAds, true);
  assert.equal(summary.hasWhatsappAlerts, true);
  assert.equal(summary.expiresAt?.toISOString(), expiresAt.toISOString());
  assert.equal(summary.daysRemaining >= 3, true);
});

test("access capability helpers differentiate free and semester users", () => {
  const freeUser = new User({
    email: "free@example.com",
    password: "hashed-password",
  });
  const semesterUser = new User({
    email: "semester@example.com",
    password: "hashed-password",
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "active",
      expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      whatsappAlertsEnabled: true,
    },
  });

  assert.equal(canUsePremiumFilters(freeUser), false);
  assert.equal(shouldShowAds(freeUser), true);
  assert.equal(canUseWhatsappAlerts(freeUser), false);

  assert.equal(canUsePremiumFilters(semesterUser), true);
  assert.equal(shouldShowAds(semesterUser), false);
  assert.equal(canUseWhatsappAlerts(semesterUser), true);
});

test("canUseTelegramAlerts requires an active eligible plan and linked Telegram chat", () => {
  const activeLinkedUser = {
    accessRole: ACCESS_ROLES.SEMESTER,
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "active",
      telegramAlertsEnabled: true,
    },
    telegram: { chatId: "123", linkedAt: new Date("2026-08-01T00:00:00.000Z") },
  };

  assert.equal(canUseTelegramAlerts(activeLinkedUser), true);
  assert.equal(canUseTelegramAlerts({
    ...activeLinkedUser,
    premium: { ...activeLinkedUser.premium, status: "inactive" },
  }), false);
  assert.equal(canUseTelegramAlerts({
    ...activeLinkedUser,
    telegram: { chatId: "123", linkedAt: null },
  }), false);
});
