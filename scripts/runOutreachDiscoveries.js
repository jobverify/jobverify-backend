import 'dotenv/config';
import mongoose from 'mongoose';
import { runReferralDiscoveryWorker, referralWorkerDeadline } from '../outreach/discoveryWorker.js';

try {
  if (!process.env.MONGO_URI) throw new Error('Missing configuration.');
  const deadline = referralWorkerDeadline(process.env.OUTREACH_WORKFLOW_STARTED_AT);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, autoIndex: false });
  const counts = await runReferralDiscoveryWorker({ deadline });
  console.log(JSON.stringify({ attempted: counts.attempted, completed: counts.completed, failed: counts.failed }));
  if (counts.failed) process.exitCode = 1;
} catch {
  // No prompts, source responses, candidate information, keys or Mongo URI in logs.
  console.error('The referral discovery worker could not finish. Saved requests remain recoverable.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
