import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixture = fileURLToPath(new URL('./fixtures/runnerParallelLifecycle.js', import.meta.url))

const runScenario = (scenario, parallel = true) => {
  const child = spawnSync(process.execPath, [fixture, scenario, ...(parallel ? ['--parallel'] : [])], {
    encoding: 'utf8',
    timeout: 15_000,
  })
  assert.equal(child.error, undefined)
  assert.equal(child.status, 0, child.stderr || child.stdout)
  return JSON.parse(child.stdout)
}

test('parallel lifecycle failure cancels active peers, stops dequeueing and records the aborted run', () => {
  const result = runScenario('timeout')

  assert.equal(result.error.name, 'ScraperSourceLifecycleTimeoutError')
  assert.deepEqual(result.started.sort(), ['broken', 'peer'])
  assert.equal(result.peerAborted, true)
  assert.equal(result.peerSettled, true)
  assert.deepEqual(Object.keys(result.history).sort(), ['broken', 'peer'])
  assert.equal(result.history.broken.success, false)
  assert.equal(result.history.broken.failureKind, 'runner_lifecycle_timeout')
  assert.equal(result.finished.aborted, true)
  assert.match(result.finished.error, /broken/)
  assert.equal(result.settledBeforeHistory, true)
})

test('fatal persistence failure cancels a peer even when its lifecycle timeout is disabled', () => {
  const result = runScenario('quota')

  assert.equal(result.error.name, 'FatalScraperPersistenceError')
  assert.deepEqual(result.started.sort(), ['broken', 'peer'])
  assert.equal(result.peerAborted, true)
  assert.equal(result.peerSettled, true)
  assert.equal(result.finished.aborted, true)
  assert.deepEqual(Object.keys(result.history).sort(), ['broken', 'peer'])
  assert.equal(result.settledBeforeHistory, true)
})

test('parallel cancellation stays bounded when a peer ignores its abort signal', () => {
  const result = runScenario('uncooperative-peer')

  assert.equal(result.error.name, 'ScraperSourceLifecycleTimeoutError')
  assert.deepEqual(result.started.sort(), ['broken', 'peer'])
  assert.equal(result.peerAborted, true)
  assert.equal(result.peerSettled, false)
  assert.equal(result.finished.aborted, true)
  assert.deepEqual(Object.keys(result.history).sort(), ['broken', 'peer'])
})

test('parallel summaries preserve individual names for deactivated sources', () => {
  const result = runScenario('inactive')

  assert.equal(result.error, null)
  assert.deepEqual(result.started, [])
  assert.deepEqual(Object.keys(result.history).sort(), ['disabled-one', 'disabled-two'])
  assert.equal(result.history['disabled-one'].skipped, true)
  assert.equal(result.history['disabled-two'].skipped, true)
})

test('cooperative source timeouts allow queued sources to run after recording the failure', () => {
  const result = runScenario('cooperative-timeout')

  assert.equal(result.error, null)
  assert.deepEqual(result.started, ['broken', 'queued'])
  assert.equal(result.history.broken.success, false)
  assert.equal(result.history.broken.failureKind, 'runner_lifecycle_timeout')
  assert.equal(result.history.queued.success, true)
  assert.equal(result.finished.aborted, false)
})

test('parallel runner resumes from a per-source checkpoint without rerunning completed work', () => {
  const result = runScenario('checkpoint-resume')

  assert.equal(result.error, null)
  assert.deepEqual(result.started, ['beta'])
  assert.deepEqual(Object.keys(result.history).sort(), ['alpha', 'beta'])
  assert.equal(result.history.alpha.success, true)
  assert.equal(result.history.beta.success, true)
  assert.equal(result.checkpoint.status, 'complete')
  assert.equal(result.checkpoint.completedCount, 2)
})

test('checkpointed failures still enforce the configured abort threshold after restart', () => {
  const result = runScenario('checkpoint-failure-threshold')

  assert.equal(result.error, null)
  assert.deepEqual(result.started, [])
  assert.deepEqual(Object.keys(result.history), ['alpha'])
  assert.equal(result.finished.aborted, true)
  assert.equal(result.checkpoint.status, 'interrupted')
  assert.equal(result.checkpoint.restartable, false)
  assert.equal(result.checkpoint.completedCount, 1)
})

for (const parallel of [true, false]) {
  test(`${parallel ? 'parallel' : 'sequential'} runner preserves failed retry telemetry in run history`, () => {
    const result = runScenario('failed-retry-telemetry', parallel)
    assert.equal(result.error, null)
    assert.deepEqual(result.started, ['unavailable', 'unavailable'])
    assert.equal(result.history.unavailable.success, false)
    assert.deepEqual(result.history.unavailable.retry, { attemptsUsed: 2, retries: 1, retryDelayMs: 2000 })
  })
}


test('a peer cancelled by another source timeout remains incomplete for checkpoint resume', () => {
  const result = runScenario('checkpoint-cancelled-peer')
  assert.equal(result.error.name, 'ScraperSourceLifecycleTimeoutError')
  assert.equal(result.peerSettled, true)
  assert.deepEqual(Object.keys(result.checkpoint.completed), [])
  assert.equal(result.checkpoint.completedCount, 0)
  assert.equal(result.checkpoint.remainingCount, 3)
  assert.equal(result.checkpoint.status, 'interrupted')
})
