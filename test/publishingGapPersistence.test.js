import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePublishingGapPersistence } from '../scripts/validatePublishingGapPersistence.js'

test('fresh extracted jobs survive real local persistence and the exact public query without duplicates', { timeout: 120000 }, async () => {
  const now = new Date()
  const job = { title: 'Software Engineer', company: 'Publishing Gap Trial', country: 'India', city: 'Bangalore', location: 'Bangalore, India',
    sourceUrl: 'https://example.com/jobs/valid', applyUrl: 'https://example.com/jobs/valid', description: 'Develop and maintain production software with our engineering team.' }
  const report = await validatePublishingGapPersistence({ now, trials: [{ source: 'publishing-gap-trial', completedAt: now.toISOString(),
    inventoryEvidence: { status: 'complete-inventory', firstParty: true, listingComplete: true, pagesFetched: 1, reportedTotal: 3, surface: 'https://example.com/jobs', verifiedAt: now.toISOString() },
    jobs: [job, { ...job, sourceUrl: 'https://example.com/jobs/empty', applyUrl: 'https://example.com/jobs/empty', description: '' },
      { ...job, sourceUrl: 'https://example.com/jobs/closed', applyUrl: 'https://example.com/jobs/closed', closingDate: '2000-01-01' }],
  }] })
  assert.equal(report.environment, 'temporary-local-mongodb')
  assert.equal(report.productionWrites, false)
  assert.equal(report.rows[0].rawJobs, 3)
  assert.equal(report.rows[0].eligibleJobs, 1)
  assert.equal(report.rows[0].savedJobs, 1)
  assert.equal(report.rows[0].visibleJobs, 1)
  assert.equal(report.rows[0].idempotent, true)
  assert.equal(report.rows[0].outcome, 'passed')
})

test('validation refuses stale trial files before starting persistence', async () => {
  await assert.rejects(validatePublishingGapPersistence({ now: new Date('2026-10-20'), trials: [{ source: 'old', completedAt: '2026-07-01', jobs: [] }] }), /fresh|evidence/i)
})

test('a fresh wrapper cannot launder stale or structurally incomplete inventory evidence', async () => {
  const now = new Date('2026-10-20T06:00:00Z')
  for (const overrides of [{ verifiedAt: '2026-07-01' }, { verifiedAt: '2026-10-21' }, { surface: null }, { pagesFetched: 0 }]) {
    await assert.rejects(validatePublishingGapPersistence({ now, trials: [{ source: 'invalid', completedAt: now.toISOString(), jobs: [], inventoryEvidence: {
      status: 'complete-inventory', firstParty: true, listingComplete: true, pagesFetched: 1, surface: 'https://example.com/jobs', verifiedAt: now.toISOString(), ...overrides,
    } }] }), /fresh|evidence/i)
  }
})
