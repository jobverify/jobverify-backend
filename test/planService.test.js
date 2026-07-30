import assert from "node:assert/strict";
import test from "node:test";

import PlanPurchase from "../src/models/PlanPurchase.js";
import ReferralRedemption from "../src/models/ReferralRedemption.js";
import User from "../src/models/User.js";
import ReferralCode from "../src/models/ReferralCode.js";
import {
  PLAN_CONFIG,
  PLAN_IDS,
} from "../src/constants/accessPlans.js";
import {
  activateWebhookPurchase,
  activatePlanForUser,
  createCheckout,
  extendOrStartPlan,
  verifyAndActivatePurchase,
} from "../src/services/planService.js";

test("extendOrStartPlan preserves remaining premium time before adding the new duration", () => {
  const now = new Date("2026-06-27T00:00:00.000Z");
  const currentExpiry = new Date("2026-07-10T00:00:00.000Z");

  const schedule = extendOrStartPlan({
    user: {
      premium: {
        status: "active",
        expiresAt: currentExpiry,
      },
    },
    planConfig: PLAN_CONFIG[PLAN_IDS.MONTHLY],
    now,
  });

  assert.equal(schedule.startsAt.toISOString(), currentExpiry.toISOString());
  assert.equal(schedule.expiresAt.toISOString(), "2026-08-10T00:00:00.000Z");
});

test("activatePlanForUser applies the monthly plan without WhatsApp access", async () => {
  const originalFindById = User.findById;
  const user = new User({
    email: "monthly@example.com",
    password: "hashed-password",
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  });
  user.save = async function saveDouble() {
    return this;
  };

  User.findById = async () => user;

  try {
    const updatedUser = await activatePlanForUser({
      userId: "user-1",
      planId: PLAN_IDS.MONTHLY,
      purchaseId: "purchase-1",
      source: "test",
      now: new Date("2026-06-27T00:00:00.000Z"),
    });

    assert.equal(updatedUser.accessRole, "monthly_premium_user");
    assert.equal(updatedUser.premium.planId, PLAN_IDS.MONTHLY);
    assert.equal(updatedUser.premium.status, "active");
    assert.equal(updatedUser.premium.whatsappAlertsEnabled, false);
  } finally {
    User.findById = originalFindById;
  }
});

test("activatePlanForUser enables WhatsApp alerts only for opted-in semester users with a phone number", async () => {
  const originalFindById = User.findById;
  const user = new User({
    email: "semester@example.com",
    password: "hashed-password",
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  });
  user.save = async function saveDouble() {
    return this;
  };

  User.findById = async () => user;

  try {
    const updatedUser = await activatePlanForUser({
      userId: "user-1",
      planId: PLAN_IDS.SEMESTER,
      purchaseId: "purchase-2",
      source: "test",
      now: new Date("2026-06-27T00:00:00.000Z"),
    });

    assert.equal(updatedUser.accessRole, "semester_premium_user");
    assert.equal(updatedUser.premium.planId, PLAN_IDS.SEMESTER);
    assert.equal(updatedUser.premium.whatsappAlertsEnabled, true);
    assert.equal(updatedUser.premium.expiresAt.toISOString(), "2026-10-27T00:00:00.000Z");
  } finally {
    User.findById = originalFindById;
  }
});

test("createCheckout rejects self-referral before creating a semester purchase", async () => {
  const originalFindOne = ReferralCode.findOne;
  ReferralCode.findOne = async () => ({
    owner: "user-1",
    code: "SELFTEST",
    status: "active",
    targetPlan: PLAN_IDS.SEMESTER,
  });

  try {
    await assert.rejects(
      () => createCheckout({
        user: { _id: "user-1", email: "student@example.com" },
        planId: PLAN_IDS.SEMESTER,
        referralCode: "SELFTEST",
      }),
      /cannot use your own referral code/i,
    );
  } finally {
    ReferralCode.findOne = originalFindOne;
  }
});

test("verifyAndActivatePurchase is idempotent for already paid purchases", async () => {
  const originalFindOne = PlanPurchase.findOne;
  const originalUserFindById = User.findById;
  const purchase = {
    _id: "purchase-10",
    user: "user-10",
    status: "paid",
  };
  const user = new User({
    email: "paid@example.com",
    password: "hashed-password",
    accessRole: "monthly_premium_user",
    premium: {
      planId: PLAN_IDS.MONTHLY,
      status: "active",
      expiresAt: new Date("2026-07-27T00:00:00.000Z"),
    },
  });

  PlanPurchase.findOne = async () => purchase;
  User.findById = async () => user;

  try {
    const result = await verifyAndActivatePurchase({
      purchaseId: "purchase-10",
      userId: "user-10",
    });

    assert.equal(result.idempotent, true);
    assert.equal(result.access.planId, PLAN_IDS.MONTHLY);
  } finally {
    PlanPurchase.findOne = originalFindOne;
    User.findById = originalUserFindById;
  }
});

test("verifyAndActivatePurchase rejects an order ID that belongs to a different purchase", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  PlanPurchase.findOne = async () => ({
    _id: "expensive-purchase",
    user: "buyer-1",
    providerOrderId: "order-expensive",
    status: "pending",
  });

  try {
    await assert.rejects(
      verifyAndActivatePurchase({
        purchaseId: "expensive-purchase",
        providerOrderId: "order-cheap",
        providerPaymentId: "payment-cheap",
        providerSignature: "signature-cheap",
        userId: "buyer-1",
      }),
      /order does not match/i,
    );
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
  }
});

test("activateWebhookPurchase counts three unique semester referrals and issues one free semester reward", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalPlanPurchaseCreate = PlanPurchase.create;
  const originalReferralCodeFindOne = ReferralCode.findOne;
  const originalReferralCodeUpdateOne = ReferralCode.updateOne;
  const originalReferralRedemptionFindOne = ReferralRedemption.findOne;
  const originalReferralRedemptionCreate = ReferralRedemption.create;
  const originalReferralRedemptionCountDocuments = ReferralRedemption.countDocuments;
  const originalUserFindById = User.findById;

  const rewardCreates = [];
  const createdRedemptions = [];
  const updatedReferralCodes = [];
  const buyerUser = new User({
    email: "buyer@example.com",
    password: "hashed-password",
    contact: {
      phoneE164: "+919999999999",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  });
  buyerUser.save = async function saveBuyer() {
    return this;
  };

  const referrerUser = new User({
    email: "referrer@example.com",
    password: "hashed-password",
    accessRole: "semester_premium_user",
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "active",
      expiresAt: new Date("2026-08-01T00:00:00.000Z"),
    },
    contact: {
      phoneE164: "+919999999998",
      whatsappOptInAt: new Date("2026-06-01T00:00:00.000Z"),
    },
  });
  referrerUser.save = async function saveReferrer() {
    return this;
  };

  const purchase = {
    _id: "purchase-20",
    user: "buyer-1",
    planId: PLAN_IDS.SEMESTER,
    provider: "mock",
    providerOrderId: "mock_order_purchase-20",
    providerPaymentId: null,
    providerSignature: null,
    status: "pending",
    referralCodeUsed: "JOBIFYABCD",
    referredBy: "referrer-1",
    async save() {
      return this;
    },
  };
  const referralCode = {
    _id: "referral-1",
    owner: "referrer-1",
    code: "JOBIFYABCD",
    status: "active",
    targetPlan: PLAN_IDS.SEMESTER,
    requiredConversions: 3,
  };

  PlanPurchase.findOne = async (query) => {
    if (query?.providerOrderId === "mock_order_purchase-20" || query?._id === "purchase-20") {
      return purchase;
    }
    if (query?.user === "referrer-1" && query?.status === "free_referral") {
      return null;
    }
    return null;
  };
  PlanPurchase.create = async (payload) => {
    rewardCreates.push(payload);
    return {
      _id: `reward-${rewardCreates.length}`,
      ...payload,
      async save() {
        return this;
      },
    };
  };
  ReferralCode.findOne = async () => referralCode;
  ReferralCode.updateOne = async (_filter, update) => {
    updatedReferralCodes.push(update);
    return { modifiedCount: 1 };
  };
  ReferralRedemption.findOne = async () => null;
  ReferralRedemption.create = async (payload) => {
    createdRedemptions.push(payload);
    return payload;
  };
  ReferralRedemption.countDocuments = async () => 3;
  User.findById = async (id) => (id === "buyer-1" ? buyerUser : referrerUser);

  try {
    const result = await activateWebhookPurchase({
      providerOrderId: "mock_order_purchase-20",
      providerPaymentId: "pay_20",
      now: new Date("2026-06-27T00:00:00.000Z"),
    });

    assert.equal(result.idempotent, false);
    assert.equal(purchase.status, "paid");
    assert.equal(createdRedemptions.length, 1);
    assert.equal(rewardCreates.length, 1);
    assert.equal(rewardCreates[0].amount, 0);
    assert.equal(rewardCreates[0].planId, PLAN_IDS.SEMESTER);
    assert.equal(updatedReferralCodes.length, 1);
    assert.equal(referrerUser.premium.expiresAt.toISOString(), "2026-12-01T00:00:00.000Z");
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    PlanPurchase.create = originalPlanPurchaseCreate;
    ReferralCode.findOne = originalReferralCodeFindOne;
    ReferralCode.updateOne = originalReferralCodeUpdateOne;
    ReferralRedemption.findOne = originalReferralRedemptionFindOne;
    ReferralRedemption.create = originalReferralRedemptionCreate;
    ReferralRedemption.countDocuments = originalReferralRedemptionCountDocuments;
    User.findById = originalUserFindById;
  }
});

test("activateWebhookPurchase does not count the same buyer twice for one referral code", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalReferralCodeFindOne = ReferralCode.findOne;
  const originalReferralRedemptionFindOne = ReferralRedemption.findOne;
  const originalReferralRedemptionCreate = ReferralRedemption.create;
  const originalUserFindById = User.findById;

  const purchase = {
    _id: "purchase-30",
    user: "buyer-2",
    planId: PLAN_IDS.SEMESTER,
    provider: "mock",
    providerOrderId: "mock_order_purchase-30",
    providerPaymentId: null,
    providerSignature: null,
    status: "pending",
    referralCodeUsed: "JOBIFYDUP",
    referredBy: "referrer-2",
    async save() {
      return this;
    },
  };

  const buyerUser = new User({
    email: "buyer2@example.com",
    password: "hashed-password",
  });
  buyerUser.save = async function saveBuyer() {
    return this;
  };

  PlanPurchase.findOne = async () => purchase;
  ReferralCode.findOne = async () => ({
    _id: "referral-2",
    owner: "referrer-2",
    code: "JOBIFYDUP",
    status: "active",
    targetPlan: PLAN_IDS.SEMESTER,
    requiredConversions: 3,
  });
  ReferralRedemption.findOne = async () => ({
    _id: "existing-redemption",
    referralCode: "referral-2",
    referredUser: "buyer-2",
    status: "counted",
  });
  ReferralRedemption.create = async () => {
    throw new Error("duplicate redemption should not be created");
  };
  User.findById = async () => buyerUser;

  try {
    const result = await activateWebhookPurchase({
      providerOrderId: "mock_order_purchase-30",
      providerPaymentId: "pay_30",
      now: new Date("2026-06-27T00:00:00.000Z"),
    });

    assert.equal(result.idempotent, false);
    assert.equal(purchase.status, "paid");
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    ReferralCode.findOne = originalReferralCodeFindOne;
    ReferralRedemption.findOne = originalReferralRedemptionFindOne;
    ReferralRedemption.create = originalReferralRedemptionCreate;
    User.findById = originalUserFindById;
  }
});
