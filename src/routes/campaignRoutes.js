import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { approveCampaign, cancelCampaign, createCampaign, getCampaign, listCampaigns, serializeCampaign, updateCampaign } from '../services/campaignService.js';

const router = express.Router();
router.use(protect);
function route(action, status = 200, serialize = true) {
  return async (req, res) => {
    try { const value = await action(req); return res.status(status).json({ success: true, data: serialize ? serializeCampaign(value) : value }); }
    catch (error) { return res.status(error.statusCode ?? 500).json({ success: false,
      message: error.statusCode ? error.message : 'Could not update your campaign. Please try again.' }); }
  };
}
router.get('/', route(req => listCampaigns(req.user._id), 200, false));
router.post('/', route(req => createCampaign(req.user._id, req.body?.threadIds), 201));
router.get('/:id', route(req => getCampaign(req.user._id, req.params.id)));
router.patch('/:id', route(req => updateCampaign(req.user._id, req.params.id, req.body)));
router.post('/:id/send', route(req => approveCampaign(req.user._id, req.params.id, { revision: req.body?.revision })));
router.post('/:id/cancel', route(req => cancelCampaign(req.user._id, req.params.id)));

export default router;
