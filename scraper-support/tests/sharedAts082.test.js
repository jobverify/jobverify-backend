import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createCatalogScraper, getScraperCatalog } from '../providers/index.js'
import { createPublishingGapAtsScraper } from '../utils/publishingGapAts.js'
import { readInventoryEvidence, isFreshCompleteInventoryEvidence } from '../utils/inventoryEvidence.js'
import { analyzePublishableJobs } from '../utils/publishableJobMetrics.js'
import { classifyProviderImplementation } from '../../scripts/reportScriptCatalogTopology.js'
import { hasSourceDescription } from '../../src/utils/jobSourceContent.js'

const fixtures = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/sharedAts082.json.gz', import.meta.url))))
const ids = ['bugcrowd', 'degreed', 'cymulate', 'esw', 'extrahop', 'datagrail']
const unresolvedScopes = new Set(['bugcrowd', 'degreed', 'cymulate', 'esw', 'extrahop'])

for (const source of ids) test(`${source}: registered shared adapter consumes the complete native feed with guarded scope`, async () => {
  const provider = getScraperCatalog().find(row => row.source === source)
  assert.equal(provider.adapter, 'publicAts')
  assert.equal(classifyProviderImplementation(provider).type, 'shared-adapter')
  assert.equal(provider.bindingEvidence.verified, true)
  assert.equal(provider.sourceScopeComplete, false)
  const calls = []
  const jobs = await createCatalogScraper(provider).run({ fetchJson: async url => { calls.push(url); return structuredClone(fixtures[source]) } })
  assert.deepEqual(calls, [`https://boards-api.greenhouse.io/v1/boards/${provider.boardToken}/jobs?content=true`])
  const expected = source === 'bugcrowd' ? 2 : 0
  assert.equal(jobs.length, expected)
  assert.equal(analyzePublishableJobs(jobs).eligibleJobs.length, expected)
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.reportedTotal, fixtures[source].meta.total)
  assert.equal(evidence.indiaFacetCount, unresolvedScopes.has(source) ? null : expected)
  if (unresolvedScopes.has(source)) assert.match(evidence.reason, /native-location-scope-unresolved/)
  assert.equal(evidence.listingComplete, false)
  assert.equal(evidence.status, 'discovery-only')
  assert.equal(isFreshCompleteInventoryEvidence(evidence), false)
  assert.match(evidence.reason, /provider-source-scope-unresolved/)
  for (const job of jobs) {
    const raw = fixtures[source].jobs.find(row => String(row.id) === String(job.jobId))
    assert.ok(raw)
    assert.equal(job.applyUrl, raw.absolute_url)
    assert.equal(new Date(job.postingDate).toISOString(), new Date(raw.first_published).toISOString())
    assert.match(job.jobDescription, /Application Security/)
    assert.match(job.location, /Remote.*India/i)
    assert.equal(job.sourceListingComplete, false)
    assert.equal(job.sourceScopeComplete, false)
    assert.equal(job.lifecycleCleanupAllowed, false)
  }
  const direct = await import(`../../scraper/${source}/script.js`)
  const directJobs = await direct.run({ fetchJson: async () => structuredClone(fixtures[source]) })
  assert.equal(directJobs.length, expected)
  assert.equal(readInventoryEvidence(directJobs).status, 'discovery-only')
})

test('explicit unresolved scope cannot be promoted to complete, including a truly empty native feed', async () => {
  for (const payload of [fixtures.bugcrowd, { jobs: [], meta: { total: 0 } }]) {
    const provider = { source: 'guard', companyName: 'Guard', atsPlatform: 'greenhouse', boardToken: 'bugcrowd', sourceScopeComplete: false }
    const guarded = await createPublishingGapAtsScraper(provider).run({ fetchJson: async () => payload })
    assert.equal(readInventoryEvidence(guarded).listingComplete, false)
    assert.equal(readInventoryEvidence(guarded).status, 'discovery-only')
    const unchangedDefault = await createPublishingGapAtsScraper({ ...provider, sourceScopeComplete: undefined }).run({ fetchJson: async () => payload })
    const defaultEvidence = readInventoryEvidence(unchangedDefault)
    assert.equal(defaultEvidence.listingComplete, payload.jobs.length === 0)
    assert.equal(defaultEvidence.indiaFacetCount, payload.jobs.length === 0 ? 0 : null)
    if (payload.jobs.length) {
      assert.match(defaultEvidence.reason, /native-location-scope-unresolved/)
      assert.ok(unchangedDefault.every(job => job.sourceListingComplete === false))
      assert.equal(isFreshCompleteInventoryEvidence(defaultEvidence), false)
    }
  }
})

test('batch feed failures, truncated totals and missing descriptions retain evidence gaps', async () => {
  const provider = { source: 'guard', companyName: 'Guard', atsPlatform: 'greenhouse', boardToken: 'bugcrowd', sourceScopeComplete: false }
  const run = payload => createPublishingGapAtsScraper(provider).run({ fetchJson: async () => payload })
  await assert.rejects(run({ jobs: [], meta: { total: 8 } }), /Incomplete/)
  await assert.rejects(run({ jobs: [], error: 'upstream failed' }), /Failed/)
  const payload = structuredClone(fixtures.bugcrowd)
  for (const row of payload.jobs) row.content = ''
  const jobs = await run(payload)
  assert.equal(jobs.length, 2)
  assert.equal(analyzePublishableJobs(jobs).eligibleJobs.length, 2)
  assert.ok(jobs.every(job => !hasSourceDescription(job) && !job.jobDescription && !job.sourceDescription))
  assert.ok(jobs.every(job => job.sourceListingComplete === false && job.lifecycleCleanupAllowed === false))
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.listingComplete, false)
  assert.match(evidence.reason, /selected-role-description-unavailable/)
  assert.equal(isFreshCompleteInventoryEvidence(evidence), false)
  await assert.rejects(createPublishingGapAtsScraper(provider).run({ fetchJson: async () => { throw new Error('HTTP 503') } }), /503/)
})
