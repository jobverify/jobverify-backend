import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import { createJobClassifier } from '../scraper-support/utils/jobClassifier.js';

const jobs = [
  { title: 'Graduate Engineer', description: 'Permanent full-time graduate recruitment. 2025 batch pass outs may apply. Freshers are welcome.' },
  { title: 'Engineering Manager', description: 'Full-time permanent position. Lead a team of engineers, mentor interns, and manage project delivery. No numeric experience requirement is provided.' },
  { title: 'Finance Intern', description: 'This vacancy is a six-month internship. Applicants must have 1 year of experience in finance.' },
  { title: 'Management Trainee', description: 'Permanent full-time graduate programme. Freshers are eligible. This is a trainee employee position.' },
  { title: 'Senior Engineer', description: `${'Develop software and collaborate with colleagues. '.repeat(180)} Minimum 5 years of professional experience required. Permanent full-time position.` },
];
const client = createJobClassifier({ mode: 'shadow' });
const start = performance.now();
const results = await client.classifyJobs(jobs);
const report = { elapsedSeconds: (performance.now() - start) / 1000, stats: client.stats, results: results.map(job => ({ title: job.title, status: job.classification.status, reason: job.classification.reason, windows: job.classification.windows, decisions: job.classification.decisions, candidate: job.classification.resolved })) };
fs.mkdirSync('.cache/scraper-actions', { recursive: true });
fs.writeFileSync('.cache/scraper-actions/laya-smoke.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
