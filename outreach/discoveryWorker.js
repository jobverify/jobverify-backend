import OutreachTask from '../src/models/OutreachTask.js';
import { processDiscoveryTask } from '../src/services/outreachService.js';
import { prepareOutreachRuntime } from './runner.js';
import { prepareReferralSearchRuntime } from './searchRuntime.js';
import { searchReferralWeb, rankReferralContacts } from './referralSearch.js';

export function referralWorkerDeadline(workflowStartedAt, now = Date.now()) {
  const started = Date.parse(workflowStartedAt || '');
  return Math.min(Number.isFinite(started) ? started + 9 * 60000 : Infinity, now + 7.5 * 60000);
}

export async function runReferralDiscoveryWorker({ deadline = Date.now() + 8 * 60000,
  prepareSearch = prepareReferralSearchRuntime, prepareModel = prepareOutreachRuntime,
  processTask = processDiscoveryTask, search = searchReferralWeb, rankContacts = rankReferralContacts,
} = {}) {
  const pending = await OutreachTask.find({ kind: 'discovery', 'input.provider': 'actions', ready: true, attempts: { $lt: 3 }, $or: [
    { status: 'queued' }, { status: 'running', leaseUntil: { $lt: new Date() } },
  ] }).sort({ createdAt: 1 }).limit(3).select('_id attempts status leaseUntil +leaseOwner').lean();
  const counts = { attempted: 0, completed: 0, failed: 0 };
  if (!pending.length) return counts;
  let searchRuntime, modelRuntime;
  try {
    if (deadline - Date.now() <= 15000) throw new Error('The referral worker startup budget expired.');
    const started = await Promise.allSettled([prepareSearch({ deadline }), prepareModel({ deadline })]);
    if (started[0].status === 'fulfilled') searchRuntime = started[0].value;
    if (started[1].status === 'fulfilled') modelRuntime = started[1].value;
    const failed = started.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    if (deadline - Date.now() <= 15000) throw new Error('The referral worker startup exceeded its budget.');
    for (const row of pending) {
      if (counts.attempted >= 3 || deadline - Date.now() <= 15000) break;
      counts.attempted++;
      const result = await processTask(row._id, { provider: 'actions', search, rankContacts, deadline: Math.min(deadline, Date.now() + 150000) });
      if (result) counts.completed++;
      else if ((await OutreachTask.findById(row._id).select('status').lean())?.status === 'failed') counts.failed++;
    }
    return counts;
  } catch (error) {
    await Promise.all(pending.map(row => OutreachTask.updateOne({
      _id: row._id, kind: 'discovery', 'input.provider': 'actions', attempts: row.attempts, ready: true,
      ...(row.status === 'running' ? { status: 'running', leaseOwner: row.leaseOwner, leaseUntil: { $lt: new Date() } } : { status: 'queued' }),
    }, {
      $set: { status: 'failed', ready: false, completedAt: new Date(), error: 'The referral search worker could not finish. Your job context is saved; please retry.' },
      $unset: { activeKey: 1, leaseOwner: 1, leaseUntil: 1 },
    })));
    throw error;
  } finally {
    await Promise.allSettled([() => searchRuntime?.stop(), () => modelRuntime?.stop()].map(stop => Promise.resolve().then(stop)));
  }
}
