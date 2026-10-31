import test from 'node:test'
import assert from 'node:assert/strict'
import { createClassificationReport, recordClassificationDecision, aggregateClassificationSummaries } from '../classification/reporting.js'
import { postScrapeInput, sourceGuardedClassification, resolvePostScrapeClassification } from '../src/services/postScrapeClassification.js'
import { buildRewriteInput } from '../src/services/jobDescriptionPolicy.js'

const now = new Date('2026-10-31T12:00:00Z')
const labels = ['Full-time Experienced', 'Full-time Fresher', 'Intern', 'Contract']
const prediction = (modelLabel = 'Full-time Experienced') => ({ modelLabel, fullDescriptionCovered: true, windows: 1,
  scores: Object.fromEntries(labels.map(label => [label, label === modelLabel ? .97 : .01])) })
const description = 'Responsibilities: Build and test software for our customers. Requirements: Knowledge of JavaScript.'
const classify = (job, label) => resolvePostScrapeClassification(job, prediction(label), { now, mode: 'policy' })
const rewritten = (sourceDescription, text, title = 'Software Engineer') => {
  const job = { title, sourceDescription, description: text }
  const inputHash = buildRewriteInput(job).inputHash
  return { ...job, sourceContentHash: inputHash, descriptionRewrite: { status: 'published', inputHash,
    policyVersion: 'reviewed-fixture', modelRevision: 'fixture', publishedAt: now.toISOString() } }
}

test('matching model fallback is distinct from a model/final conflict without changing legacy comparisons', () => {
  const parts = [0, 1].map(shard => ({ ...createClassificationReport(), shard, completed: 2, cached: 0, assigned: 2 }))
  const jobs = [
    { title: 'Software Engineer', sourceDescription: description },
    { title: 'Software Engineer', sourceDescription: 'Minimum 3 years of professional experience required.' },
    { title: 'Software Intern', sourceDescription: description },
    { title: 'Engineer', sourceDescription: 'ADVT./2026-27/09 Print Application. ADVT./2026-27/08 Print Application. ADVT./2026-27/07 Print Application.' },
  ]
  for (const [index, job] of jobs.entries()) {
    recordClassificationDecision(parts[Math.floor(index / 2)], { result: classify(job), prediction: prediction() })
  }
  const summary = aggregateClassificationSummaries(parts)
  assert.equal(summary.quality.modelAgreement, 1)
  assert.equal(summary.quality.modelDisagreement, 3)
  assert.equal(summary.quality.modelFinalAgreement, 2)
  assert.equal(summary.quality.modelFinalDisagreement, 2)
  assert.equal(summary.quality.modelFinalUnavailable, 0)
  assert.equal(summary.quality.modelFallback, 1)
  assert.equal(summary.quality.uncertain, 1)
})

test('missing model labels remain unavailable rather than inflating final-label agreement', () => {
  const summary = createClassificationReport()
  recordClassificationDecision(summary, { result: { resolved: { jobType: 'Intern' }, comparison: { agreement: null } } })
  assert.equal(summary.quality.modelFinalAgreement, 0)
  assert.equal(summary.quality.modelFinalDisagreement, 0)
  assert.equal(summary.quality.modelFinalUnavailable, 1)
})

test('a missing saved decision also counts as an unavailable final-label comparison', () => {
  const summary = createClassificationReport()
  recordClassificationDecision(summary, { prediction: prediction() })
  assert.equal(summary.quality.unavailable, 1)
  assert.equal(summary.quality.modelFinalUnavailable, 1)
})

test('legacy shard summaries retain unknown final-label comparison coverage', () => {
  const summary = aggregateClassificationSummaries([{ reportingVersion: 1, completed: 2, cached: 1,
    quality: { modelAgreement: 1, modelDisagreement: 2 } }])
  assert.equal(summary.quality.modelFinalUnavailable, 3)
  assert.equal(summary.quality.modelFinalAgreement, 0)
  assert.equal(summary.quality.modelFinalDisagreement, 0)
  assert.equal(summary.quality.modelDisagreement, 2)
})

test('explicit fresher vacancy titles establish eligibility before an experienced model fallback', () => {
  for (const title of ['Fresher Role', 'Testing Engineer (Fresher)', 'EbizON || Fresher Content Writer II Dehradun']) {
    const job = { title, sourceDescription: description }
    const result = classify(job)
    assert.equal(result.resolved.jobType, 'Full-time Fresher', title)
    assert.equal(result.decisionSource, 'source_policy', title)
    assert.equal(result.resolved.experienceProfile.minimumYears, 0, title)
    assert.equal(result.resolved.experienceProfile.hasExplicitExperience, false, title)
    assert.equal(result.inputHash, postScrapeInput(job, { now }).inputHash)
  }
})

test('mandatory professional experience conflicting with a fresher title remains uncertain', () => {
  for (const sourceDescription of [
    'Minimum 3 years of professional experience required. Build and test software.',
    'Requirements: You must have prior professional experience in software engineering.',
  ]) {
    const result = classify({ title: 'Testing Engineer (Fresher)', sourceDescription })
    assert.equal(result.resolved.jobType, 'Unspecified', sourceDescription)
    assert.equal(result.status, 'uncertain')
    assert.equal(result.reason, 'conflicting_role_eligibility')
    assert.ok(result.sourceQualityIssues.includes('conflicting_role_eligibility'))
    assert.equal(result.resolved.experienceProfile.minimumYears, null)
  }
})

test('training and recruiting freshers, or excluding them, does not establish applicant fresher eligibility', () => {
  for (const title of ['Trainer for Freshers', 'Fresher Recruitment Manager', 'Software Engineer - No Freshers',
    'Software Engineer - Freshers Not Eligible', 'Software Engineer - Freshers cannot apply', 'Software Engineer - Non Fresher',
    "Software Engineer - Freshers aren't eligible", 'Technical Instructor for Freshers', 'Tutors for Freshers',
    'Recruit Freshers - Talent Acquisition Specialist']) {
    assert.notEqual(sourceGuardedClassification({ title, sourceDescription: description }, { now }).resolved.jobType, 'Full-time Fresher', title)
  }
})

test('a fresher title preserves an explicit alternative to prior work experience', () => {
  const sourceDescription = 'Freshers or 2 years of relevant experience are welcome. Build software.'
  for (const title of ['Software Engineer', 'Fresher Software Engineer']) {
    const result = classify({ title, sourceDescription })
    assert.equal(result.resolved.jobType, 'Full-time Fresher', title)
    assert.equal(result.resolved.experienceProfile.minimumYears, 0)
    assert.equal(result.status, 'fallback')
    assert.deepEqual(result.sourceQualityIssues, [])
  }
})

test('lead generation is a task rather than a mandatory seniority requirement', () => {
  const result = classify({ title: 'Fresher Lead Generation Specialist', sourceDescription: description })
  assert.equal(result.resolved.jobType, 'Full-time Fresher')
  assert.deepEqual(result.sourceQualityIssues, [])
  assert.equal(result.resolved.employerExperienceProfile.minimumYears, null)
})

test('ambiguous entry-level title predictions carry review reasons without invented employer years', () => {
  for (const title of ['Graduate Engineer Trainee', 'Trainee Associate Engineer', 'Entry Level Associate', 'Apprentice - Desktop Support']) {
    const result = classify({ title, sourceDescription: description })
    assert.equal(result.resolved.jobType, 'Full-time Experienced', title)
    assert.equal(result.resolved.experienceProfile.minimumYears, null, title)
    assert.ok(result.reviewReasons?.includes('entry_level_title_with_experienced_prediction'), title)
  }
  const supported = classify({ title: 'Graduate Engineer Trainee', sourceDescription: 'Minimum 3 years of professional experience required.' })
  assert.equal(supported.resolved.jobType, 'Full-time Experienced')
  assert.deepEqual(supported.reviewReasons, [])
})

test('review flags survive report aggregation and do not become classification failures', () => {
  const part = createClassificationReport()
  recordClassificationDecision(part, { result: classify({ title: 'Graduate Engineer Trainee', sourceDescription: description }), prediction: prediction() })
  const summary = aggregateClassificationSummaries([part])
  assert.equal(summary.quality.reviewRequired, 1)
  assert.equal(summary.quality.reviewReasons.entry_level_title_with_experienced_prediction, 1)
  assert.equal(summary.resolvedCategories['Full-time Experienced'], 1)
})

test('a validated rewrite cannot erase the employer mandatory experience requirement', () => {
  const job = rewritten('Minimum 5 years of professional experience required. Build software.',
    'Responsibilities: Build and test software. Requirements: No prior work experience required.')
  const original = structuredClone(job)
  assert.equal(postScrapeInput(job, { now }).descriptionOrigin, 'rewrite')
  const result = classify(job, 'Full-time Fresher')
  assert.equal(result.resolved.jobType, 'Full-time Experienced')
  assert.equal(result.resolved.employerExperienceProfile.minimumYears, 5)
  assert.equal(result.inputHash, postScrapeInput(job, { now }).inputHash)
  assert.deepEqual(job, original)
})

test('a validated rewrite cannot manufacture employer professional experience requirements', () => {
  const job = rewritten('No prior work experience required. Fresh graduates are welcome.',
    'Requirements: Minimum 5 years of professional experience required.')
  assert.equal(postScrapeInput(job, { now }).descriptionOrigin, 'rewrite')
  const result = classify(job)
  assert.equal(result.resolved.jobType, 'Full-time Fresher')
  assert.equal(result.resolved.experienceProfile.minimumYears, 0)
  assert.equal(result.resolved.employerExperienceProfile.minimumYears, null)
})

test('a cleaned rewrite cannot hide a recruitment-notice source quality failure', () => {
  const job = rewritten('ADVT./2026-27/09 Print Application. ADVT./2026-27/08 Print Application. ADVT./2026-27/07 Print Application.', description)
  assert.equal(postScrapeInput(job, { now }).descriptionOrigin, 'rewrite')
  const result = classify(job)
  assert.equal(result.resolved.jobType, 'Unspecified')
  assert.equal(result.status, 'uncertain')
  assert.ok(result.sourceQualityIssues.includes('multiple_recruitment_notices_without_role_description'))
})
