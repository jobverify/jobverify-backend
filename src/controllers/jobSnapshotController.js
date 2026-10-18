import { readHiringSnapshot } from '../services/hiringObservationService.js';

export async function getJobSnapshot(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: await readHiringSnapshot(req.siteSettings) });
  } catch (error) { next(error); }
}
