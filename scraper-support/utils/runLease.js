import { randomUUID } from 'node:crypto'
import os from 'node:os'
import mongoose from 'mongoose'

import connectDB from '../../db/db.js'

export const DEFAULT_RUN_LEASE_ID = 'jobverify-live-scraper'
export const DEFAULT_RUN_LEASE_MS = 2 * 60 * 1000
export const DEFAULT_RUN_LEASE_HEARTBEAT_MS = 30 * 1000

export class MongoRunLeaseHeldError extends Error {
  constructor(lease = {}) {
    const owner = [lease.hostname, lease.pid].filter(Boolean).join(':') || lease.ownerId || 'unknown owner'
    super(
      `Another live scraper owns the MongoDB run lease (${owner}) until `
      + `${lease.expiresAt ? new Date(lease.expiresAt).toISOString() : 'an unknown time'}.`,
    )
    this.name = 'MongoRunLeaseHeldError'
    this.exitCode = 75
    this.lease = lease
  }
}

const resolveCollection = async (collection) => {
  if (collection) return collection
  if (mongoose.connection.readyState === 0) await connectDB()
  return mongoose.connection.db.collection('scraper_run_leases')
}

export const acquireMongoRunLease = async ({
  collection = null,
  leaseId = DEFAULT_RUN_LEASE_ID,
  ownerId = randomUUID(),
  runId = null,
  leaseMs = DEFAULT_RUN_LEASE_MS,
  heartbeatIntervalMs = DEFAULT_RUN_LEASE_HEARTBEAT_MS,
  hostname = os.hostname(),
  pid = process.pid,
  now = () => new Date(),
  onLost = (error) => console.error(`[runner] MongoDB run lease lost: ${error.message}`),
} = {}) => {
  const leases = await resolveCollection(collection)
  const acquiredAt = now()
  const expiresAt = new Date(acquiredAt.getTime() + leaseMs)
  let document

  try {
    document = await leases.findOneAndUpdate(
      {
        _id: leaseId,
        $or: [
          { expiresAt: { $lte: acquiredAt } },
          { ownerId },
        ],
      },
      {
        $set: {
          ownerId,
          runId,
          hostname,
          pid,
          acquiredAt,
          heartbeatAt: acquiredAt,
          expiresAt,
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
  } catch (error) {
    if (error?.code !== 11000) throw error
    const activeLease = await leases.findOne({ _id: leaseId })
    throw new MongoRunLeaseHeldError(activeLease || {})
  }

  if (!document || document.ownerId !== ownerId) {
    throw new MongoRunLeaseHeldError(document || {})
  }

  let released = false
  let renewing = false
  let lossReported = false
  const renew = async () => {
    if (released || renewing) return
    renewing = true
    try {
      const heartbeatAt = now()
      const result = await leases.updateOne(
        { _id: leaseId, ownerId },
        {
          $set: {
            heartbeatAt,
            expiresAt: new Date(heartbeatAt.getTime() + leaseMs),
          },
        },
      )
      if (result.matchedCount !== 1) {
        throw new MongoRunLeaseHeldError(await leases.findOne({ _id: leaseId }) || {})
      }
    } catch (error) {
      if (!lossReported) {
        lossReported = true
        onLost(error)
      }
    } finally {
      renewing = false
    }
  }

  const heartbeatTimer = heartbeatIntervalMs > 0
    ? setInterval(renew, heartbeatIntervalMs)
    : null
  heartbeatTimer?.unref?.()

  return {
    ownerId,
    async release() {
      if (released) return
      released = true
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      await leases.deleteOne({ _id: leaseId, ownerId })
    },
  }
}
