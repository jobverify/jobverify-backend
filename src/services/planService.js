/**
 * @file Billing, activation, expiry, and referral workflows for access plans.
 * @module services/planService
 */

import crypto from "node:crypto";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import PlanPurchase from "../models/PlanPurchase.js";
import ReferralCode from "../models/ReferralCode.js";
import ReferralRedemption from "../models/ReferralRedemption.js";
import {
  ACCESS_ROLES,
  PLAN_CONFIG,
  PLAN_IDS,
  PREMIUM_PLAN_IDS,
} from "../constants/accessPlans.js";
import {
  applyExpiredAccessDowngrade,
  buildAccessSummary,
} from "../utils/accessControl.js";
import { getPaymentProvider } from "./paymentProvider.js";

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const normalizeReferralCode = (value) =>
  String(value || "").trim().toUpperCase();

const hasWhatsappOptIn = (user) =>
  Boolean(
    user?.contact?.phoneE164
    && user?.contact?.whatsappOptInAt
    && (
      !user?.contact?.whatsappOptOutAt
      || new Date(user.contact.whatsappOptInAt).getTime()
        > new Date(user.contact.whatsappOptOutAt).getTime()
    ),
  );

const createPublicPlanSummary = (plan) => ({
  id: plan.id,
  name: plan.name,
  priceInr: plan.priceInr,
  durationMonths: plan.durationMonths,
  accessRole: plan.accessRole,
  hasFilters: plan.hasFilters,
  hasAds: plan.hasAds,
  hasWhatsAppAlerts: plan.hasWhatsAppAlerts,
});

const assertPaidPlan = (planId) => {
  if (!PREMIUM_PLAN_IDS.includes(planId)) {
    throw new Error("Unsupported plan selected for checkout.");
  }
  return PLAN_CONFIG[planId];
};

const buildPurchaseSummary = (purchase) => ({
  id: purchase._id,
  planId: purchase.planId,
  accessRole: purchase.accessRole,
  amount: purchase.amount,
  currency: purchase.currency,
  status: purchase.status,
  provider: purchase.provider,
  providerOrderId: purchase.providerOrderId,
  providerPaymentId: purchase.providerPaymentId,
  referralCodeUsed: purchase.referralCodeUsed,
  startsAt: purchase.startsAt,
  expiresAt: purchase.expiresAt,
  createdAt: purchase.createdAt,
});

const generateReferralToken = () =>
  crypto.randomBytes(4).toString("hex").toUpperCase();

export const extendOrStartPlan = ({ user, planConfig, now = new Date() }) => {
  const currentExpiry = user?.premium?.expiresAt ? new Date(user.premium.expiresAt) : null;
  const baseStart =
    user?.premium?.status === "active"
    && currentExpiry
    && currentExpiry.getTime() > now.getTime()
      ? currentExpiry
      : now;

  return {
    startsAt: new Date(baseStart),
    expiresAt: addMonths(baseStart, planConfig.durationMonths),
  };
};

export const activatePlanForUser = async ({
  userId,
  planId,
  purchaseId = null,
  source = "purchase",
  now = new Date(),
}) => {
  const planConfig = assertPaidPlan(planId);
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found for plan activation.");
  }

  applyExpiredAccessDowngrade(user, now);
  const schedule = extendOrStartPlan({ user, planConfig, now });

  user.accessRole = planConfig.accessRole;
  user.premium.planId = planId;
  user.premium.status = "active";
  user.premium.startedAt = schedule.startsAt;
  user.premium.expiresAt = schedule.expiresAt;
  user.premium.lastPurchase = purchaseId;
  user.premium.whatsappAlertsEnabled =
    planConfig.hasWhatsAppAlerts && hasWhatsappOptIn(user);
  user.premium.activationSource = source;

  await user.save();
  return user;
};

export const getOrCreateReferralCodeForUser = async (userId) => {
  const existing = await ReferralCode.findOne({ owner: userId });
  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `JOBIFY${generateReferralToken()}`;
    try {
      return await ReferralCode.create({
        owner: userId,
        code,
      });
    } catch (error) {
      if (error?.code !== 11000) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique referral code right now.");
};

export const createCheckout = async ({ user, planId, referralCode }) => {
  const planConfig = assertPaidPlan(planId);
  const provider = getPaymentProvider();
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  let referralOwnerId = null;

  if (normalizedReferralCode) {
    if (planId !== PLAN_IDS.SEMESTER) {
      throw new Error("Referral codes are only valid for semester purchases.");
    }

    const referral = await ReferralCode.findOne({
      code: normalizedReferralCode,
      status: "active",
      targetPlan: PLAN_IDS.SEMESTER,
    });

    if (!referral) {
      throw new Error("Referral code is invalid or inactive.");
    }

    if (String(referral.owner) === String(user._id)) {
      throw new Error("You cannot use your own referral code.");
    }

    referralOwnerId = referral.owner;
  }

  const purchase = await PlanPurchase.create({
    user: user._id,
    planId,
    accessRole: planConfig.accessRole,
    amount: planConfig.priceInr,
    currency: "INR",
    status: "created",
    provider: provider.name,
    referralCodeUsed: normalizedReferralCode || null,
    referredBy: referralOwnerId,
  });

  const checkout = await provider.createCheckoutOrder({
    purchase,
    planConfig,
    user,
  });

  purchase.provider = checkout.provider;
  purchase.providerOrderId = checkout.providerOrderId;
  purchase.status = "pending";
  purchase.metadata = {
    ...(purchase.metadata || {}),
    checkout: checkout.checkout,
  };
  await purchase.save();

  return {
    purchase,
    checkout: checkout.checkout,
  };
};

const rewardReferralIfEligible = async ({ code, now = new Date() }) => {
  if (!code || code.status !== "active") {
    return null;
  }

  const countedRedemptions = await ReferralRedemption.countDocuments({
    referralCode: code._id,
    status: "counted",
  });

  if (countedRedemptions < code.requiredConversions) {
    return null;
  }

  const existingRewardPurchase = await PlanPurchase.findOne({
    user: code.owner,
    status: "free_referral",
    "metadata.referralCode": code.code,
  });
  if (existingRewardPurchase) {
    return existingRewardPurchase;
  }

  const rewardPurchase = await PlanPurchase.create({
    user: code.owner,
    planId: PLAN_IDS.SEMESTER,
    accessRole: ACCESS_ROLES.SEMESTER,
    amount: 0,
    currency: "INR",
    status: "free_referral",
    provider: "manual",
    metadata: {
      reason: "referral_reward",
      referralCode: code.code,
    },
  });

  const updatedUser = await activatePlanForUser({
    userId: code.owner,
    planId: PLAN_IDS.SEMESTER,
    purchaseId: rewardPurchase._id,
    source: "referral_reward",
    now,
  });

  rewardPurchase.startsAt = updatedUser.premium.startedAt;
  rewardPurchase.expiresAt = updatedUser.premium.expiresAt;
  await rewardPurchase.save();

  await ReferralCode.updateOne(
    {
      _id: code._id,
      status: "active",
      rewardPurchaseId: null,
    },
    {
      $set: {
        status: "rewarded",
        rewardedAt: now,
        rewardPurchaseId: rewardPurchase._id,
      },
    },
  );

  return rewardPurchase;
};

const recordReferralConversion = async ({ purchase, now = new Date() }) => {
  if (
    purchase.planId !== PLAN_IDS.SEMESTER
    || purchase.status !== "paid"
    || !purchase.referralCodeUsed
    || !purchase.referredBy
  ) {
    return null;
  }

  const code = await ReferralCode.findOne({
    code: purchase.referralCodeUsed,
    owner: purchase.referredBy,
    targetPlan: PLAN_IDS.SEMESTER,
  });

  if (!code || code.status !== "active") {
    return null;
  }

  if (String(code.owner) === String(purchase.user)) {
    throw new Error("Referral purchases cannot self-credit.");
  }

  const existingCounted = await ReferralRedemption.findOne({
    referralCode: code._id,
    referredUser: purchase.user,
    status: "counted",
  });
  if (existingCounted) {
    return { code, duplicate: true };
  }

  await ReferralRedemption.create({
    referralCode: code._id,
    referrer: code.owner,
    referredUser: purchase.user,
    purchase: purchase._id,
    planId: PLAN_IDS.SEMESTER,
    status: "counted",
    countedAt: now,
  });

  const rewardPurchase = await rewardReferralIfEligible({ code, now });
  return { code, rewardPurchase, duplicate: false };
};

const finalizeVerifiedPurchase = async ({
  purchase,
  providerPaymentId,
  providerSignature = null,
  source = "payment_verification",
  now = new Date(),
}) => {
  if (purchase.status === "paid" || purchase.status === "free_referral") {
    const existingUser = await User.findById(purchase.user);
    return {
      purchase,
      user: existingUser,
      access: buildAccessSummary(existingUser),
      idempotent: true,
    };
  }

  const updatedUser = await activatePlanForUser({
    userId: purchase.user,
    planId: purchase.planId,
    purchaseId: purchase._id,
    source,
    now,
  });

  purchase.status = "paid";
  purchase.providerPaymentId = providerPaymentId || purchase.providerPaymentId;
  if (providerSignature) {
    purchase.providerSignature = providerSignature;
  }
  purchase.startsAt = updatedUser.premium.startedAt;
  purchase.expiresAt = updatedUser.premium.expiresAt;
  await purchase.save();

  await recordReferralConversion({ purchase, now });

  return {
    purchase,
    user: updatedUser,
    access: buildAccessSummary(updatedUser),
    idempotent: false,
  };
};

export const verifyAndActivatePurchase = async ({
  purchaseId,
  providerOrderId,
  providerPaymentId,
  providerSignature,
  userId,
  now = new Date(),
}) => {
  const purchase = await PlanPurchase.findOne({
    $or: [
      ...(purchaseId ? [{ _id: purchaseId }] : []),
      ...(providerOrderId ? [{ providerOrderId }] : []),
    ],
  });

  if (!purchase) {
    throw new Error("Purchase not found.");
  }

  if (userId && String(purchase.user) !== String(userId)) {
    throw new Error("Purchase does not belong to this user.");
  }

  if (
    providerOrderId
    && String(purchase.providerOrderId) !== String(providerOrderId)
  ) {
    throw new Error("Payment order does not match this purchase.");
  }

  if (purchase.status === "paid" || purchase.status === "free_referral") {
    return finalizeVerifiedPurchase({
      purchase,
      providerPaymentId,
      providerSignature,
      source: "payment_verification",
      now,
    });
  }

  const provider = getPaymentProvider(purchase.provider);
  const verification = provider.verifyPayment({
    providerOrderId: providerOrderId || purchase.providerOrderId,
    providerPaymentId,
    providerSignature,
  });
  if (!verification.verified) {
    purchase.status = "failed";
    await purchase.save();
    throw new Error("Payment verification failed.");
  }

  return finalizeVerifiedPurchase({
    purchase,
    providerPaymentId,
    providerSignature,
    source: "payment_verification",
    now,
  });
};

export const activateWebhookPurchase = async ({
  providerOrderId,
  providerPaymentId,
  source = "payment_webhook",
  now = new Date(),
}) => {
  const purchase = await PlanPurchase.findOne({ providerOrderId });
  if (!purchase) {
    throw new Error("Purchase not found for webhook event.");
  }

  return finalizeVerifiedPurchase({
    purchase,
    providerPaymentId,
    source,
    now,
  });
};

export const downgradeExpiredPlans = async (now = new Date()) => {
  const users = await User.find({
    accessRole: { $ne: ACCESS_ROLES.FREE },
    "premium.expiresAt": { $lte: now },
  });

  let downgraded = 0;
  for (const user of users) {
    if (applyExpiredAccessDowngrade(user, now)) {
      await user.save();
      await Subscription.updateOne(
        { user: user._id },
        { $set: { isActive: false } },
      ).catch(() => null);
      downgraded += 1;
    }
  }

  return downgraded;
};

export const buildBillingSummary = async (user) => {
  const purchases = await PlanPurchase.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()
    .exec();

  const referralCode = await ReferralCode.findOne({ owner: user._id }).lean().exec();
  const referralCount = referralCode
    ? await ReferralRedemption.countDocuments({
      referralCode: referralCode._id,
      status: "counted",
    })
    : 0;

  return {
    access: buildAccessSummary(user),
    purchases: purchases.map(buildPurchaseSummary),
    referral: referralCode ? {
      code: referralCode.code,
      status: referralCode.status,
      progress: referralCount,
      requiredConversions: referralCode.requiredConversions,
      rewardedAt: referralCode.rewardedAt,
    } : null,
  };
};

export const listBillingPlans = () =>
  [PLAN_IDS.FREE, ...PREMIUM_PLAN_IDS].map((planId) =>
    createPublicPlanSummary(PLAN_CONFIG[planId]));
