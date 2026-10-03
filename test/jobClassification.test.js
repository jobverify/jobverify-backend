import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClassificationInput, resolveClassification, getAuthoritativeClassification, applyClassification } from '../src/services/jobClassificationPolicy.js';
import { normalizeScrapedJob, resolveJobType } from '../scraper-support/utils/normalizeScrapedJob.js';

const now = new Date('2026-10-02T12:00:00Z');
const answers = (employment = 'full_time', experience = 'not_stated', seniority = 'leadership') => ({
  complete: true, windows: 1,
  answers: Object.fromEntries(Object.entries({ employment, experience, seniority, leadership: 'manager' }).map(([key, choice]) => {
    const labels = { employment: ['full_time', 'internship', 'contract', 'other', 'unspecified'], experience: ['fresher_eligible', 'prior_required', 'mixed', 'not_stated'], seniority: ['entry', 'junior', 'mid', 'senior', 'leadership', 'internship', 'unknown'], leadership: ['manager', 'senior_manager', 'director', 'vice_president', 'executive', 'lead', 'unknown'] }[key];
    return [key, { choice, probabilities: Object.fromEntries(labels.map(label => [label, label === choice ? .99 : .01 / (labels.length - 1)])) }];
  })),
});
const classify = (job, prediction, mode = 'enforce') => ({ ...job, classification: resolveClassification(job, prediction, { now, mode }) });

test('uncertain AI decisions map explicit fresher eligibility to the requested zero-year default', () => {
  const result = resolveClassification({ title: 'Project Coordinator', description: 'Support project managers.', sourceEmploymentType: 'Full Time', sourceExperienceRequired: 'Freshers' }, null, { now, mode: 'enforce' });
  assert.equal(result.resolved.jobType, 'Full-time Fresher');
  assert.equal(result.resolved.experiencePolicy, 'fresher_eligible');
  assert.deepEqual(result.resolved.experienceYears, [0]);
  assert.equal(result.resolved.experienceProfile.minimumYears, 0);
  assert.equal(result.resolved.experienceProfile.hasExplicitExperience, false);
  assert.notEqual(result.status, 'accepted');
});

test('an explicit intern vacancy title survives model failure, while internship supervisors do not become interns', () => {
  for (const title of ['Corporate Trainer Intern', 'Product Manager Intern', 'Software Intern (Summer)']) {
    const result = resolveClassification({ title, description: 'An intern placement.', sourceExperienceRequired: '0-1' }, null, { now, mode: 'enforce' });
    assert.equal(result.resolved.jobType, 'Intern');
    assert.notEqual(result.status, 'accepted');
  }
  for (const title of ['Intern Mentor', 'Internship Programme Manager', 'Engineering Manager', 'Intern - Mentor', 'Internship - Programme Manager', 'Engineering Manager - Internship - Coordinator', 'Head of Internship']) {
    const result = resolveClassification({ title, description: 'Manage and mentor interns.' }, null, { now, mode: 'enforce' });
    assert.notEqual(result.resolved.jobType, 'Intern');
  }
});

test('trusted fresher eligibility outranks title-based manager assumptions and contradictory confident AI', () => {
  for (const sourceExperienceRequired of ['Freshers', '0']) {
    const job = { title: 'Relationship Manager', description: 'Full-time graduate recruitment.', sourceEmploymentType: 'Full Time', sourceExperienceRequired };
    const bad = resolveClassification(job, answers('full_time', 'prior_required', 'leadership'), { now, mode: 'enforce' });
    assert.equal(bad.reason, 'source_contradiction');
    assert.equal(bad.resolved.jobType, 'Full-time Fresher');
    const good = resolveClassification(job, answers('full_time', 'fresher_eligible', 'entry'), { now, mode: 'enforce' });
    assert.equal(good.status, 'accepted');
    assert.equal(good.resolved.jobType, 'Full-time Fresher');
  }
});

test('canonical input exposes trusted experience for repeated model context, preserving numeric zero', () => {
  for (const value of ['3-5', 'Freshers', 0]) {
    const input = buildClassificationInput({ title: 'Engineer', description: 'Build software.', sourceExperienceRequired: value }, { now });
    assert.equal(input.sourceExperienceRequired, String(value));
    assert.equal(input.sourceFields.experienceRequired, String(value));
  }
  assert.equal(buildClassificationInput({ title: 'Associate', description: 'Build software.', experienceRequired: '0' }, { now }).sourceExperienceRequired, '');
});

test('manager without numeric experience uses the experienced default range', () => {
  const job = classify({ title: 'Engineering Manager', description: 'Lead the engineering team.' }, answers());
  const normalized = normalizeScrapedJob(job);
  assert.equal(normalized.jobType, 'Full-time Experienced');
  assert.equal(normalized.seniority, 'Manager');
  assert.deepEqual(normalized.experienceYears, Array.from({ length: 15 }, (_, i) => i + 1));
  assert.equal(normalized.experienceProfile.minimumYears, 1);
  assert.equal(normalized.experienceProfile.hasExplicitExperience, false);
  assert.equal(resolveJobType(normalized), 'Full-time Experienced');
  assert.equal(normalizeScrapedJob(normalized).jobType, normalized.jobType);
});

test('2025 graduates in 2026 follow the user-approved cohort filter inference', () => {
  const job = { title: 'Graduate Engineer', description: 'Full-time graduate recruitment. 2025 batch pass outs may apply.' };
  const input = buildClassificationInput(job, { now });
  assert.equal(input.referenceYear, 2026);
  const normalized = normalizeScrapedJob(classify(job, answers('full_time', 'fresher_eligible', 'entry')));
  assert.equal(normalized.jobType, 'Full-time Experienced');
  assert.deepEqual(normalized.experienceYears, [1]);
  assert.equal(normalized.experienceProfile.minimumYears, 1);
  assert.equal(normalized.experienceBasis, 'graduation_cohort');
});

test('an actual internship requiring one year is still an internship', () => {
  const job = { title: 'Finance Intern', description: 'An internship requiring 1 year of finance experience.' };
  const normalized = normalizeScrapedJob(classify(job, answers('internship', 'prior_required', 'internship')));
  assert.equal(normalized.jobType, 'Intern');
  assert.equal(normalized.employmentType, 'Internship');
  assert.equal(normalized.experienceProfile.minimumYears, 0);
  assert.equal(normalized.classification.resolved.employerExperienceProfile.minimumYears, 1);
});

test('management trainee in a full-time graduate programme is not forced into internship', () => {
  const job = { title: 'Management Trainee', description: 'Permanent full-time graduate programme. Freshers are welcome.' };
  assert.equal(normalizeScrapedJob(classify(job, answers('full_time', 'fresher_eligible', 'entry'))).jobType, 'Full-time Fresher');
});

test('shadow results leave public fields unchanged', () => {
  const original = { title: 'Engineer', description: 'Develop software.' };
  const job = classify(original, answers('full_time', 'fresher_eligible', 'entry'), 'shadow');
  assert.equal(getAuthoritativeClassification(job), null);
  assert.equal(normalizeScrapedJob(job).jobType, normalizeScrapedJob(original).jobType);
});

test('malformed, contradictory, incomplete and missing predictions fail conservatively', () => {
  const job = { title: 'Engineering Manager', description: 'Manage a team of engineers.' };
  for (const prediction of [null, { ...answers(), complete: false }, answers('internship', 'fresher_eligible', 'internship'), { ...answers(), answers: { employment: { choice: 'full_time', probabilities: { full_time: NaN } } } }]) {
    const result = resolveClassification(job, prediction, { now, mode: 'enforce' });
    assert.notEqual(result.status, 'accepted');
    assert.equal(applyClassification({ ...job, classification: result }).jobType, 'Full-time Experienced');
    assert.deepEqual(result.resolved.experienceYears, Array.from({ length: 15 }, (_, i) => i + 1));
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 4000);
  }
});

test('identity changes with source facts and reference year, but ignores inferred fields and scrape timestamps', () => {
  const job = { title: 'Graduate', description: '2025 graduates eligible.' };
  const hash = buildClassificationInput(job, { now }).inputHash;
  assert.equal(buildClassificationInput({ ...job, jobType: 'Internship', experienceLevel: 'Entry Level', scrapedAt: new Date() }, { now }).inputHash, hash);
  assert.notEqual(buildClassificationInput({ ...job, description: 'Only experienced graduates.' }, { now }).inputHash, hash);
  assert.notEqual(buildClassificationInput(job, { now: new Date('2027-01-01T00:00:00Z') }).inputHash, hash);
});

test('preferred-only years remain preferred and cannot exclude freshers', () => {
  const job = { title: 'Engineer', description: 'Preferred experience: 1 year. Freshers welcome.' };
  const result = resolveClassification(job, answers('full_time', 'fresher_eligible', 'entry'), { now, mode: 'enforce' });
  assert.equal(result.resolved.jobType, 'Full-time Fresher');
  assert.equal(result.resolved.experienceProfile.minimumYears, 0);
  assert.equal(result.resolved.experienceProfile.preferredMinimumYears, 1);
  assert.deepEqual(result.resolved.experienceYears, [0]);
});

test('preferred years cannot override required years in descriptions or structured qualifications', () => {
  for (const job of [
    { title: 'Engineer', description: 'Required: 2 years of experience. Preferred: 5 years of experience.' },
    { title: 'Engineer', minimumQualification: '2 years of experience required.', preferredQualification: '5 years of experience preferred.' },
  ]) {
    const result = resolveClassification(job, answers('full_time', 'prior_required', 'mid'), { now, mode: 'enforce' });
    assert.equal(result.resolved.experienceProfile.minimumYears, 2);
    assert.equal(result.resolved.experienceProfile.preferredMinimumYears, 5);
  }
});

test('all explicit source arrangements override a contradictory model label', () => {
  for (const [sourceEmploymentType, jobType] of [['Contract', 'Contract'], ['Part-time', 'Others'], ['Apprenticeship', 'Others']]) {
    const result = resolveClassification({ title: 'Engineer', description: 'Do engineering work.', sourceEmploymentType }, answers('full_time', 'prior_required', 'mid'), { now, mode: 'enforce' });
    assert.equal(result.reason, 'source_contradiction');
    assert.equal(result.resolved.jobType, jobType);
  }
});

test('a title-only record is incomplete even if the model is confident', () => {
  const result = resolveClassification({ title: 'Engineering Manager' }, answers(), { now, mode: 'enforce' });
  assert.equal(result.status, 'uncertain');
  assert.equal(result.complete, false);
  assert.equal(result.resolved.jobType, 'Unspecified');
});

test('written-out experience years are retained and no-experience facts cannot become prior-required', () => {
  const word = resolveClassification({ title: 'Engineer', description: 'A full-time job requiring one year of professional experience.' }, answers('full_time', 'prior_required', 'mid'), { now, mode: 'enforce' });
  assert.equal(word.resolved.experienceProfile.minimumYears, 1);
  const zero = resolveClassification({ title: 'Engineer', description: 'No prior experience required.', sourceEmploymentType: 'Full-time' }, answers('full_time', 'prior_required', 'mid'), { now, mode: 'enforce' });
  assert.equal(zero.reason, 'source_contradiction');
  assert.equal(zero.resolved.jobType, 'Full-time Fresher');
});

test('accepted management seniority uses an inferred positive experienced range', () => {
  const result = resolveClassification({ title: 'Engineering Manager', description: 'Manage software engineers.' }, answers(), { now, mode: 'enforce' });
  assert.equal(result.resolved.experiencePolicy, 'prior_required');
  assert.deepEqual(result.resolved.experienceYears, Array.from({ length: 15 }, (_, i) => i + 1));
});
