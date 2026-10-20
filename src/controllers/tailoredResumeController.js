import { getTailoredResume, requestTailoredResume } from '../services/resumeTailoringService.js';
import { tailoredResumeFilename, tailoredResumeText } from '../services/resumeTailoringContent.js';
import Job from '../models/Job.js';
import { respondWithInternalError } from '../utils/respondWithInternalError.js';
const failure = (res, error) => error.statusCode ? res.status(error.statusCode).json({ success: false, message: error.message })
  : respondWithInternalError(res, { name: error?.name }, { message: 'Could not load your tailored resume. Please try again.', logLabel: '[Resume tailoring]' });
export async function read(req, res) {
  try { return res.json({ success: true, data: await getTailoredResume(req.user, req.params.jobId, req.siteSettings) }); }
  catch (error) { return failure(res, error); }
}
export async function create(req, res) {
  try {
    if (req.body?.regenerate !== undefined && typeof req.body.regenerate !== 'boolean') return res.status(400).json({ success: false, message: 'Regenerate must be true or false.' });
    const data = await requestTailoredResume(req.user, req.params.jobId, { regenerate: req.body?.regenerate === true, settings: req.siteSettings });
    return res.status(['queued', 'running'].includes(data.status) ? 202 : 200).json({ success: true, data });
  } catch (error) { return failure(res, error); }
}
export async function download(req, res) {
  try {
    const data = await getTailoredResume(req.user, req.params.jobId, req.siteSettings);
    if (!data?.output) return res.status(404).json({ success: false, message: 'Generate a tailored resume first.' });
    if (data.stale) return res.status(409).json({ success: false, message: 'Your resume or this job changed. Generate a new version before downloading.' });
    const job = await Job.findById(req.params.jobId).select('title company').lean();
    return res.attachment(tailoredResumeFilename(job || {})).type('text/plain; charset=utf-8').send(tailoredResumeText(data.output));
  } catch (error) { return failure(res, error); }
}
