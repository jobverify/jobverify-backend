import 'dotenv/config';
import mongoose from 'mongoose';
import { runOutreachDraftWorker } from '../outreach/draftWorker.js';

try {
  if (!process.env.MONGO_URI) throw new Error('Missing configuration.');
  const workflowStart = Date.parse(process.env.OUTREACH_WORKFLOW_STARTED_AT || '');
  const deadline = Number.isFinite(workflowStart) ? workflowStart + 9 * 60000 : Date.now() + 8 * 60000;
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, autoIndex: false });
  const counts = await runOutreachDraftWorker({ deadline });
  console.log(JSON.stringify({ attempted: counts.attempted, completed: counts.completed, failed: counts.failed }));
  if (counts.failed) process.exitCode = 1;
} catch {
  // Never print provider exceptions, prompts, Mongo URIs, candidate data or draft output.
  console.error('The outreach draft worker could not finish. Saved requests remain recoverable.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
