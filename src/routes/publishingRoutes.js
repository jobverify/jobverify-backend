import { Router } from 'express';
import { getPublishingBuildFeed } from '../controllers/publishingController.js';
const router = Router();
router.get('/build-feed', getPublishingBuildFeed);
export default router;
