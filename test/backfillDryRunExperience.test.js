import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildRequestedSourceDirectoryNames,
  isUncheckedMissingExperienceJob,
  prioritizeBackfillTargets,
  selectUncheckedMissingExperienceJobs,
} from '../scripts/backfillDryRunExperience.js'

test('buildRequestedSourceDirectoryNames resolves logical source ids to dry-run directory names', () => {
  const requestedSources = new Set(['thales', 'abb', 'jlltechnologies'])
  const scrapers = [
    {
      name: 'thales',
      dryRunFile: 'C:/repo/jobverify-backend/scraper/thales.workday/jobs.json',
    },
    {
      name: 'abb',
      dryRunFile: 'C:/repo/jobverify-backend/scraper/abb.workday/jobs.json',
    },
    {
      name: 'jlltechnologies',
      dryRunFile: 'C:/repo/jobverify-backend/scraper/jlltechnologies.workday/jobs.json',
    },
  ]

  const resolved = [...buildRequestedSourceDirectoryNames(requestedSources, scrapers)].sort()

  assert.deepEqual(resolved, [
    'abb',
    'abb.workday',
    'jlltechnologies',
    'jlltechnologies.workday',
    'thales',
    'thales.workday',
  ])
})

test('prioritizeBackfillTargets preserves explicit requested source order for targeted reruns', () => {
  const targets = [
    { source: 'railtel', missingBefore: 245 },
    { source: 'cmscomputers', missingBefore: 227 },
    { source: 'quesscorp', missingBefore: 227 },
  ]

  const prioritized = prioritizeBackfillTargets(
    targets,
    ['cmscomputers', 'quesscorp', 'railtel'],
  )

  assert.deepEqual(
    prioritized.map((target) => target.source),
    ['cmscomputers', 'quesscorp', 'railtel'],
  )
})

test('isUncheckedMissingExperienceJob only targets jobs that are still unchecked and missing experience', () => {
  assert.equal(isUncheckedMissingExperienceJob({
    experienceRequired: null,
    publicExperienceChecked: false,
  }), true)

  assert.equal(isUncheckedMissingExperienceJob({
    experienceRequired: '5 years',
    publicExperienceChecked: false,
  }), false)

  assert.equal(isUncheckedMissingExperienceJob({
    experienceRequired: null,
    publicExperienceChecked: true,
  }), false)
})

test('selectUncheckedMissingExperienceJobs returns the first unchecked missing jobs up to the requested batch size', () => {
  const jobs = [
    { title: 'verified-missing', experienceRequired: null, publicExperienceChecked: true },
    { title: 'filled', experienceRequired: '2 years', publicExperienceChecked: false },
    { title: 'first-unchecked', experienceRequired: null, publicExperienceChecked: false },
    { title: 'second-unchecked', experienceRequired: '', publicExperienceChecked: false },
    { title: 'third-unchecked', experienceRequired: null, publicExperienceChecked: false },
  ]

  assert.deepEqual(
    selectUncheckedMissingExperienceJobs(jobs, 2).map((job) => job.title),
    ['first-unchecked', 'second-unchecked'],
  )

  assert.deepEqual(
    selectUncheckedMissingExperienceJobs(jobs).map((job) => job.title),
    ['first-unchecked', 'second-unchecked', 'third-unchecked'],
  )
})
