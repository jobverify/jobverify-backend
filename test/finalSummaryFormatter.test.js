import assert from 'node:assert/strict'
import test from 'node:test'

import { formatFinalSummaryTable } from '../scraper-support/finalSummaryFormatter.js'

test('formatFinalSummaryTable renders bounded operational analytics tables', () => {
  const output = formatFinalSummaryTable({
    alpha: {
      success: true,
      jobs: 100,
      inserted: 0,
      updated: 0,
      durationMs: 1_000,
    },
    beta: {
      success: true,
      jobs: 0,
      inserted: 0,
      updated: 0,
      durationMs: 10_000,
    },
    gamma: {
      success: false,
      softFailure: true,
      jobs: 0,
      inserted: 0,
      updated: 0,
      durationMs: 5_000,
      error: '[gamma] timed out after 300000ms',
    },
    delta: {
      success: false,
      softFailure: false,
      jobs: 0,
      inserted: 0,
      updated: 0,
      durationMs: 20_000,
      error: 'HTTP 503 for https://example.test/jobs',
    },
    epsilon: {
      success: false,
      softFailure: true,
      jobs: 0,
      inserted: 0,
      updated: 0,
      durationMs: 3_000,
      error: 'certificate has expired',
    },
    zeta: {
      success: true,
      jobs: 20,
      inserted: 4,
      updated: 2,
      durationMs: 4_000,
    },
  })

  assert.match(output, /^[\x0A\x0D\x20-\x7E]+$/)
  assert.match(output, /RUN HEALTH/)
  assert.match(output, /Success rate\s+\| 50\.0%/)
  assert.match(output, /Zero-job successes\s+\| 1/)
  assert.match(output, /JOB YIELD/)
  assert.match(output, /Top-5 source share\s+\| 100\.0%/)
  assert.match(output, /PERFORMANCE/)
  assert.match(output, /P95 source runtime\s+\| 20\.0s/)
  assert.match(output, /Timed-out sources\s+\| 1/)
  assert.match(output, /TOP JOB YIELDS/)
  assert.match(output, /alpha\s+\| 100\s+\| 83\.3%/)
  assert.match(output, /TOP SLOWEST SOURCES/)
  assert.match(output, /delta\s+\| 20\.0s\s+\| Fail\s+\| 0/)
  assert.match(output, /FAILURE GROUPS/)
  assert.match(output, /HTTP 5xx\s+\| 1\s+\| delta/)
  assert.match(output, /TLS\/certificate\s+\| 1\s+\| epsilon/)
})

test('formatFinalSummaryTable highlights the largest source job-count changes', () => {
  const output = formatFinalSummaryTable({
    alpha: { success: true, jobs: 30, durationMs: 100 },
    beta: { success: true, jobs: 2, durationMs: 100 },
  }, {
    previousRun: {
      sources: {
        alpha: { jobsFound: 5 },
        beta: { jobsFound: 40 },
      },
    },
  })

  assert.match(output, /SOURCE-CHANGE ANOMALIES/)
  assert.match(output, /alpha\s+\| 5\s+\| 30\s+\| \+25/)
  assert.match(output, /beta\s+\| 40\s+\| 2\s+\| -38/)
})
