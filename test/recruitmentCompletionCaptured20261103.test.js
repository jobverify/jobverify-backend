import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { getScraperCatalog, createCatalogScraper } from '../scraper-support/providers/index.js'
import { RECRUITMENT_OBSERVATIONS } from '../scraper-support/utils/verifiedRecruitment.js'
import { readInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'

const directory = new URL('./test-data/recruitmentCompletion20261103/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', directory)))
const catalog = new Map(getScraperCatalog().map(provider => [provider.source, provider]))
const sha = value => createHash('sha256').update(value).digest('hex')
const key = (url, init = {}) => (init.method || 'GET') + ':' + url + ':' + (init.body || '')

for (const fixture of manifest.sources) test(`${fixture.source}: repaired production extraction preserves actual public role content`, async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('Uncontrolled HTTP is forbidden'))
  const requests = new Map(fixture.requests.map(row => [key(row.requestedURL, { method: row.method, body: row.requestBody }), row]))
  const calls = [], unexpected = []
  const jobs = await createCatalogScraper(catalog.get(fixture.source)).run({ ...fixture.limits, now: () => fixture.observedAt, sourceTimeoutMs: 60000,
    fetchImpl: async (url, init) => {
      const identity = key(url, init), receipt = requests.get(identity)
      if (!receipt) { unexpected.push(identity); throw Error('Uncaptured public request') }
      calls.push(identity)
      if (receipt.requestFailure) { const error = new Error(receipt.requestFailure.message); error.name = receipt.requestFailure.name; throw error }
      const body = gunzipSync(readFileSync(new URL(receipt.filename, directory)))
      assert.equal(sha(body), receipt.bodySHA256)
      assert.equal(body.byteLength, receipt.bodyBytes)
      const response = new Response(body, { status: receipt.status, headers: { 'content-type': receipt.contentType } })
      Object.defineProperty(response, 'url', { value: receipt.finalURL })
      return response
    } })
  assert.deepEqual(unexpected, [])
  assert.deepEqual(calls, fixture.requests.map(row => key(row.requestedURL, { method: row.method, body: row.requestBody })))
  assert.equal(jobs.length, fixture.indiaJobs)
  assert.equal(jobs[RECRUITMENT_OBSERVATIONS].nativeRecords, fixture.nativeRecords)
  assert.deepEqual(jobs[RECRUITMENT_OBSERVATIONS].unresolved, fixture.unresolved)
  assert.deepEqual(jobs[RECRUITMENT_OBSERVATIONS].failures, fixture.failures)
  assert.deepEqual(jobs.map(job => ({ jobId: String(job.jobId), title: job.title, applyUrl: job.applyUrl,
    nativeHiringOrganization: job.nativeHiringOrganization ?? null, nativeEmployerBinding: job.nativeEmployerBinding || null,
    postingDate: job.postingDate ?? null, descriptionSHA256: sha(job.sourceDescription || job.jobDescription) })), fixture.expectedJobs)
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.notEqual(readInventoryEvidence(jobs).status, 'verified-empty')
  for (const job of jobs) {
    assert.equal(job.country, 'India')
    assert.equal(job.sourceScopeComplete, false)
    assert.equal(job.sourceListingComplete, false)
    assert.equal(job.lifecycleCleanupAllowed, false)
    assert.equal(job.applicationVisited ?? false, false)
    assert.ok(job.nativeHiringOrganization?.name || job.nativeSourceRecord?.company_name || job.nativeEmployerBinding?.publisher)
    assert.ok((job.sourceDescription || job.jobDescription).length >= 100)
    if (job.sourceDescription) assert.equal(job.sourceDescription, job.jobDescription)
  }
})
