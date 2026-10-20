import OutreachTask from '../src/models/OutreachTask.js';
import { prepareOutreachRuntime, drainDraftTasks } from './runner.js';

export async function runOutreachDraftWorker({ deadline = Date.now() + 8 * 60000,
  prepareRuntime = prepareOutreachRuntime, drain = drainDraftTasks,
} = {}) {
  const pending = await OutreachTask.find({ kind: 'draft', ready: true, attempts: { $lt: 3 }, $or: [
    { status: 'queued' }, { status: 'running', leaseUntil: { $lt: new Date() } },
  ] }).sort({ createdAt: 1 }).limit(3).select('_id attempts').lean();
  if (!pending.length) return { attempted: 0, completed: 0, failed: 0 };
  let runtime;
  try {
    runtime = await prepareRuntime();
    if (deadline - Date.now() <= 15000) throw new Error('The outreach worker startup exceeded its budget.');
    return await drain({ maxTasks: 3, deadline });
  } catch (error) {
    // Leave active leases and newer attempts alone. Release queued tasks so the
    // person waiting in the app can explicitly retry without losing saved text.
    await Promise.all(pending.map(row => OutreachTask.updateOne({
      _id: row._id, kind: 'draft', attempts: row.attempts, status: 'queued', ready: true,
    }, {
      $set: { status: 'failed', ready: false, completedAt: new Date(), error: 'The outreach draft worker could not finish. Your saved draft is unchanged; please retry.' },
      $unset: { activeKey: 1, leaseOwner: 1, leaseUntil: 1 },
    })));
    throw error;
  } finally { await runtime?.stop(); }
}
