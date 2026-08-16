import express from "express";
import {
  cancelPlan,
  createOrGetMyReferralCode,
  createPlanCheckout,
  getBillingPlans,
  getMyBillingSummary,
  getMyReferralStatus,
  handleBillingWebhook,
  verifyPlanCheckout,
} from "../controllers/billingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  billingCheckoutValidation,
  billingVerifyValidation,
} from "../validation/requestValidators.js";

const router = express.Router();

router.get("/plans", getBillingPlans);
router.post("/webhook", handleBillingWebhook);

router.use(protect);
router.post("/cancel", cancelPlan);
router.get("/me", getMyBillingSummary);
router.get("/referrals/me", getMyReferralStatus);
router.post("/referrals/code", createOrGetMyReferralCode);
router.post(
  "/checkout",
  billingCheckoutValidation,
  validateRequest,
  createPlanCheckout,
);
router.post(
  "/verify",
  billingVerifyValidation,
  validateRequest,
  verifyPlanCheckout,
);

export default router;
