import assert from 'node:assert/strict'
import test from 'node:test'
import { buildScraperAttemptDiagnostics, resolveZeroJobOutcome, isAuthoritativeEmptyScrape } from '../runner.js'
import { attachInventoryEvidence } from '../utils/inventoryEvidence.js'
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

test('runner diagnostics retain raw inventory evidence and every mutually exclusive rejection count', () => {
  const evidence = { status: 'complete-inventory', firstParty: true, listingComplete: true, pagesFetched: 1, surface: 'https://example.com/careers', verifiedAt: new Date().toISOString() }
  const role = { title: 'Software engineer', location: 'Bangalore, India', city: 'Bangalore', country: 'India', applyUrl: 'https://example.com/jobs/1', description: 'Build reliable systems.' }
  const jobs = attachInventoryEvidence([
    role,
    { ...role, location: 'London, United Kingdom', city: 'London', country: 'United Kingdom' },
    { ...role, description: '' },
    { ...role, applyUrl: 'invalid' },
    { ...role, closingDate: '2000-01-01' },
    { ...role, title: 'Current openings at Acme', jobId: 'acme-current-openings' },
  ], evidence)
  const metrics = buildScraperAttemptDiagnostics(jobs)
  assert.equal(metrics.rawRecords, 6)
  assert.equal(metrics.jobs, 5)
  assert.equal(metrics.eligibleJobs, 1)
  assert.deepEqual([metrics.filteredNonIndia, metrics.filteredClosed, metrics.filteredInvalidUrl, metrics.filteredEmptyDescription, metrics.filteredNonJob], [1, 1, 1, 1, 1])
  assert.equal(metrics.inventoryEvidence.surface, evidence.surface)
})

test('name coverage explicitly describes registration and keeps legacy counts', () => {
  const report = generateCompanyCoverageReport({ csvText: 'company_name\nAcme\nMissing', catalog: [{ source: 'acme', companyName: 'Acme' }], aliasMap: {} })
  assert.equal(report.coverageLabel, 'Catalog registration coverage')
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 1)
})

test('stale fetched zero inventory cannot authorize a live empty lifecycle', () => {
  const jobs = attachInventoryEvidence([], { status: 'verified-empty', firstParty: true, listingComplete: true,
    surface: 'https://example.com/careers', pagesFetched: 1, reportedTotal: 0, verifiedAt: '2000-01-01T00:00:00Z' })
  assert.equal(resolveZeroJobOutcome({ provider: {} }, jobs, []), 'unverified-zero')
  assert.equal(isAuthoritativeEmptyScrape({ provider: {} }, jobs), false)
})
