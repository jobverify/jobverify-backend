import express from 'express';
import { body, param, query } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import { loadSiteSettings } from '../middleware/siteSettings.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createRateLimiter } from '../utils/rateLimit.js';
import { requestDiscovery, getTask, listThreads, saveContact, updateThread, deleteThread, requestDraft } from '../services/outreachService.js';
import { OUTREACH_STATUSES } from '../models/OutreachThread.js';

const router = express.Router();
router.use(protect, loadSiteSettings);
const limiter = createRateLimiter({ windowMs: 60000, limit: 30, message: 'Please wait before making more outreach requests.' });
const id = () => param('id').isMongoId();
const action = handler => async (req, res, next) => {
  try { res.json({ success: true, data: await handler(req) }); }
  catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message }); next(error); }
};
router.post('/discoveries', limiter, body('jobId').isMongoId(), body('refresh').optional().isBoolean({ strict: true }), validateRequest, action(req => requestDiscovery(req.user._id, req.body, { siteSettings: req.siteSettings })));
router.get('/tasks/:id', id(), validateRequest, action(req => getTask(req.user._id, req.params.id)));
router.get('/threads', query('jobId').optional().isMongoId(), query('status').optional().isIn(OUTREACH_STATUSES), query('company').optional().isString().isLength({ max: 500 }), validateRequest, action(req => listThreads(req.user._id, req.query)));
router.post('/threads', limiter, body('taskId').isMongoId(), body('contactIndex').isInt({ min: 0, max: 2 }).toInt(), validateRequest, action(req => saveContact(req.user._id, req.body)));
router.patch('/threads/:id', limiter, id(), body('revision').optional().isInt({ min: 0 }), body('draft').optional().isObject({ strict: true }), body('draft.linkedin').optional().isString().isLength({ max: 3000 }), body('draft.emailSubject').optional().isString().isLength({ max: 250 }), body('draft.emailBody').optional().isString().isLength({ max: 12000 }), body('status').optional().isIn(OUTREACH_STATUSES), body('email').optional().isString().isLength({ max: 320 }), body('emailConfirmed').optional().isBoolean({ strict: true }), validateRequest, action(req => updateThread(req.user._id, req.params.id, req.body)));
router.delete('/threads/:id', id(), validateRequest, action(async req => { await deleteThread(req.user._id, req.params.id); return null; }));
router.post('/threads/:id/drafts', limiter, id(), validateRequest, action(req => requestDraft(req.user, req.params.id)));
export default router;
