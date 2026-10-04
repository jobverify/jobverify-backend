import test from 'node:test';
import assert from 'node:assert/strict';
import { runClassifiedScraper } from '../scripts/classifyScraper.js';
import { resolveClassification } from '../src/services/jobClassificationPolicy.js';

const now = new Date('2026-10-03T12:00:00Z');
const jobs = [
  { title: 'Engineer Intern', source: 'first', description: 'Learn engineering skills.' },
  { title: 'Graduate Engineer', source: 'first', description: 'Full-time 2025 graduates can apply.' },
];
const scraper = { name: 'first', run: async () => jobs };
const makeClient = () => ({ mode: 'policy', stats: {}, classifyJobs: async records => records.map(job => ({ ...job, classification: resolveClassification(job, null, { now, mode: 'policy' }) })) });

test('a scraper supplies every job to the shared classifier before persistence', async () => {
  const events = [], client = makeClient();
  const classify = client.classifyJobs;
  client.classifyJobs = async records => { events.push(`classify:${records[0].title}`); return classify(records); };
  const report = await runClassifiedScraper({ scraper, classifier: client, now, apply: true, persist: async (records, source, options) => {
    events.push('persist');
    assert.equal(records.length, 2);
    assert.equal(source, 'first');
    assert.equal(options.replaceExisting, false);
    assert.equal(options.enqueueAlerts, false);
    assert.equal(options.descriptionRewriteMode, 'off');
    assert.deepEqual(records.map(job => job.experienceYears), [[0], [1]]);
    return { inserted: 2, updated: 0 };
  } });
  assert.deepEqual(events, ['classify:Engineer Intern', 'classify:Graduate Engineer', 'persist']);
  assert.equal(report.applied, true);
});

test('capture-only does not classify or write and empty sources do not fabricate jobs', async () => {
  const client = { classifyJobs: () => assert.fail('classification'), mode: 'policy' };
  const capture = await runClassifiedScraper({ scraper, classifier: client, captureOnly: true, now });
  assert.equal(capture.jobs.length, 2);
  assert.equal(capture.applied, false);
  const empty = await runClassifiedScraper({ scraper: { name: 'empty', run: async () => [] }, classifier: makeClient(), now });
  assert.equal(empty.results.length, 0);
  assert.equal(empty.scrapedJobs, 0);
});

test('a captured batch cannot write jobs from a different source', async () => {
  await assert.rejects(runClassifiedScraper({ scraper, jobs: [{ ...jobs[0], source: 'other' }], classifier: makeClient(), apply: true, now }), /selected scraper/);
});

test('completed decisions remain reviewable when a later job fails before persistence', async () => {
  const snapshots = [];
  const client = makeClient(), classify = client.classifyJobs;
  client.classifyJobs = async records => {
    if (records[0].title === jobs[1].title) throw new Error('runner interrupted');
    return classify(records);
  };
  await assert.rejects(runClassifiedScraper({ scraper, classifier: client, apply: true, now,
    persist: () => assert.fail('an incomplete run cannot publish'),
    onCheckpoint: snapshot => snapshots.push(JSON.parse(JSON.stringify(snapshot))),
  }), /runner interrupted/);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].applied, false);
  assert.equal(snapshots[0].jobs[0].jobType, 'Intern');
  assert.deepEqual(snapshots[0].jobs[0].experienceYears, [0]);
});
