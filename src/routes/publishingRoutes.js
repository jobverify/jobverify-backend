import { Router } from 'express';
import { getPublishingBuildFeed } from '../controllers/publishingController.js';
import { getJobById } from '../controllers/jobController.js';
import { requirePublishingAccess } from '../utils/publishingAccess.js';
import { loadSiteSettings } from '../middleware/siteSettings.js';
const router = Router();
router.get('/build-feed', getPublishingBuildFeed);
router.get('/jobs/:id', requirePublishingAccess, (_req, res, next) => { res.set('X-Jobverify-Publishing', '1'); next(); }, loadSiteSettings, getJobById);
export default router;
