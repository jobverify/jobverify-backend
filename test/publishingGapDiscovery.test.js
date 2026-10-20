import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPublishingGapReport, publishingGapCsv } from '../scripts/publishingGapReport.js'

const now = new Date('2026-10-20T00:00:00Z')
const at = '2026-10-19T23:00:00Z'
const catalog = [{ source: 'acme', companyName: 'Acme', adapter: 'publicAts', atsPlatform: 'greenhouse', boardToken: 'acme' },
  { source: 'acmeindia', companyName: 'Acme India', adapter: 'script' }]
const runtime = { databaseAvailable: true, generatedAt: at, inventory: [{ source: 'acme', savedJobs: 3, visibleJobs: 3, visibleCompanies: ['Acme'] }], publicCompanyNames: ['Acme'] }

test('discovered duplicate boards remain aliases requiring reconciliation', () => {
  const report = buildPublishingGapReport({ catalog, runtime, now, discovery: [{ source: 'acmeindia', completedAt: at,
    outcome: 'ready-for-validation', eligibleJobs: 3, candidate: { atsPlatform: 'greenhouse', boardToken: 'acme' } }] })
  assert.equal(report.rows[1].publicationOutcome, 'not-published')
  assert.equal(report.rows[1].runtimeOutcome, 'not-observed')
  assert.equal(report.backlog[0].reason, 'reconcile-shared-published-ats-board')
  assert.deepEqual(report.rows[1].discoveredAtsBoard.sharedPublishedSources, ['acme'])
  assert.equal(report.summary.distinctVisibleCompanies, 1)
})

test('a newer failed extraction audit cannot inherit older positive discovery counts', () => {
  const report = buildPublishingGapReport({ catalog, runtime, now,
    discovery: [{ source: 'acmeindia', completedAt: at, outcome: 'ready-for-validation', eligibleJobs: 5 }],
    extractionAudits: [{ source: 'acmeindia', completedAt: '2026-10-19T23:30:00Z', outcome: 'extraction-failed', eligibleJobs: null }] })
  assert.equal(report.backlog[0].reason, 'extraction-failed')
  assert.equal(report.backlog[0].observedEligibleJobs, null)
  assert.notEqual(report.backlog[0].priority, 0)
})

test('stale discovery remains evidence context without supplying current opening counts', () => {
  const report = buildPublishingGapReport({ catalog, runtime, now, discovery: [{ source: 'acmeindia', completedAt: '2026-10-01T00:00:00Z', outcome: 'ready-for-validation', eligibleJobs: 5 }] })
  assert.equal(report.rows[1].discoveryFresh, false)
  assert.equal(report.rows[1].discoveredEligibleJobs, null)
  assert.equal(report.summary.completeSuccessfulChecks, 0)
  assert.match(publishingGapCsv(report.rows), /discoveryOutcome/)
})
