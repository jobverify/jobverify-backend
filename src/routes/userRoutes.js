import express from "express";
import { telegramAlertScheduleValidation, getUserTelegramAlertSchedule, updateUserTelegramAlertSchedule } from "../controllers/alertScheduleController.js";
import {
  createTelegramAlertLink,
  deleteTelegramAlertSettings,
  deleteUserAccount,
  getTelegramAlertSettings,
  getUserProfile,
  getSavedJobs,
  removeSavedJob,
  saveJob,
  updateTelegramAlertSettings,
  updateUserProfile,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createRateLimiter } from "../utils/rateLimit.js";
import {
  mongoIdParamValidation,
  telegramAlertsValidation,
  userProfileValidation,
} from "../validation/requestValidators.js";

const profileUpdateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    code: 429,
    success: false,
    message: "Too many profile updates, please try again after 5 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router
  .route("/profile")
  .get(protect, getUserProfile)
  .put(
    protect,
    userProfileValidation,
    validateRequest,
    profileUpdateLimiter,
    updateUserProfile,
  );

router.delete("/account", protect, deleteUserAccount);

router.route("/telegram-alerts/schedule")
  .get(protect, getUserTelegramAlertSchedule)
  .put(protect, profileUpdateLimiter, telegramAlertScheduleValidation, validateRequest, updateUserTelegramAlertSchedule);

router
  .route("/saved-jobs")
  .get(protect, getSavedJobs);

router
  .route("/saved-jobs/:jobId")
  .post(
    protect,
    ...mongoIdParamValidation("jobId", "job ID"),
    validateRequest,
    saveJob,
  )
  .delete(
    protect,
    ...mongoIdParamValidation("jobId", "job ID"),
    validateRequest,
    removeSavedJob,
  );

router.post("/telegram-alerts/link", protect, createTelegramAlertLink);

router
  .route("/telegram-alerts")
  .get(protect, getTelegramAlertSettings)
  .put(
    protect,
    telegramAlertsValidation,
    validateRequest,
    updateTelegramAlertSettings,
  )
  .delete(protect, deleteTelegramAlertSettings);

export default router;
