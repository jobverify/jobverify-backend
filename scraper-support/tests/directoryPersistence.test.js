import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import Job from '../../src/models/Job.js'
import { saveToDB } from '../utils/saveToDB.js'
import { createWellfoundDirectoryScraper } from '../wellfoundDirectory/engine.js'

test('a visible Wellfound page saves genuine jobs without expiring unseen paginated vacancies', async (t) => {
  const state = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState')
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 1 })
  t.after(() => { if (state) Object.defineProperty(mongoose.connection, 'readyState', state); else delete mongoose.connection.readyState })
  let writes = []
  const lifecycleUpdates = []
  t.mock.method(Job, 'bulkWrite', async (operations) => { writes = operations; return { modifiedCount: 1, upsertedCount: 0 } })
  t.mock.method(Job, 'updateMany', (filter) => {
    lifecycleUpdates.push(filter)
    return { exec: async () => ({ modifiedCount: 1 }) }
  })
  const jobs = await createWellfoundDirectoryScraper({ companyName: 'Example', companyCareerPage: 'https://wellfound.com/company/example/jobs', source: 'example.wellfoundDirectory' }).run({
    fetchText: async () => '<article><a href="/jobs/1234567-engineer">Software Engineer</a><span data-location>Bengaluru, India</span></article><button>Load more jobs</button>',
  })
  const result = await saveToDB(jobs, 'example.wellfoundDirectory', { enrichPublicExperience: false, refreshDatasetSummary: false })
  assert.equal(writes.length, 1)
  assert.deepEqual(lifecycleUpdates, [])
  assert.equal(result.staleCheckSkipped, true)
  assert.match(result.staleCheckReason, /incomplete/i)
  assert.equal(result.expired, 0)
});
