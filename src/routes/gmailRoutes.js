import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getRequestAuthToken } from '../utils/authCookies.js';
import { createRateLimiter } from '../utils/rateLimit.js';
import { completeGmailAuthorization, createGmailAuthorization, disconnectGmail, getGmailStatus } from '../services/gmailService.js';
import { completeMailboxAuthorization } from '../services/applicationMailboxService.js';

const router = express.Router();
router.use(protect);
const connectLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many Gmail connection attempts. Please try again later.' } });

function route(action) {
  return async (req, res) => {
    try { const data = await action(req); return res.json({ success: true, data }); }
    catch (error) { return res.status(error.statusCode ?? 500).json({ success: false,
      message: error.statusCode ? error.message : 'Gmail is temporarily unavailable. Please try again.' }); }
  };
}

function profileRedirect(result, mailbox = false) {
  // A configured frontend origin is trusted configuration; request parameters
  // never select an OAuth redirect target.
  const configured = String(process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid frontend origin.');
  return new URL(mailbox ? `/my-applications?mailbox=${result}` : `/profile?gmail=${result}`, url.origin).toString();
}

router.get('/', route(req => getGmailStatus(req.user._id)));
router.post('/connect', connectLimiter, route(async req => ({ url: await createGmailAuthorization(req.user, getRequestAuthToken(req)) })));
router.get('/callback', async (req, res) => {
  const mailbox = typeof req.query.state === 'string' && req.query.state.startsWith('mailbox.');
  const redirect = result => profileRedirect(result, mailbox);
  try {
    await (mailbox ? completeMailboxAuthorization : completeGmailAuthorization)(req.user, getRequestAuthToken(req), req.query);
    return res.redirect(redirect('connected'));
  }
  catch (error) {
    if (error.statusCode === 409) return res.status(409).json({ success: false, message: error.message });
    return res.redirect(redirect('failed'));
  }
});
router.delete('/', route(async req => { await disconnectGmail(req.user._id); return { connected: false, email: '' }; }));

export default router;
