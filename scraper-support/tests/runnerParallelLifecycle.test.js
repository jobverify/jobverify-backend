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

test('parallel lifecycle timeout records a source failure and continues the queue', () => {
  const result = runScenario('timeout')

  assert.equal(result.error, null)
  assert.deepEqual(result.started, ['broken', 'queued'])
  assert.deepEqual(Object.keys(result.history).sort(), ['broken', 'queued'])
  assert.equal(result.history.broken.success, false)
  assert.equal(result.history.broken.failureKind, 'runner_lifecycle_timeout')
  assert.equal(result.history.queued.success, true)
  assert.equal(result.finished.aborted, false)
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

test('parallel timeout stays bounded when a source ignores its abort signal', () => {
  const result = runScenario('uncooperative-timeout')

  assert.equal(result.error, null)
  assert.deepEqual(result.started, ['broken', 'queued'])
  assert.equal(result.history.broken.failureKind, 'runner_lifecycle_timeout')
  assert.equal(result.history.queued.success, true)
  assert.equal(result.finished.aborted, false)
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

test('a source that settles six seconds after timeout does not abort the parallel run', () => {
  const result = runScenario('slow-cleanup')

  assert.equal(result.error, null)
  assert.deepEqual(result.started, ['broken', 'queued'])
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


test('a timed-out source and subsequent source are both checkpointed', () => {
  const result = runScenario('checkpoint-timeout')
  assert.equal(result.error, null)
  assert.deepEqual(Object.keys(result.checkpoint.completed).sort(), ['broken', 'queued'])
  assert.equal(result.checkpoint.completed.broken.result.failureKind, 'runner_lifecycle_timeout')
  assert.equal(result.checkpoint.completedCount, 2)
  assert.equal(result.checkpoint.remainingCount, 0)
  assert.equal(result.checkpoint.status, 'complete')
})
