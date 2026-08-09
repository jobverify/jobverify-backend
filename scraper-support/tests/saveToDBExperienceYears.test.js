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
