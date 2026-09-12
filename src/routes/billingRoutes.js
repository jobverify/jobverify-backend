import express from "express";
import { requireBillingEnabled } from "../middleware/siteSettings.js";
import {
  cancelPlan,
  createPlanCheckout,
  getBillingPlans,
  getMyBillingSummary,
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

router.get("/plans", requireBillingEnabled, getBillingPlans);
router.post("/webhook", handleBillingWebhook);

router.use(protect);
router.post("/cancel", cancelPlan);
router.get("/me", getMyBillingSummary);
router.post(
  "/checkout",
  requireBillingEnabled,
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
