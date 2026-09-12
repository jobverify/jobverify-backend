import assert from 'node:assert/strict'
import test from 'node:test'

import {
  acquireMongoRunLease,
  MongoRunLeaseHeldError,
} from '../utils/runLease.js'

test('Mongo run lease releases only the owner record', async () => {
  const calls = []
  const collection = {
    findOneAndUpdate: async () => ({ ownerId: 'owner-a' }),
    deleteOne: async (filter) => {
      calls.push(filter)
      return { deletedCount: 1 }
    },
  }

  const lease = await acquireMongoRunLease({
    collection,
    ownerId: 'owner-a',
    heartbeatIntervalMs: 0,
  })
  await lease.release()

  assert.deepEqual(calls, [{ _id: 'jobverify-live-scraper', ownerId: 'owner-a' }])
})

test('Mongo run lease reports the active owner instead of allowing a duplicate run', async () => {
  const collection = {
    findOneAndUpdate: async () => {
      const error = new Error('duplicate key')
      error.code = 11000
      throw error
    },
    findOne: async () => ({
      ownerId: 'owner-existing',
      hostname: 'build-host',
      pid: 4421,
      expiresAt: new Date('2026-09-12T06:02:00.000Z'),
    }),
  }

  await assert.rejects(
    acquireMongoRunLease({
      collection,
      ownerId: 'owner-new',
      heartbeatIntervalMs: 0,
      now: () => new Date('2026-09-12T06:00:00.000Z'),
    }),
    (error) => {
      assert.ok(error instanceof MongoRunLeaseHeldError)
      assert.match(error.message, /build-host/)
      assert.match(error.message, /4421/)
      return true
    },
  )
})
