import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'

import Job from '../../src/models/Job.js'
import { saveToDB } from '../utils/saveToDB.js'

const setReadyState = (value) => {
  const descriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState')
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value,
  })

  return () => {
    if (descriptor) Object.defineProperty(mongoose.connection, 'readyState', descriptor)
    else delete mongoose.connection.readyState
  }
}

test('quota recovery deletes oldest expired jobs until the 10 MB estimate is reached', async () => {
  const { purgeExpiredJobsForQuotaRecovery } = await import('../utils/saveToDB.js')
  const deletedIds = []
  const jobs = [
    { _id: 'oldest', lastSeenAt: new Date('2026-01-01T00:00:00.000Z'), payload: 'a'.repeat(700) },
    { _id: 'next', lastSeenAt: new Date('2026-01-02T00:00:00.000Z'), payload: 'b'.repeat(700) },
  ]
  const jobModel = {
    find() {
      return {
        sort() { return this },
        limit() { return this },
        lean() { return this },
        exec: async () => jobs.splice(0, 1),
      }
    },
    deleteMany: async ({ _id }) => {
      deletedIds.push(..._id.$in)
      return { deletedCount: _id.$in.length }
    },
  }

  const result = await purgeExpiredJobsForQuotaRecovery({
    jobModel,
    now: new Date('2026-02-01T00:00:00.000Z'),
    retentionDays: 30,
    targetBytes: 600,
    batchSize: 1,
  })

  assert.deepEqual(deletedIds, ['oldest'])
  assert.equal(result.deletedCount, 1)
  assert.ok(result.estimatedBytes >= 600)
})

test('saveToDB persists normalized experience years for filtering', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany
  let persistedJob

  Job.bulkWrite = async (operations) => {
    persistedJob = operations[0].updateOne.update.$set
    return { upsertedCount: operations.length, modifiedCount: 0 }
  }
  Job.deleteMany = async () => ({ deletedCount: 0 })

  try {
    await saveToDB([{
      title: 'Backend Engineer',
      company: 'Example Corp',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      link: 'https://careers.example.com/jobs/2',
      experienceRequired: '2 years of backend engineering experience',
    }], 'example-source', {
      refreshDatasetSummary: false,
      replaceExisting: false,
    })

    assert.deepEqual(persistedJob.experienceYears, [2])
    assert.equal(persistedJob.publicExperienceChecked, false)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB enriches missing experience from the official public job page before persisting', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany
  let persistedJob

  Job.bulkWrite = async (operations) => {
    persistedJob = operations[0].updateOne.update.$set
    return { upsertedCount: operations.length, modifiedCount: 0 }
  }
  Job.deleteMany = async () => ({ deletedCount: 0 })

  try {
    await saveToDB([{
      title: 'Cloud Engineer',
      company: 'Virtusa',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      link: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
      applyUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
      sourceUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
      experienceRequired: null,
    }], 'virtusa', {
      refreshDatasetSummary: false,
      replaceExisting: false,
      fetchText: async () => `
        <html>
          <body>
            <h1>Cloud Engineer</h1>
            <section>
              <h6>Required Experience</h6>
              <div>5</div>
            </section>
          </body>
        </html>
      `,
    })

    assert.equal(persistedJob.experienceRequired, '5 years')
    assert.deepEqual(persistedJob.experienceYears, [5])
    assert.equal(persistedJob.publicExperienceChecked, true)
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB reports enrichment and bulk write stage boundaries', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany
  const stages = []

  Job.bulkWrite = async (operations) => ({
    upsertedCount: operations.length,
    modifiedCount: 0,
  })
  Job.deleteMany = async () => ({ deletedCount: 0 })

  try {
    await saveToDB([{
      title: 'Cloud Engineer',
      company: 'Virtusa',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      link: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
      applyUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
      sourceUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
      experienceRequired: null,
    }], 'virtusa', {
      refreshDatasetSummary: false,
      replaceExisting: false,
      useBrowserFallback: false,
      onStage: (event) => stages.push(`${event.stage}:${event.status}`),
      fetchText: async () => `
        <html>
          <body>
            <h1>Cloud Engineer</h1>
            <section>
              <h6>Required Experience</h6>
              <div>5</div>
            </section>
          </body>
        </html>
      `,
    })

    assert.deepEqual(stages, [
      'enrichment:start',
      'enrichment:done',
      'bulkWrite:start',
      'bulkWrite:done',
    ])
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})

test('saveToDB does not start bulk write after a lifecycle abort', async () => {
  const restoreReadyState = setReadyState(1)
  const originalBulkWrite = Job.bulkWrite
  const originalDeleteMany = Job.deleteMany
  const controller = new AbortController()
  const abortReason = new Error('source lifecycle expired')
  const stages = []
  let bulkWriteStarted = false

  Job.bulkWrite = async () => {
    bulkWriteStarted = true
    return { upsertedCount: 1, modifiedCount: 0 }
  }
  Job.deleteMany = async () => ({ deletedCount: 0 })

  try {
    await assert.rejects(
      saveToDB([{
        title: 'Cloud Engineer',
        company: 'Virtusa',
        location: 'Hyderabad, India',
        city: 'Hyderabad',
        link: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
        applyUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
        sourceUrl: 'https://www.virtusa.com/careers/job-search/in/cloud-engineer-vrt-123',
        experienceRequired: '5 years',
      }], 'virtusa', {
        refreshDatasetSummary: false,
        replaceExisting: false,
        enrichPublicExperience: false,
        signal: controller.signal,
        onStage: (event) => {
          stages.push(`${event.stage}:${event.status}`)
          if (event.stage === 'enrichment' && event.status === 'skipped') {
            controller.abort(abortReason)
          }
        },
      }),
      abortReason,
    )

    assert.equal(bulkWriteStarted, false)
    assert.deepEqual(stages, ['enrichment:skipped'])
  } finally {
    Job.bulkWrite = originalBulkWrite
    Job.deleteMany = originalDeleteMany
    restoreReadyState()
  }
})
