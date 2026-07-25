/**
 * @file API routes for job listings search, clicks, and metadata.
 * @module routes/jobRoutes
 */

import express from "express";
import {
  getAllJobs,
  getJobById,
  trackJobClick,
  getJobMeta,
  getJobStats,
  getJobSeoFeed,
} from "../controllers/jobController.js";
import { optionalProtect, protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createRateLimiter } from "../utils/rateLimit.js";
import {
  jobQueryValidation,
  mongoIdParamValidation,
} from "../validation/requestValidators.js";

const clickLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    code: 429,
    success: false,
    message: "Too many clicks, please try again after a minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.get("/", jobQueryValidation, validateRequest, optionalProtect, getAllJobs);
router.get("/meta", jobQueryValidation, validateRequest, optionalProtect, getJobMeta);   // must be before /:id
router.get("/stats", getJobStats); // public stats for landing page
router.get("/seo-feed", getJobSeoFeed);
router.get("/:id", mongoIdParamValidation("id", "job ID"), validateRequest, getJobById);
router.post(
  "/:id/click",
  protect,
  mongoIdParamValidation("id", "job ID"),
  validateRequest,
  clickLimiter,
  trackJobClick,
);

export default router;
