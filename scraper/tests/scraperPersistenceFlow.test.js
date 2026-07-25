import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'

import Job from '../../src/models/Job.js'
import ScraperRun from '../../src/models/ScraperRun.js'
import ScraperStatus from '../../src/models/ScraperStatus.js'
import { runAll } from '../runner.js'
import { upsertScraperStatus, writeScraperRun } from '../utils/scraperPersistence.js'
import { generateFingerprint, saveToDB } from '../utils/saveToDB.js'

const setReadyState = (value) => {
  const hadOwn = Object.prototype.hasOwnProperty.call(mongoose.connection, 'readyState')
  const original = hadOwn
    ? Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState')
    : null

  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value,
  })

  return () => {
    if (hadOwn && original) {
      Object.defineProperty(mongoose.connection, 'readyState', original)
      return
    }

    delete mongoose.connection.readyState
  }
}

test('runAll does not clear the jobs collection before processing scraper results', async () => {
  const restoreReadyState = setReadyState(1)
  const originalDeleteMany = Job.deleteMany
  const originalFindOneAndUpdate = ScraperStatus.findOneAndUpdate
  const originalFindOne = ScraperStatus.findOne
  const originalCreate = ScraperRun.create

  const deleteFilters = []

  Job.deleteMany = async (filter) => {
    deleteFilters.push(filter)
    return { deletedCount: 0 }
  }

  ScraperStatus.findOneAndUpdate = async () => ({})
  ScraperStatus.findOne = () => ({
    lean() {
      return {
        exec: async () => ({ isActive: false }),
      }
    },
  })
  ScraperRun.create = async () => ({})

  try {
    await runAll()

    assert.deepEqual(deleteFilters, [])
  } finally {
    Job.deleteMany = originalDeleteMany
    ScraperStatus.findOneAndUpdate = originalFindOneAndUpdate
    ScraperStatus.findOne = originalFindOne
    ScraperRun.create = originalCreate
    restoreReadyState()
  }
})

test('generateFingerprint tolerates jobs whose location cannot be normalized into a city', () => {
  const fingerprint = generateFingerprint({
    title: 'Software Engineer',
    company: 'Example',
    location: 'Multiple locations',
    city: null,
    link: 'https://example.com/job-1',
  })

  assert.equal(typeof fingerprint, 'string')
  assert.equal(fingerprint.length, 64)
})

test('saveToDB upserts source jobs before removing stale jobs from that source', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany

  const operations = []
  let capturedDeleteFilter = null

  Job.bulkWrite = async (bulkOps) => {
    operations.push('bulkWrite')
    return {
      upsertedCount: bulkOps.length,
      modifiedCount: 0,
    }
  }

  Job.deleteMany = async (filter) => {
    operations.push('deleteMany')
    capturedDeleteFilter = filter
    return { deletedCount: 2 }
  }

  const jobs = [
    {
      title: 'Software Engineer',
      company: 'Example',
      location: 'Bengaluru, India',
      city: 'Bangalore',
      link: 'https://example.com/job-1',
    },
    {
      title: 'QA Engineer',
      company: 'Example',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      link: 'https://example.com/job-2',
    },
  ]

  const expectedFingerprints = jobs.map((job) => generateFingerprint(job))

  try {
    const result = await saveToDB(jobs, 'example-source')

    assert.deepEqual(operations, ['bulkWrite', 'deleteMany'])
    assert.deepEqual(capturedDeleteFilter, {
      source: 'example-source',
      fingerprint: { $nin: expectedFingerprints },
    })
    assert.equal(result.inserted, 2)
    assert.equal(result.deleted, 2)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB preserves existing source jobs when the replacement write fails', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany

  let deleteAttempted = false

  Job.bulkWrite = async () => {
    throw new Error('bulk write failed')
  }

  Job.deleteMany = async () => {
    deleteAttempted = true
    return { deletedCount: 1 }
  }

  try {
    await assert.rejects(
      saveToDB(
        [
          {
            title: 'Software Engineer',
            company: 'Example',
            location: 'Bengaluru, India',
            city: 'Bangalore',
            link: 'https://example.com/job-1',
          },
        ],
        'example-source',
      ),
      /bulk write failed/,
    )

    assert.equal(deleteAttempted, false)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB skips stale deletion when a scrape yields zero eligible jobs', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany

  let bulkWriteAttempted = false
  let deleteAttempted = false

  Job.bulkWrite = async () => {
    bulkWriteAttempted = true
    return { upsertedCount: 0, modifiedCount: 0 }
  }

  Job.deleteMany = async () => {
    deleteAttempted = true
    return { deletedCount: 0 }
  }

  try {
    const result = await saveToDB(
      [
        {
          title: 'Staff Engineer',
          company: 'Example',
          location: 'Remote',
          city: 'Remote',
          link: 'https://example.com/staff-role',
        },
      ],
      'example-source',
    )

    assert.equal(bulkWriteAttempted, false)
    assert.equal(deleteAttempted, false)
    assert.equal(result.eligibleJobs, 0)
    assert.equal(result.deleted, 0)
    assert.equal(result.staleCheckSkipped, true)
    assert.match(result.staleCheckReason, /no eligible jobs/i)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB persists unified normalized fields alongside the legacy job shape', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany

  let capturedBulkOps = []

  Job.bulkWrite = async (bulkOps) => {
    capturedBulkOps = bulkOps
    return {
      upsertedCount: bulkOps.length,
      modifiedCount: 0,
    }
  }

  Job.deleteMany = async () => ({ deletedCount: 0 })

  try {
    await saveToDB(
      [
        {
          title: 'SDE II',
          company: 'Example Corp',
          location: 'Bengaluru, India',
          city: 'Bangalore',
          department: 'Platform Engineering',
          link: 'https://careers.example.com/jobs/123',
          jobId: 'JR-123',
          companyCareerPage: 'https://careers.example.com',
          atsPlatform: 'workday',
          requiredSkills: ['Node.js', 'AWS'],
        },
      ],
      'example-source',
    )

    const persistedJob = capturedBulkOps[0].updateOne.update.$set

    assert.equal(persistedJob.title, 'SDE II')
    assert.equal(persistedJob.originalTitle, 'SDE II')
    assert.equal(persistedJob.normalizedTitle, 'Software Engineer')
    assert.equal(persistedJob.jobCategory, 'Software Engineer')
    assert.equal(persistedJob.engineeringDomain, 'Software Engineering')
    assert.equal(persistedJob.applyUrl, 'https://careers.example.com/jobs/123')
    assert.equal(persistedJob.sourceUrl, 'https://careers.example.com/jobs/123')
    assert.equal(persistedJob.companyCareerPage, 'https://careers.example.com')
    assert.equal(persistedJob.companyDomain, 'careers.example.com')
    assert.equal(persistedJob.atsPlatform, 'workday')
    assert.equal(persistedJob.jobId, 'JR-123')
    assert.equal(persistedJob.country, 'India')
    assert.equal(persistedJob.jobType, 'Full-time Experienced')
    assert.equal(persistedJob.employmentType, 'Full-time')
    assert.equal(persistedJob.experienceLevel, 'Mid Level')
    assert.deepEqual(persistedJob.requiredSkills, ['Node.js', 'AWS'])
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('upsertScraperStatus records partial scrape details without overwriting last complete counts', async () => {
  const restoreReadyState = setReadyState(1)
  const originalFindOneAndUpdate = ScraperStatus.findOneAndUpdate

  let capturedUpdate = null

  ScraperStatus.findOneAndUpdate = async (_filter, update) => {
    capturedUpdate = update
    return {}
  }

  try {
    await upsertScraperStatus('example-source', {
      success: true,
      jobs: 0,
      eligibleJobs: 0,
      inserted: 0,
      updated: 0,
      deleted: 0,
      staleCheckSkipped: true,
      staleCheckReason: 'No eligible jobs survived filtering; preserved previous source jobs.',
      retentionDays: 10,
      durationMs: 1250,
    })

    assert.equal(capturedUpdate.$set.lastJobsFound, 0)
    assert.equal(capturedUpdate.$set.lastEligibleJobsFound, 0)
    assert.ok(capturedUpdate.$set.lastPartialAt instanceof Date)
    assert.match(capturedUpdate.$set.lastPartialReason, /preserved previous source jobs/i)
    assert.equal('lastCompleteJobsFound' in capturedUpdate.$set, false)
    assert.equal('lastCompleteEligibleJobsFound' in capturedUpdate.$set, false)
  } finally {
    ScraperStatus.findOneAndUpdate = originalFindOneAndUpdate
    restoreReadyState()
  }
})

test('writeScraperRun stores when stale cleanup was skipped for a partial source refresh', async () => {
  const restoreReadyState = setReadyState(1)
  const originalCreate = ScraperRun.create

  let capturedPayload = null

  ScraperRun.create = async (payload) => {
    capturedPayload = payload
    return payload
  }

  try {
    await writeScraperRun(new Date('2026-06-13T00:00:00.000Z'), {
      'example-source': {
        success: true,
        jobs: 0,
        eligibleJobs: 0,
        inserted: 0,
        updated: 0,
        deleted: 0,
        staleCheckSkipped: true,
        staleCheckReason: 'No eligible jobs survived filtering; preserved previous source jobs.',
      },
    })

    assert.equal(capturedPayload.sources['example-source'].staleCheckSkipped, true)
    assert.match(
      capturedPayload.sources['example-source'].staleCheckReason,
      /preserved previous source jobs/i,
    )
  } finally {
    ScraperRun.create = originalCreate
    restoreReadyState()
  }
})
