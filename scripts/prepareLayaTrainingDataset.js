import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildClassificationInput } from '../src/services/jobClassificationPolicy.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const digest = text => createHash('sha256').update(text).digest('hex');
const normalized = value => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

export const prepareTrainingRows = (records, { now = new Date() } = {}) => {
  const seen = new Set();
  const rows = [];
  for (const { companyKey, job } of records) {
    const input = buildClassificationInput(job, { now });
    if (input.incomplete || !input.title) continue;
    const fingerprint = digest(`${normalized(input.title)}\n${normalized(input.body)}\n${normalized(input.sourceEmploymentType)}`);
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    rows.push({ id: `${companyKey}:${fingerprint.slice(0, 20)}`, companyKey, referenceDate: now.toISOString(),
      split: null, labelSource: null, labelledBy: null,
      targetCase: /\b(manager|director|chief|head of|trainee|graduates?|batch|pass.?outs?)\b/i.test(`${input.title}\n${input.body}`),
      job: { title: input.title, sourceDescription: input.sourceFields.description,
        minimumQualification: input.sourceFields.minimumQualification, preferredQualification: input.sourceFields.preferredQualification,
        qualifications: input.sourceFields.qualifications, responsibilities: input.sourceFields.responsibilities, requirements: input.sourceFields.requirements,
        sourceEmploymentType: input.sourceEmploymentType, sourceExperienceRequired: input.sourceExperienceRequired,
        eligibleBatches: input.eligibleBatches, ...(input.postedDate ? { postedAt: input.postedDate } : {}),
        ...(job.jobUrl || job.applyLink ? { jobUrl: job.jobUrl || job.applyLink } : {}) },
      expected: { employment: null, experience: null, seniority: null, leadership: null, jobType: null }, evidence: {} });
  }
  const companies = new Map();
  for (const row of rows) {
    if (!companies.has(row.companyKey)) companies.set(row.companyKey, []);
    companies.get(row.companyKey).push(row);
  }
  const weights = { train: .5, validation: .2, test: .3 };
  const assigned = { train: 0, validation: 0, test: 0 };
  for (const [company, jobs] of [...companies].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
    // Allocate larger employers first; frozen exports keep each employer and its similar adverts in one split.
    const split = Object.keys(weights).sort((a, b) => assigned[a] / weights[a] - assigned[b] / weights[b]
      || weights[b] - weights[a])[0];
    for (const row of jobs) row.split = split;
    assigned[split] += jobs.length;
  }
  return rows;
};

const main = () => {
  const outputArg = process.argv.find(arg => arg.startsWith('--output='));
  const output = path.resolve(root, outputArg?.slice(9) || '.cache/classification/to-label.jsonl');
  const limit = Number(process.argv.find(arg => arg.startsWith('--limit='))?.slice(8) || 1000);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error('--limit must be 1 to 10000');
  const records = [];
  for (const directory of fs.readdirSync(path.join(root, 'scraper'), { withFileTypes: true }).filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const source = path.join(root, 'scraper', directory.name, 'jobs.json');
    if (!fs.existsSync(source)) continue;
    const payload = JSON.parse(fs.readFileSync(source, 'utf8'));
    const jobs = Array.isArray(payload) ? payload : payload.jobs;
    if (Array.isArray(jobs)) records.push(...jobs.map(job => ({ companyKey: directory.name, job })));
  }
  const all = prepareTrainingRows(records);
  // Deterministic sampling spreads the sample across companies rather than taking one large ATS first.
  const rows = all.sort((a, b) => digest(a.id).localeCompare(digest(b.id))).slice(0, limit);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, rows.map(row => JSON.stringify(row)).join('\n') + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, rows: rows.length, splits: Object.fromEntries(['train', 'validation', 'test'].map(split => [split, rows.filter(row => row.split === split).length])),
    next: 'Review source text, fill expected/evidence and labelledBy, then set labelSource to human. These are unlabelled jobs, not training truth.' }));
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
