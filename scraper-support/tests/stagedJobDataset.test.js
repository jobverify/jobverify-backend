import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'

import Job from '../../src/models/Job.js'
import StagedJob from '../../src/models/StagedJob.js'
import { jobAlertService } from '../../src/services/jobAlertService.js'
import {
  promoteStagedJobDataset,
  resolveSourcesToCarryForward,
  shouldUseStagedJobDatasetRun,
} from '../utils/stagedJobDataset.js'

const setConnectionState = ({ readyState, db = null }) => {
  const originalReadyState = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState')
  const originalDb = Object.getOwnPropertyDescriptor(mongoose.connection, 'db')

  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    value: readyState,
  })
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    value: db,
  })

  return () => {
    if (originalReadyState) {
      Object.defineProperty(mongoose.connection, 'readyState', originalReadyState)
    } else {
      delete mongoose.connection.readyState
    }

    if (originalDb) {
      Object.defineProperty(mongoose.connection, 'db', originalDb)
    } else {
      delete mongoose.connection.db
    }
  }
}

test('shouldUseStagedJobDatasetRun only enables staged swaps for full live runs', () => {
  assert.equal(shouldUseStagedJobDatasetRun({ dryRun: false }), true)
  assert.equal(shouldUseStagedJobDatasetRun({ dryRun: true }), false)
  assert.equal(shouldUseStagedJobDatasetRun({ dryRun: false, onlySources: 'alpha' }), false)
  assert.equal(shouldUseStagedJobDatasetRun({ dryRun: false, startAt: 'alpha' }), false)
  assert.equal(shouldUseStagedJobDatasetRun({ dryRun: false, startAfter: 'alpha' }), false)
})

test('resolveSourcesToCarryForward preserves failed, skipped, partial, and unattempted sources', () => {
  assert.deepEqual(
    resolveSourcesToCarryForward({
      selectedSources: ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'],
      summary: {
        alpha: { success: true, jobs: 4, staleCheckSkipped: false },
        beta: { success: false, error: 'DNS failure' },
        gamma: { success: true, skipped: true },
        delta: {
          success: true,
          jobs: 0,
          staleCheckSkipped: true,
          staleCheckReason: 'No eligible jobs survived filtering.',
        },
        epsilon: { success: true, jobs: 0, staleCheckSkipped: false },
      },
    }),
    ['beta', 'gamma', 'delta', 'zeta'],
  )
})

test('promoteStagedJobDataset carries forward preserved live sources before renaming staging into place', async () => {
  const restoreConnectionState = setConnectionState({ readyState: 1, db: {} })
  const originalJobDistinct = Job.distinct
  const originalJobFind = Job.find
  const originalStagedInsertMany = StagedJob.insertMany
  const originalStagedDistinct = StagedJob.distinct
  const originalStagedRename = StagedJob.collection.rename
  const originalEnqueueJobAlertsForJobs = jobAlertService.enqueueJobAlertsForJobs

  const carriedForwardDocs = []
  const queuedJobs = []
  let renameTarget = null
  let renameOptions = null

  Job.distinct = async () => ['old-live', 'shared-live']
  Job.find = (filter) => ({
    lean() {
      return this
    },
    exec: async () => {
      if (filter?.source) {
        return [
          { _id: 'live-1', source: 'beta', fingerprint: 'old-live', status: 'active', title: 'Carried beta job' },
          { _id: 'live-2', source: 'gamma', fingerprint: 'shared-live', status: 'active', title: 'Carried gamma job' },
        ]
      }

      if (filter?.fingerprint) {
        return [
          { _id: 'live-3', source: 'alpha', fingerprint: 'new-live', status: 'active', title: 'Brand new job' },
        ]
      }

      return []
    },
  })
  StagedJob.insertMany = async (documents) => {
    carriedForwardDocs.push(...documents)
  }
  StagedJob.distinct = async () => ['shared-live', 'new-live', 'old-live']
  StagedJob.collection.rename = async (targetName, options) => {
    renameTarget = targetName
    renameOptions = options
  }
  jobAlertService.enqueueJobAlertsForJobs = (jobs) => {
    queuedJobs.push(...jobs)
  }

  try {
    const result = await promoteStagedJobDataset({
      selectedSources: ['alpha', 'beta', 'gamma', 'delta'],
      summary: {
        alpha: { success: true, jobs: 4, staleCheckSkipped: false },
        beta: { success: false, error: 'DNS failure' },
        gamma: { success: true, skipped: true },
        delta: { success: true, jobs: 0, staleCheckSkipped: true },
      },
      refreshSummary: false,
    })

    assert.deepEqual(result.carriedForwardSources, ['beta', 'gamma', 'delta'])
    assert.equal(result.carriedForwardJobs, 2)
    assert.equal(result.totalPromotedJobs, 3)
    assert.equal(result.alertedJobs, 1)
    assert.equal(carriedForwardDocs.length, 2)
    assert.equal(carriedForwardDocs.every((document) => !('_id' in document)), true)
    assert.equal(renameTarget, Job.collection.collectionName)
    assert.deepEqual(renameOptions, { dropTarget: true })
    assert.equal(queuedJobs.length, 1)
    assert.equal(queuedJobs[0].fingerprint, 'new-live')
  } finally {
    Job.distinct = originalJobDistinct
    Job.find = originalJobFind
    StagedJob.insertMany = originalStagedInsertMany
    StagedJob.distinct = originalStagedDistinct
    StagedJob.collection.rename = originalStagedRename
    jobAlertService.enqueueJobAlertsForJobs = originalEnqueueJobAlertsForJobs
    restoreConnectionState()
  }
})
