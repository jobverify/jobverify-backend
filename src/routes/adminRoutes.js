/**
 * @file API routes for the admin dashboard, user/job management, and crawler control.
 * @module routes/adminRoutes
 */

import express from "express";
import { updateSiteSettings } from "../controllers/siteSettingsController.js";
import {
  getDashboardStats,
  getClickTimeSeries,
  getClicksByLocation,
  getTopJobs,
  getUserGrowthTimeSeries,
  getUsersTable,
  getUserById,
  updateUserRole,
  updateUserAccess,
  getJobsTable,
  updateJobStatus,
  getAuditLog,
  getScrapeStatus,
  triggerScrapeAdmin,
  toggleScraperActive,
  toggleUserStatus,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createRateLimiter,
  ipKeyGenerator,
} from "../utils/rateLimit.js";
import {
  adminJobsQueryValidation,
  adminJobStatusValidation,
  adminRoleUpdateValidation,
  adminAccessUpdateValidation,
  adminScraperToggleValidation,
  adminUserStatusValidation,
  adminUsersQueryValidation,
  mongoIdParamValidation,
} from "../validation/requestValidators.js";

const router = express.Router();

const scrapeTriggerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) =>
    `${req.user?._id ?? "unknown"}:${ipKeyGenerator(req.ip)}`,
  message: {
    code: 429,
    success: false,
    message: "Too many scraper trigger attempts, please try again after an hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and administrator role guard to all routes
router.use(protect);
router.use(authorize("admin"));
router.put("/site-settings", updateSiteSettings);

// Dashboard Overview and Time-Series Analytics
router.get("/stats", getDashboardStats);
router.get("/analytics/clicks", getClickTimeSeries);
router.get("/analytics/clicks/locations", getClicksByLocation);
router.get("/analytics/top-jobs", getTopJobs);
router.get("/analytics/user-growth", getUserGrowthTimeSeries);

// User Account Management
router.get("/users", adminUsersQueryValidation, validateRequest, getUsersTable);
router.get("/users/:id", mongoIdParamValidation("id", "user ID"), validateRequest, getUserById);
router.put(
  "/users/:id/role",
  adminRoleUpdateValidation,
  validateRequest,
  updateUserRole,
);
router.put(
  "/users/:id/access",
  adminAccessUpdateValidation,
  validateRequest,
  updateUserAccess,
);
router.put(
  "/users/:id/status",
  adminUserStatusValidation,
  validateRequest,
  toggleUserStatus,
);

// Job Listing Management
router.get("/jobs", adminJobsQueryValidation, validateRequest, getJobsTable);
router.put("/jobs/:id/status", adminJobStatusValidation, validateRequest, updateJobStatus);

// Administrative Action Audit Logging
router.get("/audit", getAuditLog);

// Crawler Health Status and Pipeline Triggers
router.get("/scrape/status", getScrapeStatus);
router.post(
  "/scrape/trigger",
  scrapeTriggerLimiter,
  triggerScrapeAdmin,
);

// Crawler Pipeline Active State Control
router.put(
  "/scraper/:id/toggle",
  adminScraperToggleValidation,
  validateRequest,
  toggleScraperActive,
);

export default router;
