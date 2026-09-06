import assert from 'node:assert/strict'
import test from 'node:test'

import { formatFinalSummaryTable } from '../scraper-support/finalSummaryFormatter.js'

test('formatFinalSummaryTable renders bounded operational analytics tables', () => {
  const output = formatFinalSummaryTable({
    alpha: {
      success: true,
      jobs: 100,
      eligibleJobs: 60,
      filteredNonIndia: 25,
      filteredOld: 10,
      filteredClosed: 2,
      filteredInvalidUrl: 1,
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
      eligibleJobs: 10,
      filteredNonIndia: 1,
      filteredOld: 4,
      filteredClosed: 1,
      filteredInvalidUrl: 1,
      inserted: 4,
      updated: 2,
      durationMs: 4_000,
    },
  })

  assert.match(output, /^[\x0A\x0D\x20-\x7E]+$/)
  assert.match(output, /Start time\s+\| unavailable/)
  assert.match(output, /RUN HEALTH/)
  assert.match(output, /Success rate\s+\| 50\.0%/)
  assert.match(output, /Zero-job successes\s+\| 1/)
  assert.match(output, /JOB YIELD/)
  assert.match(output, /Top-5 source share\s+\| 100\.0%/)
  assert.match(output, /PUBLISHABLE FILTERS/)
  assert.match(output, /Publishable jobs\s+\| 70/)
  assert.match(output, /Rejected outside India\s+\| 26/)
  assert.match(output, /Rejected older than retention\s+\| 14/)
  assert.match(output, /Rejected past closing date\s+\| 3/)
  assert.match(output, /Rejected invalid URL\s+\| 2/)
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

test('formatFinalSummaryTable totals missing required job fields', () => {
  const output = formatFinalSummaryTable({
    alpha: {
      success: true,
      jobs: 4,
      durationMs: 100,
      dataQuality: { missingTitle: 1, missingLocation: 2, missingApplyUrl: 3 },
    },
  })

  assert.match(output, /DATA QUALITY/)
  assert.match(output, /Missing title\s+\| 1/)
  assert.match(output, /Missing location\s+\| 2/)
  assert.match(output, /Missing application URL\s+\| 3/)
})

test('formatFinalSummaryTable reports wall-clock run timing and operational rates', () => {
  const output = formatFinalSummaryTable({
    alpha: {
      success: true,
      jobs: 8,
      durationMs: 49_805_800,
      dataQuality: { missingLocation: 2 },
    },
    beta: { success: false, softFailure: true, jobs: 0, durationMs: 1_000 },
  }, {
    runTiming: {
      startedAt: new Date('2026-08-18T01:30:00.000Z'),
      completedAt: new Date('2026-08-18T03:07:36.700Z'),
    },
  })

  assert.match(output, /RUN TIMING/)
  assert.match(output, /Start time\s+\| 2026-08-18 07:00:00 IST/)
  assert.match(output, /End time\s+\| 2026-08-18 08:37:36 IST/)
  assert.match(output, /Total time taken\s+\| 1h 37m 36\.7s/)
  assert.match(output, /Cumulative worker time\s+\| 13h 50m 6\.8s/)
  assert.match(output, /Successful-source rate\s+\| 50\.0%/)
  assert.match(output, /Job-yield rate\s+\| 50\.0%/)
  assert.match(output, /Missing-location rate\s+\| 25\.0%/)
})
