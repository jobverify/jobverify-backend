import 'dotenv/config';
import mongoose from 'mongoose';
import OutreachTask from '../src/models/OutreachTask.js';
import TailoredResume from '../src/models/TailoredResume.js';
import { prepareOutreachRuntime, drainGenerationQueues } from '../outreach/runner.js';

let runtime;
try {
  if (!process.env.MONGO_URI) throw new Error('Missing configuration.');
  const workflowStart = Date.parse(process.env.OUTREACH_WORKFLOW_STARTED_AT || '');
  const deadline = Number.isFinite(workflowStart) ? workflowStart + 9 * 60000 : Date.now() + 8 * 60000;
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, autoIndex: false });
  const pending = await Promise.all([
    OutreachTask.exists({ kind: 'draft', ready: true, status: { $in: ['queued', 'running'] } }),
    TailoredResume.exists({ ready: true, status: { $in: ['queued', 'running'] } }),
  ]);
  if (pending.some(Boolean)) {
    runtime = await prepareOutreachRuntime();
    const counts = await drainGenerationQueues({ deadline });
    console.log(JSON.stringify({ attempted: counts.attempted, completed: counts.completed, failed: counts.failed }));
  } else console.log('No queued outreach drafts.');
} catch {
  // Never print provider exceptions, prompts, Mongo URIs, candidate data or draft output.
  console.error('The outreach draft worker could not finish. Saved requests remain recoverable.');
  process.exitCode = 1;
} finally {
  runtime?.stop();
  await mongoose.disconnect();
}
