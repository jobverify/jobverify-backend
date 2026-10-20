import TailoredResume from '../src/models/TailoredResume.js';
import { drainTailoredResumes } from '../src/services/resumeTailoringService.js';
import { prepareOutreachRuntime, generateTailoredResume } from './runner.js';

export async function runTailoredResumeWorker({ deadline = Date.now() + 8 * 60000,
  prepareRuntime = prepareOutreachRuntime, generate = generateTailoredResume, drain = drainTailoredResumes,
} = {}) {
  const pending = await TailoredResume.find({ ready: true, attempts: { $lt: 3 }, $or: [
    { status: 'queued' }, { status: 'running', leaseUntil: { $lt: new Date() } },
  ] }).sort({ requestedAt: 1 }).limit(3).select('_id revision').lean();
  if (!pending.length) return { attempted: 0, completed: 0, failed: 0 };
  let runtime;
  try {
    runtime = await prepareRuntime();
    if (deadline - Date.now() <= 15000) throw new Error('The resume worker startup exceeded its budget.');
    return await drain({ generate, maxTasks: 3, deadline });
  } catch (error) {
    // Startup failures must be visible to the person waiting in the app. Never
    // overwrite another worker's lease, a retry revision, or previous output.
    await Promise.all(pending.map(row => TailoredResume.updateOne({ _id: row._id, revision: row.revision, status: 'queued', ready: true }, {
      $set: { status: 'failed', ready: false, error: 'The resume worker could not finish. Please retry generation.' },
    })));
    throw error;
  } finally { await runtime?.stop(); }
}
