/**
 * @file Controllers for premium plan pricing, checkout, payment verification, and referrals.
 * @module controllers/billingController
 */

import User from "../models/User.js";
import ReferralCode from "../models/ReferralCode.js";
import ReferralRedemption from "../models/ReferralRedemption.js";
import {
  activateWebhookPurchase,
  BillingRequestError,
  buildBillingSummary,
  cancelActivePlan,
  createCheckout,
  getOrCreateReferralCodeForUser,
  listBillingPlans,
  verifyAndActivatePurchase,
} from "../services/planService.js";
import {
  getPaymentProvider,
  PaymentProviderError,
} from "../services/paymentProvider.js";

export const getBillingPlans = async (_req, res) => {
  res.status(200).json({
    code: 200,
    success: true,
    data: listBillingPlans(),
  });
};

export const createPlanCheckoutHandler = (checkoutService) => async (req, res) => {
  try {
    const result = await checkoutService({
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
    const statusCode = error instanceof BillingRequestError
      ? 400
      : error instanceof PaymentProviderError && error.statusCode === 401
        ? 401
        : 500;
    return res.status(statusCode).json({
      code: statusCode,
      success: false,
      message: statusCode === 500
        ? "Unable to create checkout at this time."
        : error.message,
    });
  }
};

export const createPlanCheckout = createPlanCheckoutHandler(createCheckout);

const respondWithBillingError = (res, error, genericMessage) => {
  const statusCode = error instanceof BillingRequestError ? 400 : 500;
  return res.status(statusCode).json({
    code: statusCode,
    success: false,
    message: statusCode === 400 ? error.message : genericMessage,
  });
};

export const createCancelPlanHandler = (cancelPlan) => async (req, res) => {
  try {
    const result = await cancelPlan({ userId: req.user._id });
    return res.status(200).json({
      code: 200,
      success: true,
      message: "Plan cancelled. Your account is now on the Free plan.",
      data: {
        access: result.access,
        accessRole: result.user.accessRole,
      },
    });
  } catch (error) {
    return respondWithBillingError(
      res,
      error,
      "Unable to cancel your plan at this time.",
    );
  }
};

export const cancelPlan = createCancelPlanHandler(cancelActivePlan);

export const verifyPlanCheckoutHandler = (verifyPurchase) => async (req, res) => {
  try {
    const result = await verifyPurchase({
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
    return respondWithBillingError(
      res,
      error,
      "Unable to verify purchase at this time.",
    );
  }
};

export const verifyPlanCheckout = verifyPlanCheckoutHandler(verifyAndActivatePurchase);

export const handleBillingWebhookHandler = ({
  getProvider,
  activatePurchase,
}) => async (req, res) => {
  try {
    const provider = getProvider();
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
      if (!payload.order_id || !payload.id) {
        return res.status(400).json({
          code: 400,
          success: false,
          message: "Webhook payment identifiers are required.",
        });
      }

      await activatePurchase({
        providerOrderId: payload.order_id,
        providerPaymentId: payload.id,
      });
    }

    return res.status(200).json({
      code: 200,
      success: true,
    });
  } catch (error) {
    return respondWithBillingError(
      res,
      error,
      "Unable to process billing webhook at this time.",
    );
  }
};

export const handleBillingWebhook = handleBillingWebhookHandler({
  getProvider: getPaymentProvider,
  activatePurchase: activateWebhookPurchase,
});

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
