import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { openRunCheckpoint, renameFileWithRetry } from '../utils/runCheckpoint.js'

const createTempCheckpoint = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jobverify-checkpoint-'))
  return {
    directory,
    filePath: path.join(directory, 'run-state.json'),
  }
}

test('run checkpoint resumes only unfinished sources and preserves prior results', () => {
  const { directory, filePath } = createTempCheckpoint()
  const sources = ['alpha', 'beta', 'gamma']

  try {
    const first = openRunCheckpoint({
      filePath,
      sources,
      mode: 'live',
      parallel: true,
      runId: 'run-one',
      now: () => new Date('2026-09-12T06:00:00.000Z'),
    })
    first.markSourceStarted('alpha')
    first.markSourceCompleted('alpha', { success: true, jobs: 2, inserted: 2 })

    const resumed = openRunCheckpoint({
      filePath,
      sources,
      mode: 'live',
      parallel: true,
      runId: 'run-one',
      now: () => new Date('2026-09-12T06:05:00.000Z'),
    })

    assert.deepEqual(resumed.pendingSources(sources), ['beta', 'gamma'])
    assert.deepEqual(resumed.completedSummary(), {
      alpha: { success: true, jobs: 2, inserted: 2 },
    })
    assert.equal(resumed.snapshot().inProgress.alpha, undefined)
    assert.equal(resumed.snapshot().completedCount, 1)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('run checkpoint writes valid state atomically and marks incomplete shutdowns', () => {
  const { directory, filePath } = createTempCheckpoint()

  try {
    const checkpoint = openRunCheckpoint({
      filePath,
      sources: ['alpha', 'beta'],
      mode: 'live',
      parallel: true,
      runId: 'run-two',
    })
    checkpoint.markSourceStarted('alpha')
    checkpoint.markSourceCompleted('alpha', { success: false, failureKind: 'http_503' })
    checkpoint.finish({ interruptedBy: 'SIGTERM' })

    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    assert.equal(saved.status, 'interrupted')
    assert.equal(saved.interruptedBy, 'SIGTERM')
    assert.equal(saved.completedCount, 1)
    assert.equal(saved.remainingCount, 1)
    assert.deepEqual(
      fs.readdirSync(directory).filter((name) => name.includes('.tmp')),
      [],
    )
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('run checkpoint rejects a catalog change inside the same run directory', () => {
  const { directory, filePath } = createTempCheckpoint()

  try {
    openRunCheckpoint({
      filePath,
      sources: ['alpha', 'beta'],
      mode: 'live',
      parallel: true,
      runId: 'run-three',
    })

    assert.throws(
      () => openRunCheckpoint({
        filePath,
        sources: ['alpha', 'gamma'],
        mode: 'live',
        parallel: true,
        runId: 'run-three',
      }),
      /catalog changed/i,
    )
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('run checkpoint keeps summary metrics but omits bulky per-source detail', () => {
  const { directory, filePath } = createTempCheckpoint()

  try {
    const checkpoint = openRunCheckpoint({
      filePath,
      sources: ['alpha'],
      mode: 'live',
      parallel: true,
      runId: 'run-four',
    })
    checkpoint.markSourceCompleted('alpha', {
      success: true,
      jobs: 5,
      inserted: 2,
      cities: Array.from({ length: 500 }, (_, index) => `City ${index}`),
      dataQuality: { missingTitle: 0, missingLocation: 1, missingApplyUrl: 0 },
      retry: { attemptsUsed: 2, retries: 1, retryDelayMs: 2000 },
    })

    assert.deepEqual(checkpoint.completedSummary().alpha, {
      success: true,
      jobs: 5,
      inserted: 2,
      dataQuality: { missingTitle: 0, missingLocation: 1, missingApplyUrl: 0 },
      retry: { attemptsUsed: 2, retries: 1, retryDelayMs: 2000 },
    })
    assert.ok(fs.statSync(filePath).size < 2_000)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('checkpoint replacement retries transient Windows file-lock errors', () => {
  const attempts = []
  const delays = []

  renameFileWithRetry('run-state.tmp', 'run-state.json', {
    rename: (sourcePath, destinationPath) => {
      attempts.push([sourcePath, destinationPath])
      if (attempts.length < 3) {
        const error = new Error('operation not permitted')
        error.code = 'EPERM'
        throw error
      }
    },
    wait: (milliseconds) => delays.push(milliseconds),
    retryDelayMs: 25,
    maxAttempts: 4,
  })

  assert.deepEqual(attempts, [
    ['run-state.tmp', 'run-state.json'],
    ['run-state.tmp', 'run-state.json'],
    ['run-state.tmp', 'run-state.json'],
  ])
  assert.deepEqual(delays, [25, 50])
})
