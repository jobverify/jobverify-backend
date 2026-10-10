import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClassification, CLASSIFICATION_POLICY, CLASSIFICATION_MODEL, POLICY_HASH, RUNTIME_HASH } from '../src/services/jobClassificationPolicy.js';
import { validNativePrediction } from '../scraper-support/utils/layaNativeCache.js';
import { runClassifiedScraper } from '../scripts/classifyScraper.js';
import { createJobClassifier } from '../scraper-support/utils/jobClassifier.js';

const now = new Date('2026-10-04T12:00:00Z');
const identity = { modelRevision: CLASSIFICATION_MODEL.revision, runtimeVersion: CLASSIFICATION_MODEL.runtimeVersion,
  runtimeHash: RUNTIME_HASH, policyHash: POLICY_HASH, calibrationHash: 'uncalibrated' };
const probabilities = { 'Full-time Fresher': .1, 'Full-time Experienced': .15, Intern: .7, Contract: .05 };
const prediction = { complete: true, windows: 1, identity, answers: { jobType: { choice: 'Intern', probabilities } }, conflicts: [] };
const job = { title: 'Senior Software Engineer', description: 'Full-time role. Required: 5 years of professional experience.' };

test('one-question native responses validate four percentages and reject missing categories', () => {
  assert.equal(validNativePrediction(prediction, identity), true);
  const missing = structuredClone(prediction);
  delete missing.answers.jobType.probabilities.Contract;
  assert.equal(validNativePrediction(missing, identity), false);
  assert.equal(validNativePrediction({ ...prediction, answers: { ...prediction.answers, experience: prediction.answers.jobType } }, identity), false);
});

test('raw model disagreement is retained independently of the rules result', () => {
  const result = resolveClassification(job, prediction, { now, mode: 'policy' });
  assert.equal(result.resolved.jobType, 'Full-time Experienced');
  assert.deepEqual(result.decisions.jobType, { label: 'Intern', probability: .7, probabilities });
  assert.deepEqual(result.comparison, { modelJobType: 'Intern', logicJobType: 'Full-time Experienced', agreement: false });
  assert.equal(result.reason, 'model_unvalidated');
});

test('company trial reports all four model percentages and its separate rules result', async () => {
  const response = value => ({ ok: true, status: 200, json: async () => value });
  const classifier = createJobClassifier({ mode: 'policy', retryAfterMs: 1, fetch: async url =>
    response(url.endsWith('/health') ? { ready: true, identity, thresholds: CLASSIFICATION_POLICY.thresholds } : prediction) });
  const report = await runClassifiedScraper({ scraper: { name: 'trial', run: async () => [job] }, classifier, now });
  assert.equal(report.results[0].modelJobType, 'Intern');
  assert.equal(report.results[0].logicJobType, 'Full-time Experienced');
  assert.equal(report.results[0].agreement, false);
  assert.deepEqual(report.results[0].modelPercentages, { 'Full-time Fresher': 10, 'Full-time Experienced': 15, Intern: 70, Contract: 5 });
  assert.equal(report.comparison.disagreed, 1);
  assert.equal(report.comparison.agreementRate, 0);
  assert.equal(report.applied, false);
});
