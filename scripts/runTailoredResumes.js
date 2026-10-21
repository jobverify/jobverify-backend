import 'dotenv/config';
import mongoose from 'mongoose';
import { runTailoredResumeWorker } from '../outreach/tailoredResumeWorker.js';

try {
  if (!process.env.MONGO_URI) throw new Error('Missing worker configuration.');
  const start = Date.parse(process.env.TAILORED_RESUME_WORKFLOW_STARTED_AT || '');
  const deadline = Number.isFinite(start) ? start + 29 * 60000 : Date.now() + 27 * 60000;
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, autoIndex: false });
  const counts = await runTailoredResumeWorker({ deadline });
  // Only aggregate counts may leave the worker; no documents, prompts or output.
  console.log(JSON.stringify(counts));
  if (counts.failed) process.exitCode = 1;
} catch {
  console.error('The tailored resume worker could not finish. Retry generation in the app.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
