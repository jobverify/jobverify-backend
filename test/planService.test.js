import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import PlanPurchase from "../src/models/PlanPurchase.js";
import ReferralRedemption from "../src/models/ReferralRedemption.js";
import Subscription from "../src/models/Subscription.js";
import User from "../src/models/User.js";
import ReferralCode from "../src/models/ReferralCode.js";
import {
  PLAN_CONFIG,
  PLAN_IDS,
} from "../src/constants/accessPlans.js";
import {
  activateWebhookPurchase,
  activatePlanForUser,
  BillingRequestError,
  cancelActivePlan,
  createCheckout,
  extendOrStartPlan,
  verifyAndActivatePurchase,
} from "../src/services/planService.js";

let originalPlanPurchaseTransaction;

test.beforeEach(() => {
  originalPlanPurchaseTransaction = PlanPurchase.db.transaction;
  PlanPurchase.db.transaction = async (work) => work(null);
});

test.afterEach(() => {
  PlanPurchase.db.transaction = originalPlanPurchaseTransaction;
});

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
      (error) => error instanceof BillingRequestError
        && /cannot use your own referral code/i.test(error.message),
    );
  } finally {
    ReferralCode.findOne = originalFindOne;
  }
});

test("cancelActivePlan immediately removes paid access and disables the user's subscription", async () => {
  const originalFindById = User.findById;
  const originalSubscriptionUpdateOne = Subscription.updateOne;
  const user = new User({
    email: "cancelled-semester@example.com",
    password: "hashed-password",
    accessRole: "semester_premium_user",
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "active",
      startedAt: new Date("2026-06-01T00:00:00.000Z"),
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      lastPurchase: "507f1f77bcf86cd799439011",
      whatsappAlertsEnabled: true,
    },
  });
  const subscription = { user: user._id, isActive: true };
  user.save = async function saveDouble() {
    return this;
  };
  User.findById = async () => user;
  Subscription.updateOne = async (filter, update) => {
    if (String(filter.user) === String(subscription.user)) {
      subscription.isActive = update.$set.isActive;
    }
    return { modifiedCount: 1 };
  };

  try {
    const result = await cancelActivePlan({ userId: user._id });

    assert.equal(result.user.accessRole, "free_user");
    assert.equal(result.user.premium.planId, "free");
    assert.equal(result.user.premium.status, "cancelled");
    assert.equal(result.user.premium.startedAt, null);
    assert.equal(result.user.premium.expiresAt, null);
    assert.equal(result.user.premium.lastPurchase, null);
    assert.equal(result.user.premium.whatsappAlertsEnabled, false);
    assert.equal(subscription.isActive, false);
    assert.equal(result.access.planId, "free");
  } finally {
    User.findById = originalFindById;
    Subscription.updateOne = originalSubscriptionUpdateOne;
  }
});

test("cancelActivePlan rejects a free or inactive user", async () => {
  const originalFindById = User.findById;
  const user = new User({
    email: "free-user@example.com",
    password: "hashed-password",
    accessRole: "semester_premium_user",
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "cancelled",
    },
  });
  User.findById = async () => user;

  try {
    await assert.rejects(
      cancelActivePlan({ userId: user._id }),
      (error) => error.statusCode === 400
        && error.message === "No active paid plan to cancel.",
    );
  } finally {
    User.findById = originalFindById;
  }
});

test("cancelActivePlan rolls back the user downgrade when subscription deactivation fails", async () => {
  const originalFindById = User.findById;
  const originalSubscriptionUpdateOne = Subscription.updateOne;
  const originalTransaction = PlanPurchase.db.transaction;
  const userId = "507f1f77bcf86cd799439011";
  let persistedUser = new User({
    _id: userId,
    email: "rollback-cancellation@example.com",
    password: "hashed-password",
    accessRole: "semester_premium_user",
    premium: {
      planId: PLAN_IDS.SEMESTER,
      status: "active",
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      whatsappAlertsEnabled: true,
    },
  }).toObject();
  let transactionUser;

  User.findById = () => {
    let session;
    return {
      session(value) {
        session = value;
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          const user = new User(session ? transactionUser : persistedUser);
          user.save = async function saveUser(options = {}) {
            if (options.session === session && session) {
              transactionUser = this.toObject();
            } else {
              persistedUser = this.toObject();
            }
            return this;
          };
          return user;
        }).then(resolve, reject);
      },
    };
  };
  PlanPurchase.db.transaction = async (work) => {
    const session = { id: "cancellation-session" };
    transactionUser = new User(persistedUser).toObject();
    const result = await work(session);
    persistedUser = transactionUser;
    return result;
  };
  Subscription.updateOne = async () => {
    throw new Error("subscription write failed");
  };

  try {
    await assert.rejects(
      cancelActivePlan({ userId }),
      /subscription write failed/i,
    );

    assert.equal(persistedUser.accessRole, "semester_premium_user");
    assert.equal(persistedUser.premium.planId, PLAN_IDS.SEMESTER);
    assert.equal(persistedUser.premium.status, "active");
    assert.equal(persistedUser.premium.whatsappAlertsEnabled, true);
  } finally {
    User.findById = originalFindById;
    Subscription.updateOne = originalSubscriptionUpdateOne;
    PlanPurchase.db.transaction = originalTransaction;
  }
});

test("createCheckout marks unsupported plans as client request failures", async () => {
  await assert.rejects(
    () => createCheckout({
      user: { _id: "user-1", email: "student@example.com" },
      planId: "unsupported-plan",
    }),
    (error) => error instanceof BillingRequestError
      && /unsupported plan/i.test(error.message),
  );
});

test("createCheckout marks referral plan restrictions as client request failures", async () => {
  await assert.rejects(
    () => createCheckout({
      user: { _id: "user-1", email: "student@example.com" },
      planId: PLAN_IDS.MONTHLY,
      referralCode: "SEMESTERONLY",
    }),
    (error) => error instanceof BillingRequestError
      && /only valid for semester purchases/i.test(error.message),
  );
});

test("createCheckout marks unknown referral codes as client request failures", async () => {
  const originalFindOne = ReferralCode.findOne;
  ReferralCode.findOne = async () => null;

  try {
    await assert.rejects(
      () => createCheckout({
        user: { _id: "user-1", email: "student@example.com" },
        planId: PLAN_IDS.SEMESTER,
        referralCode: "UNKNOWN",
      }),
      (error) => error instanceof BillingRequestError
        && /invalid or inactive/i.test(error.message),
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
      now: new Date("2026-07-01T00:00:00.000Z"),
    });

    assert.equal(result.idempotent, true);
    assert.equal(result.access.planId, PLAN_IDS.MONTHLY);
  } finally {
    PlanPurchase.findOne = originalFindOne;
    User.findById = originalUserFindById;
  }
});

test("verifyAndActivatePurchase rejects an unknown supplied purchase ID even when the order is valid", async () => {
  const originalFindOne = PlanPurchase.findOne;
  const originalUserFindById = User.findById;
  const purchase = {
    _id: "purchase-owned-order",
    user: "user-owned-order",
    providerOrderId: "order-owned-order",
    status: "paid",
  };
  const user = new User({
    email: "owned-order@example.com",
    password: "hashed-password",
  });
  let userLookups = 0;

  PlanPurchase.findOne = async (query) => {
    if (query?._id === "purchase-owned-order") {
      return purchase;
    }
    if (
      query?.$or?.some(
        (condition) => condition.providerOrderId === "order-owned-order",
      )
    ) {
      return purchase;
    }
    return null;
  };
  User.findById = async () => {
    userLookups += 1;
    return user;
  };

  try {
    await assert.rejects(
      verifyAndActivatePurchase({
        purchaseId: "purchase-does-not-exist",
        providerOrderId: purchase.providerOrderId,
        userId: purchase.user,
      }),
      (error) => error.statusCode === 400 && /purchase not found/i.test(error.message),
    );
    assert.equal(userLookups, 0);
  } finally {
    PlanPurchase.findOne = originalFindOne;
    User.findById = originalUserFindById;
  }
});

test("racing browser and webhook activation extends a paid purchase exactly once", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalTransaction = PlanPurchase.db.transaction;
  const originalUserFindById = User.findById;
  const originalAllowMockPayments = process.env.ALLOW_MOCK_PAYMENTS;
  const now = new Date("2026-06-27T00:00:00.000Z");
  let persistedPurchase = {
    _id: "purchase-race-1",
    user: "buyer-race-1",
    planId: PLAN_IDS.MONTHLY,
    provider: "mock",
    providerOrderId: "mock_order_purchase-race-1",
    providerPaymentId: null,
    providerSignature: null,
    status: "pending",
    startsAt: null,
    expiresAt: null,
  };
  let persistedUser = new User({
    _id: "buyer-race-1",
    email: "race@example.com",
    password: "hashed-password",
  });
  let purchaseSaveCount = 0;
  let secondInitialRead;
  let releaseFirstPurchaseSave;
  const secondInitialReadStarted = new Promise((resolve) => {
    secondInitialRead = resolve;
  });
  const firstPurchaseSaveBlocked = new Promise((resolve) => {
    releaseFirstPurchaseSave = resolve;
  });
  let initialReadCount = 0;

  const purchaseSnapshot = () => ({
    ...persistedPurchase,
    async save() {
      purchaseSaveCount += 1;
      if (purchaseSaveCount === 1) {
        await firstPurchaseSaveBlocked;
      }
      persistedPurchase = {
        ...persistedPurchase,
        status: this.status,
        providerPaymentId: this.providerPaymentId,
        providerSignature: this.providerSignature,
        startsAt: this.startsAt,
        expiresAt: this.expiresAt,
      };
      return this;
    },
  });

  PlanPurchase.findOne = (query) => {
    let sessionBound = false;
    const result = Promise.resolve().then(() => {
      const isInitialRead = !sessionBound;
      if (isInitialRead) {
        initialReadCount += 1;
        if (initialReadCount === 2) {
          secondInitialRead();
        }
      }
      return purchaseSnapshot();
    });
    result.session = () => {
      sessionBound = true;
      return result;
    };
    return result;
  };

  let transactionTail = Promise.resolve();
  PlanPurchase.db.transaction = async (work) => {
    const previousTransaction = transactionTail;
    let finishTransaction;
    transactionTail = new Promise((resolve) => {
      finishTransaction = resolve;
    });
    await previousTransaction;
    try {
      return await work({});
    } finally {
      finishTransaction();
    }
  };

  User.findById = () => {
    const result = Promise.resolve().then(() => {
      const user = new User(persistedUser.toObject());
      user.save = async function saveUserSnapshot() {
        persistedUser = this;
        return this;
      };
      return user;
    });
    result.session = () => result;
    return result;
  };
  process.env.ALLOW_MOCK_PAYMENTS = "true";

  try {
    const browserActivation = verifyAndActivatePurchase({
      purchaseId: persistedPurchase._id,
      providerOrderId: persistedPurchase.providerOrderId,
      providerPaymentId: "pay_race_1",
      providerSignature: "mock_signature",
      userId: persistedPurchase.user,
      now,
    });

    while (purchaseSaveCount === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const webhookActivation = activateWebhookPurchase({
      providerOrderId: persistedPurchase.providerOrderId,
      providerPaymentId: "pay_race_1",
      now,
    });
    await secondInitialReadStarted;
    releaseFirstPurchaseSave();

    const results = await Promise.all([browserActivation, webhookActivation]);

    assert.equal(
      persistedUser.premium.expiresAt.toISOString(),
      "2026-07-27T00:00:00.000Z",
    );
    assert.deepEqual(
      results.map((result) => result.idempotent).sort(),
      [false, true],
    );
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    PlanPurchase.db.transaction = originalTransaction;
    User.findById = originalUserFindById;
    if (originalAllowMockPayments === undefined) {
      delete process.env.ALLOW_MOCK_PAYMENTS;
    } else {
      process.env.ALLOW_MOCK_PAYMENTS = originalAllowMockPayments;
    }
  }
});

test("an invalid browser signature cannot overwrite a concurrent webhook activation", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalUserFindById = User.findById;
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const now = new Date("2026-06-27T00:00:00.000Z");
  let persistedPurchase = {
    _id: "purchase-invalid-signature-race-1",
    user: "buyer-invalid-signature-race-1",
    planId: PLAN_IDS.MONTHLY,
    provider: "razorpay",
    providerOrderId: "order_invalid_signature_race_1",
    providerPaymentId: null,
    providerSignature: null,
    status: "pending",
    startsAt: null,
    expiresAt: null,
  };
  let persistedUser = new User({
    _id: persistedPurchase.user,
    email: "invalid-signature-race@example.com",
    password: "hashed-password",
  }).toObject();
  let browserReadStarted;
  const browserReadObserved = new Promise((resolve) => {
    browserReadStarted = resolve;
  });
  let webhookCommitted;
  const webhookCommitObserved = new Promise((resolve) => {
    webhookCommitted = resolve;
  });

  const purchaseSnapshot = () => ({
    ...persistedPurchase,
    async save() {
      if (this.status === "failed") {
        await webhookCommitObserved;
      }
      persistedPurchase = {
        ...persistedPurchase,
        status: this.status,
        providerPaymentId: this.providerPaymentId,
        providerSignature: this.providerSignature,
        startsAt: this.startsAt,
        expiresAt: this.expiresAt,
      };
      if (this.status === "paid") {
        webhookCommitted();
      }
      return this;
    },
  });

  PlanPurchase.findOne = async (query) => {
    if (query?._id === persistedPurchase._id) {
      browserReadStarted();
    }
    return purchaseSnapshot();
  };
  User.findById = async () => {
    const user = new User(persistedUser);
    user.save = async function saveUserSnapshot() {
      persistedUser = this.toObject();
      return this;
    };
    return user;
  };
  process.env.RAZORPAY_KEY_SECRET = "plan-service-race-test-secret";

  try {
    const browserActivation = verifyAndActivatePurchase({
      purchaseId: persistedPurchase._id,
      providerOrderId: persistedPurchase.providerOrderId,
      providerPaymentId: "pay_invalid_signature_race_1",
      providerSignature: "0".repeat(64),
      userId: persistedPurchase.user,
      now,
    });
    await browserReadObserved;

    const webhookActivation = activateWebhookPurchase({
      providerOrderId: persistedPurchase.providerOrderId,
      providerPaymentId: "pay_invalid_signature_race_1",
      now,
    });
    const [browserResult, webhookResult] = await Promise.allSettled([
      browserActivation,
      webhookActivation,
    ]);

    assert.equal(browserResult.status, "rejected");
    assert.match(browserResult.reason.message, /verification failed/i);
    assert.equal(webhookResult.status, "fulfilled");
    assert.equal(persistedPurchase.status, "paid");
    assert.equal(
      new Date(persistedUser.premium.expiresAt).toISOString(),
      "2026-07-27T00:00:00.000Z",
    );
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    User.findById = originalUserFindById;
    if (originalKeySecret === undefined) {
      delete process.env.RAZORPAY_KEY_SECRET;
    } else {
      process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
    }
  }
});

test("transaction retry rolls back a partial activation and preserves session binding", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalTransaction = PlanPurchase.db.transaction;
  const originalUserFindById = User.findById;
  const originalAllowMockPayments = process.env.ALLOW_MOCK_PAYMENTS;
  const now = new Date("2026-06-27T00:00:00.000Z");
  let persistedPurchase = {
    _id: "purchase-transaction-retry-1",
    user: "buyer-transaction-retry-1",
    planId: PLAN_IDS.MONTHLY,
    provider: "mock",
    providerOrderId: "mock_order_purchase-transaction-retry-1",
    providerPaymentId: null,
    providerSignature: null,
    status: "pending",
    startsAt: null,
    expiresAt: null,
  };
  let persistedUser = new User({
    email: "transaction-retry@example.com",
    password: "hashed-password",
  }).toObject();
  const sessions = [];
  const purchaseQuerySessions = [];
  const userQuerySessions = [];
  const purchaseSaveSessions = [];
  const userSaveSessions = [];
  let transactionAttempts = 0;
  let transactionState = null;

  const createSessionQuery = ({ onSession, resolveValue }) => {
    let boundSession = null;
    return {
      session(session) {
        boundSession = session;
        onSession(session);
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve()
          .then(() => resolveValue(boundSession))
          .then(resolve, reject);
      },
    };
  };

  const createPurchaseDocument = () => ({
    ...transactionState.purchase,
    async save(options = {}) {
      purchaseSaveSessions.push(options.session);
      if (transactionAttempts === 1) {
        const transientError = new Error("simulated transient write conflict");
        transientError.errorLabels = ["TransientTransactionError"];
        throw transientError;
      }
      transactionState.purchase = {
        ...transactionState.purchase,
        status: this.status,
        providerPaymentId: this.providerPaymentId,
        providerSignature: this.providerSignature,
        startsAt: this.startsAt,
        expiresAt: this.expiresAt,
      };
      return this;
    },
  });

  PlanPurchase.findOne = (query) => {
    let boundSession = null;
    return {
      session(session) {
        boundSession = session;
        purchaseQuerySessions.push(session);
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve()
          .then(() => (
            boundSession ? createPurchaseDocument() : { ...persistedPurchase }
          ))
          .then(resolve, reject);
      },
    };
  };

  User.findById = () => createSessionQuery({
    onSession: (session) => userQuerySessions.push(session),
    resolveValue: () => {
      const user = new User(transactionState.user);
      user.save = async function saveTransactionalUser(options = {}) {
        userSaveSessions.push(options.session);
        transactionState.user = this.toObject();
        return this;
      };
      return user;
    },
  });

  PlanPurchase.db.transaction = async (work) => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      transactionAttempts = attempt;
      const session = { id: `transaction-session-${attempt}` };
      sessions.push(session);
      transactionState = {
        purchase: { ...persistedPurchase },
        user: new User(persistedUser).toObject(),
      };
      try {
        const result = await work(session);
        persistedPurchase = { ...transactionState.purchase };
        persistedUser = new User(transactionState.user).toObject();
        return result;
      } catch (error) {
        if (
          attempt === 1
          && error?.errorLabels?.includes("TransientTransactionError")
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("transaction retry was not committed");
  };
  process.env.ALLOW_MOCK_PAYMENTS = "true";

  try {
    const result = await verifyAndActivatePurchase({
      purchaseId: persistedPurchase._id,
      providerOrderId: persistedPurchase.providerOrderId,
      providerPaymentId: "pay_transaction_retry_1",
      providerSignature: "mock_signature",
      userId: persistedPurchase.user,
      now,
    });

    assert.equal(transactionAttempts, 2);
    assert.equal(result.idempotent, false);
    assert.equal(persistedPurchase.status, "paid");
    assert.equal(
      new Date(persistedUser.premium.expiresAt).toISOString(),
      "2026-07-27T00:00:00.000Z",
    );
    assert.equal(purchaseQuerySessions.length, 2);
    assert.equal(userQuerySessions.length, 2);
    assert.equal(purchaseSaveSessions.length, 2);
    assert.equal(userSaveSessions.length, 2);
    for (let attempt = 0; attempt < sessions.length; attempt += 1) {
      assert.equal(purchaseQuerySessions[attempt], sessions[attempt]);
      assert.equal(userQuerySessions[attempt], sessions[attempt]);
      assert.equal(purchaseSaveSessions[attempt], sessions[attempt]);
      assert.equal(userSaveSessions[attempt], sessions[attempt]);
    }
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    PlanPurchase.db.transaction = originalTransaction;
    User.findById = originalUserFindById;
    if (originalAllowMockPayments === undefined) {
      delete process.env.ALLOW_MOCK_PAYMENTS;
    } else {
      process.env.ALLOW_MOCK_PAYMENTS = originalAllowMockPayments;
    }
  }
});

test("activation fails closed when MongoDB transactions are unsupported", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalTransaction = PlanPurchase.db.transaction;
  const originalUserFindById = User.findById;
  const purchase = {
    _id: "purchase-unsupported-transaction-1",
    user: "buyer-unsupported-transaction-1",
    planId: PLAN_IDS.MONTHLY,
    provider: "mock",
    providerOrderId: "mock_order_purchase-unsupported-transaction-1",
    providerPaymentId: null,
    providerSignature: null,
    status: "pending",
    startsAt: null,
    expiresAt: null,
  };
  const user = new User({
    email: "unsupported-transaction@example.com",
    password: "hashed-password",
  });
  let userLookups = 0;
  let userSaves = 0;
  let purchaseSaves = 0;

  purchase.save = async function savePurchase() {
    purchaseSaves += 1;
    return this;
  };
  user.save = async function saveUser() {
    userSaves += 1;
    return this;
  };
  PlanPurchase.findOne = async () => purchase;
  User.findById = async () => {
    userLookups += 1;
    return user;
  };
  PlanPurchase.db.transaction = async () => {
    throw new Error("MongoDB transactions are unsupported by this deployment.");
  };

  try {
    await assert.rejects(
      activateWebhookPurchase({
        providerOrderId: purchase.providerOrderId,
        providerPaymentId: "pay_unsupported_transaction_1",
        now: new Date("2026-06-27T00:00:00.000Z"),
      }),
      /transactions are unsupported/i,
    );

    assert.equal(purchase.status, "pending");
    assert.equal(purchase.providerPaymentId, null);
    assert.equal(purchase.startsAt, null);
    assert.equal(purchase.expiresAt, null);
    assert.equal(user.accessRole, "free_user");
    assert.equal(user.premium.status, "inactive");
    assert.equal(userLookups, 0);
    assert.equal(userSaves, 0);
    assert.equal(purchaseSaves, 0);
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    PlanPurchase.db.transaction = originalTransaction;
    User.findById = originalUserFindById;
  }
});

test("verifyAndActivatePurchase rejects an order ID that belongs to a different purchase", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalUserFindById = User.findById;
  let activationLookups = 0;
  let purchaseSaves = 0;
  const purchase = {
    _id: "expensive-purchase",
    user: "buyer-1",
    providerOrderId: "order-expensive",
    status: "pending",
    async save() {
      purchaseSaves += 1;
      return this;
    },
  };
  PlanPurchase.findOne = async () => purchase;
  User.findById = async () => {
    activationLookups += 1;
    return null;
  };

  try {
    await assert.rejects(
      verifyAndActivatePurchase({
        purchaseId: "expensive-purchase",
        providerOrderId: "order-cheap",
        providerPaymentId: "payment-cheap",
        providerSignature: "signature-cheap",
        userId: "buyer-1",
      }),
      (error) => error.statusCode === 400
        && /order does not match/i.test(error.message),
    );
    assert.equal(activationLookups, 0);
    assert.equal(purchaseSaves, 0);
    assert.equal(purchase.status, "pending");
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    User.findById = originalUserFindById;
  }
});

test("verifyAndActivatePurchase verifies Razorpay signatures against the persisted order ID", async () => {
  const originalPlanPurchaseFindOne = PlanPurchase.findOne;
  const originalUserFindById = User.findById;
  const originalCreateHmac = crypto.createHmac;
  const originalTimingSafeEqual = crypto.timingSafeEqual;
  const persistedOrderId = "order_server_created";
  const providerPaymentId = "pay_checkout_123";
  const providerSignature = crypto
    .createHmac("sha256", "plan-service-test-secret")
    .update(`${persistedOrderId}|${providerPaymentId}`)
    .digest("hex");
  const hmacInputs = [];
  const purchase = {
    _id: "purchase-razorpay-1",
    user: "buyer-razorpay-1",
    planId: PLAN_IDS.MONTHLY,
    provider: "razorpay",
    providerOrderId: persistedOrderId,
    status: "pending",
    async save() {
      return this;
    },
  };
  const user = new User({
    email: "razorpay-buyer@example.com",
    password: "hashed-password",
  });
  user.save = async function saveDouble() {
    return this;
  };

  PlanPurchase.findOne = async () => purchase;
  User.findById = async () => user;
  crypto.createHmac = (...args) => {
    const hmac = originalCreateHmac(...args);
    const originalUpdate = hmac.update.bind(hmac);
    hmac.update = (input, ...updateArgs) => {
      hmacInputs.push(String(input));
      return originalUpdate(input, ...updateArgs);
    };
    return hmac;
  };
  crypto.timingSafeEqual = (expected, received) => {
    return originalTimingSafeEqual(expected, received);
  };
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = "plan-service-test-secret";

  try {
    const result = await verifyAndActivatePurchase({
      purchaseId: purchase._id,
      providerOrderId: persistedOrderId,
      providerPaymentId,
      providerSignature,
      userId: purchase.user,
      now: new Date("2026-06-27T00:00:00.000Z"),
    });

    assert.equal(result.idempotent, false);
    assert.equal(purchase.status, "paid");
    assert.deepEqual(hmacInputs, [`${persistedOrderId}|${providerPaymentId}`]);
  } finally {
    PlanPurchase.findOne = originalPlanPurchaseFindOne;
    User.findById = originalUserFindById;
    crypto.createHmac = originalCreateHmac;
    crypto.timingSafeEqual = originalTimingSafeEqual;
    if (originalKeySecret === undefined) {
      delete process.env.RAZORPAY_KEY_SECRET;
    } else {
      process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
    }
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
    referralCodeUsed: "JOBVERIFYABCD",
    referredBy: "referrer-1",
    async save() {
      return this;
    },
  };
  const referralCode = {
    _id: "referral-1",
    owner: "referrer-1",
    code: "JOBVERIFYABCD",
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
    referralCodeUsed: "JOBVERIFYDUP",
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
    code: "JOBVERIFYDUP",
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
