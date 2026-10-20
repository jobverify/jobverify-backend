import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { loadSiteSettings } from '../middleware/siteSettings.js';
import { createRateLimiter } from '../utils/rateLimit.js';
import { read, create, download } from '../controllers/tailoredResumeController.js';
const router = express.Router();
router.use(protect, loadSiteSettings);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const limit = createRateLimiter({ windowMs: 900000, limit: 20, keyGenerator: req => String(req.user._id), standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many generation requests. Please try again later.' } });
router.get('/:jobId/download', download);
router.get('/:jobId', read);
router.post('/:jobId', limit, create);
export default router;
