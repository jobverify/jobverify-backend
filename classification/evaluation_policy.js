import { buildClassificationInput, resolveClassification, CLASSIFICATION_MODEL, POLICY_HASH, RUNTIME_HASH } from '../src/services/jobClassificationPolicy.js';
import { normalizeScrapedJob } from '../scraper-support/utils/normalizeScrapedJob.js';

let data = '';
for await (const chunk of process.stdin) data += chunk;
const rows = JSON.parse(data);
const action = process.argv[2];
const output = rows.map(row => {
  const now = new Date(row.referenceDate || '2026-10-02T12:00:00Z');
  const job = row.job;
  if (action === 'prepare') return { ...row, input: buildClassificationInput(job, { now }), baselineJobType: normalizeScrapedJob(job).jobType };
  if (action === 'resolve') {
    const classification = resolveClassification(job, row.prediction, { now, mode: 'enforce', thresholds: row.thresholds });
    return { id: row.id, status: classification.status, resolved: classification.resolved };
  }
  throw new Error('Expected prepare or resolve');
});
process.stdout.write(JSON.stringify({ identity: { modelRevision: CLASSIFICATION_MODEL.revision, runtimeVersion: CLASSIFICATION_MODEL.runtimeVersion, runtimeHash: RUNTIME_HASH, policyHash: POLICY_HASH }, rows: output }));
