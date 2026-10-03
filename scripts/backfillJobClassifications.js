import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../db/db.js';
import Job from '../src/models/Job.js';
import { refreshJobDatasetSummary } from '../src/services/jobDatasetSummaryService.js';
import { CLASSIFICATION_FIELDS, buildClassificationInput, snapshotClassificationFields, getAuthoritativeClassification } from '../src/services/jobClassificationPolicy.js';
import { createJobClassifier } from '../scraper-support/utils/jobClassifier.js';
import { normalizeScrapedJob } from '../scraper-support/utils/normalizeScrapedJob.js';

dotenv.config({ quiet: true });
const flag = (name, fallback) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const apply = process.argv.includes('--apply');
const rollback = process.argv.includes('--rollback');
const limit = Number(flag('limit', '1000'));
const batchSize = Number(flag('batch-size', '50'));
if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 200) throw new Error('Use a positive --limit and --batch-size between 1 and 200');
const mode = flag('mode', process.env.JOB_CLASSIFICATION_MODE || 'shadow');
const checkpointPath = path.resolve(flag('checkpoint', `.cache/scraper-actions/classification-${rollback ? 'rollback' : mode}.json`));
const now = new Date();
let cursor = null;
if (apply && fs.existsSync(checkpointPath)) {
  const checkpoint = JSON.parse(fs.readFileSync(checkpointPath));
  if (checkpoint.mode !== mode || checkpoint.rollback !== rollback) throw new Error('Checkpoint belongs to another operation; use a different --checkpoint path');
  cursor = checkpoint.lastId;
}
const summary = { apply, rollback, mode, scanned: 0, classified: 0, missingContent: 0, matched: 0, updated: 0, concurrentChangesSkipped: 0, lastId: cursor };
const classifier = rollback ? null : createJobClassifier({ mode });
if (!rollback && mode === 'off') throw new Error('Backfill requires shadow or enforce mode');

try {
  await connectDB();
  while (summary.scanned < limit) {
    const query = { status: 'active', ...(cursor && { _id: { $gt: new mongoose.Types.ObjectId(cursor) } }), ...(rollback && { classification: { $exists: true } }) };
    const jobs = await Job.find(query).sort({ _id: 1 }).limit(Math.min(batchSize, limit - summary.scanned)).lean().exec();
    if (!jobs.length) break;
    const operations = [];
    for (const job of jobs) {
      summary.scanned++;
      let set = {}, unset;
      if (rollback) {
        if (getAuthoritativeClassification(job) && job.classification.previous) {
          set = Object.fromEntries(CLASSIFICATION_FIELDS.filter(field => Object.hasOwn(job.classification.previous, field)).map(field => [field, job.classification.previous[field]]));
        }
        unset = { classification: 1 };
      } else {
        if (!buildClassificationInput(job, { now }).body) { summary.missingContent++; continue; }
        const [classified] = await classifier.classifyJobs([job], { now, existingJobs: [job] });
        classified.classification.previous ||= snapshotClassificationFields(job);
        const normalized = normalizeScrapedJob(classified);
        set = { classification: normalized.classification,
          ...(getAuthoritativeClassification(normalized) && Object.fromEntries(CLASSIFICATION_FIELDS.map(field => [field, normalized[field] ?? null]))) };
        summary.classified++;
      }
      const update = { ...(Object.keys(set).length && { $set: set }), ...(unset && { $unset: unset }) };
      operations.push({ updateOne: { filter: { _id: job._id, fingerprint: job.fingerprint, updatedAt: job.updatedAt ?? { $exists: false } }, update } });
    }
    if (apply && operations.length) {
      const result = await Job.bulkWrite(operations, { ordered: true });
      summary.matched += result.matchedCount;
      summary.updated += result.modifiedCount;
      summary.concurrentChangesSkipped += operations.length - result.matchedCount;
    }
    cursor = String(jobs.at(-1)._id);
    summary.lastId = cursor;
    if (apply) {
      fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
      const temporary = `${checkpointPath}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify({ mode, rollback, lastId: cursor, referenceYear: buildClassificationInput({}, { now }).referenceYear, stats: summary }));
      fs.renameSync(temporary, checkpointPath);
    }
    console.log(JSON.stringify(summary));
  }
  if (apply && summary.updated > 0) await refreshJobDatasetSummary();
  console.log(JSON.stringify({ ...summary, classification: classifier?.stats }));
} finally {
  await mongoose.disconnect();
}
