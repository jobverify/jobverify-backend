import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'

import Job from '../../src/models/Job.js'
import ScraperRun from '../../src/models/ScraperRun.js'
import ScraperStatus from '../../src/models/ScraperStatus.js'
import { runAll } from '../runner.js'
import { upsertScraperStatus, writeScraperRun } from '../utils/scraperPersistence.js'
import { generateFingerprint, saveToDB } from '../utils/saveToDB.js'
import { jobAlertService } from '../../src/services/jobAlertService.js'

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

test('runAll clears the jobs collection before processing scraper results', async () => {
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

    assert.deepEqual(deleteFilters, [{}])
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

test('saveToDB upserts source jobs before recording misses for unseen jobs', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalUpdateMany = Job.updateMany
  const originalDeleteMany = Job.deleteMany

  const operations = []
  let capturedBulkOps = []
  const capturedLifecycleUpdates = []
  let deleteAttempted = false

  Job.bulkWrite = async (bulkOps) => {
    operations.push('bulkWrite')
    capturedBulkOps = bulkOps
    return {
      upsertedCount: bulkOps.length,
      modifiedCount: 0,
    }
  }

  Job.updateMany = (filter, update) => {
    operations.push('updateMany')
    capturedLifecycleUpdates.push({ filter, update })
    return {
      exec: async () => ({
        matchedCount: update.$set?.status === 'expired' ? 1 : 2,
        modifiedCount: update.$set?.status === 'expired' ? 1 : 2,
      }),
    }
  }

  Job.deleteMany = async () => {
    deleteAttempted = true
    return { deletedCount: 0 }
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
    const result = await saveToDB(jobs, 'example-source', { missesBeforeExpiry: 2 })

    assert.deepEqual(operations, ['bulkWrite', 'updateMany', 'updateMany'])
    assert.deepEqual(capturedLifecycleUpdates[0].filter, {
      source: 'example-source',
      status: 'active',
      fingerprint: { $nin: expectedFingerprints },
      missedScrapeCount: { $gte: 1 },
    })
    assert.deepEqual(capturedLifecycleUpdates[0].update, {
      $inc: { missedScrapeCount: 1 },
      $set: { status: 'expired' },
    })
    assert.deepEqual(capturedLifecycleUpdates[1].filter, {
      source: 'example-source',
      status: 'active',
      fingerprint: { $nin: expectedFingerprints },
    })
    assert.deepEqual(capturedLifecycleUpdates[1].update, {
      $inc: { missedScrapeCount: 1 },
    })
    assert.equal(deleteAttempted, false)
    assert.equal(result.inserted, 2)
    assert.equal(result.missed, 3)
    assert.equal(result.expired, 1)
    assert.equal(result.deleted, 0)
    for (const operation of capturedBulkOps) {
      const seenJobState = operation.updateOne.update.$set
      assert.equal(seenJobState.status, 'active')
      assert.equal(seenJobState.missedScrapeCount, 0)
      assert.ok(seenJobState.lastSeenAt instanceof Date)
    }
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.updateMany = originalUpdateMany
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB only enqueues inserted active jobs for WhatsApp alerts', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalFind = Job.find
  const originalEnqueueJobAlertsForJobs = jobAlertService.enqueueJobAlertsForJobs
  const queuedJobs = []

  Job.bulkWrite = async () => ({
    upsertedCount: 2,
    modifiedCount: 0,
    upsertedIds: { 0: 'job-1', 1: 'job-2' },
  })
  Job.find = () => ({
    lean() {
      return this
    },
    exec: async () => [
      { _id: 'job-1', title: 'Frontend Intern', status: 'active' },
      { _id: 'job-2', title: 'Backend Intern', status: 'active' },
    ],
  })
  jobAlertService.enqueueJobAlertsForJobs = (jobs) => {
    queuedJobs.push(...jobs)
  }

  try {
    const result = await saveToDB([
      {
        title: 'Frontend Intern',
        company: 'Example',
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        link: 'https://example.com/jobs/frontend-intern',
      },
      {
        title: 'Backend Intern',
        company: 'Example',
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        link: 'https://example.com/jobs/backend-intern',
      },
    ], 'example-source', { replaceExisting: false })

    assert.equal(result.inserted, 2)
    assert.equal(queuedJobs.length, 2)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.find = originalFind
    jobAlertService.enqueueJobAlertsForJobs = originalEnqueueJobAlertsForJobs
    restoreReadyState()
  }
})

test('saveToDB applies retention to normalized postingDate values', async () => {
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

  const now = Date.now()
  const freshPostingDate = new Date(now - (2 * 24 * 60 * 60 * 1000)).toISOString()
  const stalePostingDate = new Date(now - (20 * 24 * 60 * 60 * 1000)).toISOString()

  try {
    const result = await saveToDB(
      [
        {
          title: 'Fresh Software Engineer',
          company: 'Example',
          location: 'Bengaluru, India',
          city: 'Bangalore',
          link: 'https://example.com/jobs/fresh',
          postingDate: freshPostingDate,
        },
        {
          title: 'Stale Software Engineer',
          company: 'Example',
          location: 'Bengaluru, India',
          city: 'Bangalore',
          link: 'https://example.com/jobs/stale',
          postingDate: stalePostingDate,
        },
        {
          title: 'Stale Fallback Software Engineer',
          company: 'Example',
          location: 'Bengaluru, India',
          city: 'Bangalore',
          link: 'https://example.com/jobs/stale-fallback',
          postingDate: 'not-a-date',
          postedAt: stalePostingDate,
        },
      ],
      'example-source',
      { retentionDays: 10, replaceExisting: false },
    )

    assert.equal(result.filteredOld, 2)
    assert.equal(result.eligibleJobs, 1)
    assert.equal(capturedBulkOps.length, 1)
    assert.equal(
      capturedBulkOps[0].updateOne.update.$set.applyUrl,
      'https://example.com/jobs/fresh',
    )
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB preserves existing source jobs when the replacement write fails', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalUpdateMany = Job.updateMany
  const originalDeleteMany = Job.deleteMany

  let lifecycleAttempted = false
  let deleteAttempted = false

  Job.bulkWrite = async () => {
    throw new Error('bulk write failed')
  }

  Job.updateMany = () => {
    lifecycleAttempted = true
    return {
      exec: async () => ({ matchedCount: 1, modifiedCount: 1 }),
    }
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

    assert.equal(lifecycleAttempted, false)
    assert.equal(deleteAttempted, false)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.updateMany = originalUpdateMany
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB preserves existing jobs when a scrape yields an untrusted zero eligible result', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalUpdateMany = Job.updateMany
  const originalDeleteMany = Job.deleteMany

  let bulkWriteAttempted = false
  const capturedLifecycleUpdates = []
  let deleteAttempted = false

  Job.bulkWrite = async () => {
    bulkWriteAttempted = true
    return { upsertedCount: 0, modifiedCount: 0 }
  }

  Job.updateMany = (filter, update) => {
    capturedLifecycleUpdates.push({ filter, update })
    return {
      exec: async () => ({
        matchedCount: update.$set?.status === 'expired' ? 1 : 3,
        modifiedCount: update.$set?.status === 'expired' ? 1 : 3,
      }),
    }
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
      { missesBeforeExpiry: 2 },
    )

    assert.equal(bulkWriteAttempted, false)
    assert.equal(deleteAttempted, false)
    assert.deepEqual(capturedLifecycleUpdates, [])
    assert.equal(result.eligibleJobs, 0)
    assert.equal(result.deleted, 0)
    assert.equal(result.missed, 0)
    assert.equal(result.expired, 0)
    assert.equal(result.staleCheckSkipped, true)
    assert.match(result.staleCheckReason, /preserved without recording lifecycle misses/i)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.updateMany = originalUpdateMany
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB can record lifecycle misses for an explicitly authoritative empty result', async () => {
  const restoreReadyState = setReadyState(1)
  const originalUpdateMany = Job.updateMany
  const capturedLifecycleUpdates = []

  Job.updateMany = (filter, update) => {
    capturedLifecycleUpdates.push({ filter, update })
    return {
      exec: async () => ({
        matchedCount: update.$set?.status === 'expired' ? 1 : 3,
        modifiedCount: update.$set?.status === 'expired' ? 1 : 3,
      }),
    }
  }

  try {
    const result = await saveToDB(
      [],
      'example-source',
      {
        authoritativeEmpty: true,
        missesBeforeExpiry: 2,
      },
    )

    assert.equal(capturedLifecycleUpdates.length, 2)
    assert.equal(result.missed, 4)
    assert.equal(result.expired, 1)
    assert.equal(result.staleCheckSkipped, false)
    assert.equal(result.staleCheckReason, null)
  } finally {
    Job.updateMany = originalUpdateMany
    restoreReadyState()
  }
})

test('saveToDB filters jobs whose advertised closing date has passed', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalUpdateMany = Job.updateMany
  const originalDeleteMany = Job.deleteMany

  let capturedBulkOps = []

  Job.bulkWrite = async (bulkOps) => {
    capturedBulkOps = bulkOps
    return {
      upsertedCount: bulkOps.length,
      modifiedCount: 0,
    }
  }

  Job.updateMany = () => ({
    exec: async () => ({ matchedCount: 0, modifiedCount: 0 }),
  })
  Job.deleteMany = async () => ({ deletedCount: 0 })

  try {
    const result = await saveToDB(
      [
        {
          title: 'Closed Software Engineer',
          company: 'Example',
          location: 'Bengaluru, India',
          city: 'Bangalore',
          link: 'https://example.com/jobs/closed',
          closingDate: '2026-07-24T00:00:00.000Z',
        },
        {
          title: 'Closing Today Software Engineer',
          company: 'Example',
          location: 'Bengaluru, India',
          city: 'Bangalore',
          link: 'https://example.com/jobs/today',
          closingDate: '2026-07-25T00:00:00.000Z',
        },
      ],
      'example-source',
      {
        now: new Date('2026-07-25T12:00:00.000Z'),
        missesBeforeExpiry: 2,
      },
    )

    assert.equal(result.filteredClosed, 1)
    assert.equal(result.eligibleJobs, 1)
    assert.equal(capturedBulkOps.length, 1)
    assert.equal(
      capturedBulkOps[0].updateOne.update.$set.applyUrl,
      'https://example.com/jobs/today',
    )
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.updateMany = originalUpdateMany
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
      { replaceExisting: false },
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
      missed: 3,
      expired: 1,
      staleCheckSkipped: true,
      staleCheckReason: 'No eligible jobs survived filtering; preserved previous source jobs.',
      retentionDays: 10,
      durationMs: 1250,
    })

    assert.equal('lastJobsFound' in capturedUpdate.$set, false)
    assert.equal('lastEligibleJobsFound' in capturedUpdate.$set, false)
    assert.equal('lastDeleted' in capturedUpdate.$set, false)
    assert.equal('lastMissed' in capturedUpdate.$set, false)
    assert.equal('lastExpired' in capturedUpdate.$set, false)
    assert.ok(capturedUpdate.$set.lastPartialAt instanceof Date)
    assert.match(capturedUpdate.$set.lastPartialReason, /preserved previous source jobs/i)
    assert.equal('lastCompleteJobsFound' in capturedUpdate.$set, false)
    assert.equal('lastCompleteEligibleJobsFound' in capturedUpdate.$set, false)
  } finally {
    ScraperStatus.findOneAndUpdate = originalFindOneAndUpdate
    restoreReadyState()
  }
})

test('upsertScraperStatus records soft failures without incrementing hard failure alerts', async () => {
  const restoreReadyState = setReadyState(1)
  const originalFindOneAndUpdate = ScraperStatus.findOneAndUpdate

  let capturedUpdate = null

  ScraperStatus.findOneAndUpdate = async (_filter, update) => {
    capturedUpdate = update
    return {}
  }

  try {
    await upsertScraperStatus('example-source', {
      success: false,
      softFailure: true,
      upstreamOutage: true,
      failureKind: 'network_or_timeout',
      error: 'HTTP 503 for https://example.com/jobs',
      durationMs: 1000,
    })

    assert.equal(capturedUpdate.$set.lastSuccess, true)
    assert.equal(capturedUpdate.$set.consecutiveFailures, 0)
    assert.equal(capturedUpdate.$set.softFailure, true)
    assert.equal(capturedUpdate.$set.upstreamOutage, true)
    assert.equal(capturedUpdate.$set.failureKind, 'network_or_timeout')
    assert.equal(capturedUpdate.$inc, undefined)
    for (const field of [
      'lastJobsFound',
      'lastEligibleJobsFound',
      'lastCompleteJobsFound',
      'lastCompleteEligibleJobsFound',
      'lastInserted',
      'lastUpdated',
      'lastDeleted',
      'lastMissed',
      'lastExpired',
    ]) {
      assert.equal(field in capturedUpdate.$set, false)
    }
  } finally {
    ScraperStatus.findOneAndUpdate = originalFindOneAndUpdate
    restoreReadyState()
  }
})

test('upsertScraperStatus records hard failures without replacing the last successful job counts', async () => {
  const restoreReadyState = setReadyState(1)
  const originalFindOneAndUpdate = ScraperStatus.findOneAndUpdate

  let capturedUpdate = null
  ScraperStatus.findOneAndUpdate = async (_filter, update) => {
    capturedUpdate = update
    return {}
  }

  try {
    await upsertScraperStatus('example-source', {
      success: false,
      softFailure: false,
      failureKind: 'parser_or_contract_error',
      error: 'Unexpected Workday response contract',
      durationMs: 1000,
    })

    assert.equal(capturedUpdate.$set.lastSuccess, false)
    assert.equal(capturedUpdate.$inc.consecutiveFailures, 1)
    for (const field of [
      'lastJobsFound',
      'lastEligibleJobsFound',
      'lastCompleteJobsFound',
      'lastCompleteEligibleJobsFound',
      'lastInserted',
      'lastUpdated',
      'lastDeleted',
      'lastMissed',
      'lastExpired',
    ]) {
      assert.equal(field in capturedUpdate.$set, false)
    }
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
        missed: 3,
        expired: 1,
        staleCheckSkipped: true,
        staleCheckReason: 'No eligible jobs survived filtering; preserved previous source jobs.',
      },
    })

    assert.equal(capturedPayload.sources['example-source'].staleCheckSkipped, true)
    assert.equal(capturedPayload.sources['example-source'].deleted, 0)
    assert.equal(capturedPayload.sources['example-source'].missed, 3)
    assert.equal(capturedPayload.sources['example-source'].expired, 1)
    assert.match(
      capturedPayload.sources['example-source'].staleCheckReason,
      /preserved previous source jobs/i,
    )
  } finally {
    ScraperRun.create = originalCreate
    restoreReadyState()
  }
})
