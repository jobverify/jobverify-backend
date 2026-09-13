import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import mongoose from 'mongoose'
import Job from '../../src/models/Job.js'
import { generateFingerprint, saveToDB } from '../utils/saveToDB.js'
import { run as greatLearning } from '../../scraper/greatlearning/script.js'
import { run as excelra } from '../../scraper/excelraknowledgesolutions/script.js'

const fixture = file => readFileSync(new URL('./fixtures/' + file, import.meta.url), 'utf8')
for (const [source, count, run] of [
  ['greatlearning', 5, () => greatLearning({ fetchText: async () => fixture('greatlearning/current-openings.html') })],
  ['excelraknowledgesolutions', 7, () => excelra({ fetchJson: async () => JSON.parse(fixture('excelraknowledgesolutions/current-openings.json')) })],
]) test(source + ' preserves every recovered role through real persistence despite shared application URLs', async t => {
  const state = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState')
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 1 })
  t.after(() => { if (state) Object.defineProperty(mongoose.connection, 'readyState', state); else delete mongoose.connection.readyState })
  let writes = []
  t.mock.method(Job, 'bulkWrite', async operations => { writes = operations; return { modifiedCount: 0, upsertedCount: operations.length } })
  t.mock.method(Job, 'updateMany', () => ({ exec: async () => ({ modifiedCount: 0 }) }))
  const jobs = await run()
  assert.equal(jobs.length, count)
  assert.ok(jobs.every(job => job.applicationUrlIsGeneric === true && job.requisitionId))
  assert.equal(new Set(jobs.map(generateFingerprint)).size, count)
  const result = await saveToDB(jobs, source, { enrichPublicExperience: false, refreshDatasetSummary: false })
  assert.equal(writes.length, count)
  assert.equal(new Set(writes.map(operation => operation.updateOne.filter.fingerprint)).size, count)
  assert.equal(result.inserted, count)
})
