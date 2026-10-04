import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJobClassifier } from '../scraper-support/utils/jobClassifier.js';
import { normalizeScrapedJob } from '../scraper-support/utils/normalizeScrapedJob.js';

export const runClassifiedScraper = async ({ scraper, jobs: capturedJobs, classifier = createJobClassifier({ mode: 'policy' }),
  captureOnly = false, apply = false, persist, now = new Date(), onProgress = () => {}, onCheckpoint = () => {} } = {}) => {
  if (!scraper?.name || typeof scraper.run !== 'function') throw new Error('A runnable scraper is required');
  if (captureOnly && apply) throw new Error('Capture-only cannot write to MongoDB');
  const jobs = capturedJobs ?? await scraper.run();
  if (!Array.isArray(jobs) || jobs.some(job => !job || (job.source && job.source !== scraper.name))) throw new Error('Source jobs must belong to the selected scraper');
  onProgress({ stage: 'scraped', source: scraper.name, jobs: jobs.length });
  const report = { source: scraper.name, referenceDate: now.toISOString(), scrapedJobs: jobs.length, capturedOnly: captureOnly, applied: false, results: [] };
  if (captureOnly) return { ...report, jobs };
  const classified = [];
  // Use one shared client so the entire source observes the same identity and cache.
  for (const job of jobs) {
    const [result] = await classifier.classifyJobs([{ ...job, source: scraper.name }], { now });
    const normalized = normalizeScrapedJob(result, { source: scraper.name });
    classified.push(normalized);
    const row = { title: normalized.title, jobType: normalized.jobType, experienceYears: normalized.experienceYears,
      experienceBasis: normalized.experienceBasis, sourceExperienceRequired: normalized.sourceExperienceRequired,
      status: normalized.classification?.status, complete: normalized.classification?.complete, decisions: normalized.classification?.decisions };
    report.results.push(row);
    onProgress({ stage: 'classified', source: scraper.name, processed: classified.length, total: jobs.length, ...row });
    await onCheckpoint({ ...report, classifierStats: { ...classifier.stats }, jobs: classified });
  }
  report.classifierStats = { ...classifier.stats };
  if (apply) {
    if (classifier.mode !== 'policy') throw new Error('This command publishes only the reviewed product policy; use the existing gated backfill for model enforcement');
    const save = persist || (await import('../scraper-support/utils/saveToDB.js')).saveToDB;
    report.persistence = await save(classified, scraper.name, { classifier, now, enrichPublicExperience: false,
      replaceExisting: false, enqueueAlerts: false, descriptionRewriteMode: 'off' });
    report.applied = true;
    onProgress({ stage: 'persisted', source: scraper.name, ...report.persistence });
  }
  return { ...report, jobs: classified };
};

const main = async () => {
  const args = process.argv.slice(2);
  const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const { buildScrapers } = await import('../scraper-support/providers/index.js');
  const scrapers = buildScrapers();
  const selected = args.includes('--all') ? scrapers : [scrapers.find(scraper => scraper.name === (value('source') || scrapers[0]?.name))];
  if (selected.some(scraper => !scraper)) throw new Error('Unknown scraper source');
  if (args.includes('--all') && (value('jobs') || value('output'))) throw new Error('--all uses a separate capture/report for each source');
  const now = new Date();
  const classifier = createJobClassifier({ mode: 'policy' });
  const directory = path.resolve('.cache/classification-runs');
  fs.mkdirSync(directory, { recursive: true });
  for (const scraper of selected) {
    const output = path.resolve(value('output') || path.join(directory, `${scraper.name}-${now.toISOString().replace(/[:.]/g, '-')}.json`));
    if (fs.existsSync(output)) throw new Error(`Refusing to overwrite ${output}`);
    const progressFile = output.replace(/\.json$/i, '') + '.progress.json';
    if (fs.existsSync(progressFile)) throw new Error(`Refusing to overwrite ${progressFile}`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const captured = value('jobs') ? JSON.parse(fs.readFileSync(path.resolve(value('jobs')), 'utf8')) : null;
    if (captured?.source && captured.source !== scraper.name) throw new Error('Capture belongs to a different scraper');
    const report = await runClassifiedScraper({ scraper, jobs: captured && (Array.isArray(captured) ? captured : captured.jobs),
      classifier, captureOnly: args.includes('--capture-only'), apply: args.includes('--apply'), now,
      onProgress: progress => console.log(JSON.stringify(progress)),
      onCheckpoint: snapshot => {
        const temporary = `${progressFile}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify(snapshot, null, 2) + '\n');
        fs.renameSync(temporary, progressFile);
      } });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ source: scraper.name, report: output, applied: report.applied, jobs: report.scrapedJobs }));
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { const { default: mongoose } = await import('mongoose'); await mongoose.disconnect(); }
}
