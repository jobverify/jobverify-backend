import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveClassification, CLASSIFICATION_POLICY } from '../src/services/jobClassificationPolicy.js';
import { buildJobFilterConditions, jobMatchesSavedFilters } from '../src/services/jobFilterMatcher.js';
import { normalizeJobListResponseJob } from '../src/controllers/jobController.js';
import { normalizeScrapedJob } from '../scraper-support/utils/normalizeScrapedJob.js';
import { buildSemanticExperienceConstraint } from '../src/utils/classifiedExperienceFilters.js';

test('unknown classification survives API response normalization without leaking provenance', () => {
  const job = { title: 'Engineer', description: 'Build software.', experienceProfile: { minimumYears: null } };
  const normalized = normalizeScrapedJob({ ...job, classification: resolveClassification(job, null, { mode: 'enforce' }) });
  const response = normalizeJobListResponseJob(normalized);
  assert.equal(response.jobType, 'Unspecified');
  assert.equal(response.experienceLevel, null);
  assert.equal(response.classification, undefined);
});

test('semantic fresher eligibility matches zero experience without inventing numeric years', () => {
  const job = { title: 'Graduate', jobType: 'Full-time Fresher', experienceYears: [], classification: { authoritative: true, mode: 'enforce', policyVersion: CLASSIFICATION_POLICY.version, status: 'accepted', resolved: { jobType: 'Full-time Fresher', experiencePolicy: 'fresher_eligible' } } };
  assert.equal(jobMatchesSavedFilters({ job, filters: { experienceYear: '0' } }), true);
  assert.equal(jobMatchesSavedFilters({ job, filters: { experienceYear: '1' } }), false);
  assert.ok(JSON.stringify(buildJobFilterConditions({ experienceYear: '0' })).includes('classification.resolved.experiencePolicy'));
});

test('unspecified experience filter matches uncertain results but excludes nonnumeric prior-required roles', () => {
  const base = { jobType: 'Unspecified', experienceYears: [], experienceBucket: 'unspecified' };
  const result = resolveClassification({ title: 'Engineer' }, null, { mode: 'enforce' });
  assert.equal(jobMatchesSavedFilters({ job: { ...base, classification: result }, filters: { experienceYear: 'unspecified' } }), true);
  const manager = { ...base, jobType: 'Full-time Experienced', classification: { ...result, status: 'accepted', resolved: { ...result.resolved, jobType: 'Full-time Experienced', experiencePolicy: 'prior_required', seniority: 'Manager' } } };
  assert.equal(jobMatchesSavedFilters({ job: manager, filters: { experienceYear: 'unspecified' } }), false);
  assert.ok(buildSemanticExperienceConstraint('unspecified'));
});
