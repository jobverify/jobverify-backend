import express from "express";
import { loadSiteSettings } from "../middleware/siteSettings.js";
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
import { submitUserSuggestion } from "../controllers/userSuggestionController.js";
import { getApplications, getJobApplication, markApplicationApplied } from '../controllers/applicationController.js';
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createRateLimiter } from "../utils/rateLimit.js";
import outreachRoutes from './outreachRoutes.js';
import gmailRoutes from './gmailRoutes.js';
import applicationMailRoutes from './applicationMailRoutes.js';
import autoApplyRoutes from './autoApplyRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import resumeRoutes from './resumeRoutes.js';
import tailoredResumeRoutes from './tailoredResumeRoutes.js';
import candidateEvidenceRoutes from './candidateEvidenceRoutes.js';
import applicationStageRoutes from './applicationStageRoutes.js';
import {
  mongoIdParamValidation,
  suggestionSubmissionValidation,
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
router.use('/outreach', outreachRoutes);
router.use('/gmail', gmailRoutes);
router.use('/application-mail', applicationMailRoutes);
router.use('/auto-apply', autoApplyRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/resume', resumeRoutes);
router.use('/tailored-resumes', tailoredResumeRoutes);
router.use('/candidate-evidence', candidateEvidenceRoutes);
router.use(applicationStageRoutes);

router
  .route("/profile")
  .get(protect, loadSiteSettings, getUserProfile)
  .put(
    protect,
    userProfileValidation,
    validateRequest,
    profileUpdateLimiter,
    loadSiteSettings,
    updateUserProfile,
  );

router.delete("/account", protect, deleteUserAccount);

router.get('/applications', protect, getApplications);
router.get('/applications/job/:jobId', protect, getJobApplication);
router.put('/applications/:applicationId/applied', protect,
  ...mongoIdParamValidation('applicationId', 'application ID'), validateRequest, markApplicationApplied);

router.post(
  "/suggestions",
  protect,
  suggestionSubmissionValidation,
  validateRequest,
  submitUserSuggestion,
);

router.route("/telegram-alerts/schedule")
  .get(protect, loadSiteSettings, getUserTelegramAlertSchedule)
  .put(protect, profileUpdateLimiter, telegramAlertScheduleValidation, validateRequest, loadSiteSettings, updateUserTelegramAlertSchedule);

router
  .route("/saved-jobs")
  .get(protect, loadSiteSettings, getSavedJobs);

router
  .route("/saved-jobs/:jobId")
  .post(
    protect,
    ...mongoIdParamValidation("jobId", "job ID"),
    validateRequest,
    loadSiteSettings,
    saveJob,
  )
  .delete(
    protect,
    ...mongoIdParamValidation("jobId", "job ID"),
    validateRequest,
    loadSiteSettings,
    removeSavedJob,
  );

router.post("/telegram-alerts/link", protect, loadSiteSettings, createTelegramAlertLink);

router
  .route("/telegram-alerts")
  .get(protect, loadSiteSettings, getTelegramAlertSettings)
  .put(
    protect,
    telegramAlertsValidation,
    validateRequest,
    loadSiteSettings,
    updateTelegramAlertSettings,
  )
  .delete(protect, loadSiteSettings, deleteTelegramAlertSettings);

export default router;
