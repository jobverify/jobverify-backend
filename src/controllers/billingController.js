/**
 * @file Controllers for premium plan pricing, checkout, payment verification, and referrals.
 * @module controllers/billingController
 */

import User from "../models/User.js";
import ReferralCode from "../models/ReferralCode.js";
import ReferralRedemption from "../models/ReferralRedemption.js";
import {
  activateWebhookPurchase,
  buildBillingSummary,
  createCheckout,
  getOrCreateReferralCodeForUser,
  listBillingPlans,
  verifyAndActivatePurchase,
} from "../services/planService.js";
import { getPaymentProvider } from "../services/paymentProvider.js";

export const getBillingPlans = async (_req, res) => {
  res.status(200).json({
    code: 200,
    success: true,
    data: listBillingPlans(),
  });
};

export const createPlanCheckout = async (req, res) => {
  try {
    const result = await createCheckout({
      user: req.user,
      planId: req.body.planId,
      referralCode: req.body.referralCode,
    });

    return res.status(201).json({
      code: 201,
      success: true,
      message: "Checkout created successfully.",
      data: {
        purchase: result.purchase,
        checkout: result.checkout,
      },
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: error.message,
    });
  }
};

export const verifyPlanCheckout = async (req, res) => {
  try {
    const result = await verifyAndActivatePurchase({
      purchaseId: req.body.purchaseId,
      providerOrderId: req.body.providerOrderId,
      providerPaymentId: req.body.providerPaymentId,
      providerSignature: req.body.providerSignature,
      userId: req.user._id,
    });

    return res.status(200).json({
      code: 200,
      success: true,
      message: result.idempotent
        ? "Purchase was already activated."
        : "Purchase verified and activated successfully.",
      data: {
        purchase: result.purchase,
        access: result.access,
        accessRole: result.user.accessRole,
      },
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: error.message,
    });
  }
};

export const handleBillingWebhook = async (req, res) => {
  try {
    const provider = getPaymentProvider();
    const signature = req.headers["x-razorpay-signature"];

    if (
      !provider.verifyWebhook({
        rawBody: req.rawBody,
        signature,
      })
    ) {
      return res.status(400).json({
        code: 400,
        success: false,
        message: "Webhook signature verification failed.",
      });
    }

    if (req.body?.event === "payment.captured") {
      const payload = req.body?.payload?.payment?.entity ?? {};
      await activateWebhookPurchase({
        providerOrderId: payload.order_id,
        providerPaymentId: payload.id,
      });
    }

    return res.status(200).json({
      code: 200,
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: error.message,
    });
  }
};

export const getMyBillingSummary = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      code: 404,
      success: false,
      message: "User not found.",
    });
  }

  const summary = await buildBillingSummary(user);
  return res.status(200).json({
    code: 200,
    success: true,
    data: summary,
  });
};

export const getMyReferralStatus = async (req, res) => {
  const referralCode = await ReferralCode.findOne({ owner: req.user._id }).lean().exec();
  if (!referralCode) {
    return res.status(200).json({
      code: 200,
      success: true,
      data: null,
    });
  }

  const progress = await ReferralRedemption.countDocuments({
    referralCode: referralCode._id,
    status: "counted",
  });

  return res.status(200).json({
    code: 200,
    success: true,
    data: {
      code: referralCode.code,
      status: referralCode.status,
      targetPlan: referralCode.targetPlan,
      progress,
      requiredConversions: referralCode.requiredConversions,
      rewardedAt: referralCode.rewardedAt,
    },
  });
};

export const createOrGetMyReferralCode = async (req, res) => {
  try {
    const referralCode = await getOrCreateReferralCodeForUser(req.user._id);
    const progress = await ReferralRedemption.countDocuments({
      referralCode: referralCode._id,
      status: "counted",
    });

    return res.status(201).json({
      code: 201,
      success: true,
      data: {
        code: referralCode.code,
        status: referralCode.status,
        targetPlan: referralCode.targetPlan,
        progress,
        requiredConversions: referralCode.requiredConversions,
      },
    });
  } catch (error) {
    return res.status(400).json({
      code: 400,
      success: false,
      message: error.message,
    });
  }
};
