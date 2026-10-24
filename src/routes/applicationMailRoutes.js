import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getRequestAuthToken } from '../utils/authCookies.js';
import { createRateLimiter } from '../utils/rateLimit.js';
import { createMailboxAuthorization, disconnectApplicationMailbox, getMailboxStatus, listApplicationMail, listApplicationMailChoices, requestMailboxSync, resolveApplicationMail } from '../services/applicationMailboxService.js';

const router = express.Router();
router.use(protect);
router.use(createRateLimiter({ windowMs: 60000, limit: 30, message: 'Please wait before making more mailbox requests.' }));
const route = action => async (req, res) => {
  try { return res.json({ success: true, data: await action(req) }); }
  catch (error) { return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Application mailbox is temporarily unavailable.' }); }
};
router.get('/', route(req => getMailboxStatus(req.user._id)));
router.post('/connect', route(async req => ({ url: await createMailboxAuthorization(req.user, getRequestAuthToken(req)) })));
router.delete('/', route(async req => { await disconnectApplicationMailbox(req.user._id); return { connected: false }; }));
router.post('/sync', route(req => requestMailboxSync(req.user._id)));
router.get('/messages', route(req => listApplicationMail(req.user._id)));
router.get('/choices', route(req => listApplicationMailChoices(req.user._id, req.query.q)));
router.put('/messages/:id', route(req => resolveApplicationMail(req.user._id, req.params.id, req.body || {})));
export default router;
