import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { stageOutcome } from '../../src/pipeline/policy.js'

const fixture = fileURLToPath(new URL('./fixtures/runnerWarningPolicy.js', import.meta.url))
function runScenario(t, scenario, parallel) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scraper-warning-policy-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  const child = spawnSync(process.execPath, [fixture, scenario, directory, ...(parallel ? ['--parallel'] : [])], {
    encoding: 'utf8', timeout: 15_000,
  })
  assert.equal(child.error, undefined)
  const summaryPath = path.join(directory, 'summary.json')
  return { ...child, state: JSON.parse(fs.readFileSync(path.join(directory, 'state.json'), 'utf8')),
    summary: fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : null }
}
for (const parallel of [false, true]) {
  const mode = parallel ? 'parallel' : 'sequential'
  test(`${mode} CLI warns for a failed source, saves the next source, and completes the scraper stage`, t => {
    const result = runScenario(t, 'source-failure', parallel)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(result.state.started, ['broken', 'healthy'])
    assert.deepEqual(result.state.saved, ['healthy'])
    assert.equal(result.state.history.broken.success, false)
    assert.equal(result.state.finished.aborted, false)
    assert.equal(result.summary.failed, 1)
    assert.equal(result.summary.warnings, 1)
    assert.match(result.stderr, /WARN \[broken\].*source inventory contract failed/)
    assert.equal(stageOutcome('scraper', result.summary, result.status), 'completed')
  })
  test(`${mode} CLI completes with warnings even when every source fails`, t => {
    const result = runScenario(t, 'all-fail', parallel)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(result.state.started, ['broken', 'healthy'])
    assert.deepEqual(result.state.saved, [])
    assert.equal(result.summary.failed, 2)
    assert.equal(result.summary.warnings, 2)
    assert.equal(stageOutcome('scraper', result.summary, result.status), 'completed')
  })
  test(`${mode} CLI keeps unfinished persistence blocking the next stage`, t => {
    const result = runScenario(t, 'pending', parallel)
    assert.equal(result.status, 1)
    assert.equal(result.summary.pendingEstimate, 1)
    assert.equal(stageOutcome('scraper', result.summary, result.status), 'incomplete')
  })
  test(`${mode} CLI treats a source's invalid return shape as an isolated warning`, t => {
    const result = runScenario(t, 'invalid-inventory', parallel)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(result.state.saved, ['healthy'])
    assert.equal(result.summary.warnings, 1)
  })
  for (const scenario of ['null-row', 'scalar-row', 'array-row']) {
    test(`${mode} CLI keeps malformed source records (${scenario}) isolated`, t => {
      const result = runScenario(t, scenario, parallel)
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(result.state.saved, ['healthy'])
      assert.equal(result.summary.warnings, 1)
      assert.match(result.stderr, /WARN \[broken\]/)
    })
  }
  for (const scenario of ['persistence-error', 'quota-error', 'runner-code-error', 'analysis-error', 'fatal-source', 'artifact-error']) {
    test(`${mode} CLI fails for ${scenario} instead of treating it as a source warning`, t => {
      const result = runScenario(t, scenario, parallel)
      assert.equal(result.status, 1, result.stdout + result.stderr)
      assert.ok(!result.state.started.includes('healthy'))
      assert.equal(stageOutcome('scraper', result.summary || {}, result.status), 'failed')
    })
  }
  for (const scenario of ['seed-error', 'pipeline-start-error', 'active-status-error', 'status-write-error', 'finish-error']) {
    test(`${mode} CLI fails for shared-boundary ${scenario}`, t => {
      const result = runScenario(t, scenario, parallel)
      assert.equal(result.status, 1, result.stdout + result.stderr)
      assert.match(result.stderr, new RegExp(`shared ${scenario}`))
      assert.equal(stageOutcome('scraper', result.summary || {}, result.status), 'failed')
      if (scenario !== 'finish-error') assert.ok(!result.state.started.includes('healthy'))
    })
  }
}
