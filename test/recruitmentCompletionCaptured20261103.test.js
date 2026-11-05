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
  const expectedJobs = structuredClone(fixture.expectedJobs)
  if (fixture.source === 'samsungelectronics') {
    // Keep the historical HTTP bytes. The reviewed institute name now admits
    // its own typed India records that the old employer mapping excluded.
    for (const receipt of fixture.requests.filter(row => row.status === 200 && /\/wday\/cxs\/.+\/job\//.test(row.requestedURL))) {
      const bytes = gunzipSync(readFileSync(new URL(receipt.filename, directory)))
      assert.equal(sha(bytes), receipt.bodySHA256)
      const native = JSON.parse(bytes), info = native.jobPostingInfo
      if (native.hiringOrganization?.name !== 'Samsung R&D Institute India - Bangalore') continue
      if (!info.country && !info.jobRequisitionLocation?.country) continue
      assert.equal(info.country.descriptor, 'India')
      assert.equal(info.jobRequisitionLocation.country.alpha2Code, 'IN')
      assert.ok(info.jobDescription.length >= 100)
      expectedJobs.push({ jobId: info.jobReqId, title: info.title,
        applyUrl: receipt.requestedURL.replace('/wday/cxs/sec/', '/'),
        nativeHiringOrganization: native.hiringOrganization, nativeEmployerBinding: null,
        postingDate: info.startDate || null, descriptionSHA256: sha(info.jobDescription) })
    }
    assert.equal(expectedJobs.length, 31)
  }
  assert.equal(jobs.length, fixture.source === 'samsungelectronics' ? expectedJobs.length : fixture.indiaJobs)
  assert.equal(jobs[RECRUITMENT_OBSERVATIONS].nativeRecords, fixture.nativeRecords)
  assert.deepEqual(jobs[RECRUITMENT_OBSERVATIONS].unresolved, fixture.source === 'samsungelectronics'
    ? fixture.unresolved.filter(reason => reason !== 'native-employer-mismatch') : fixture.unresolved)
  const failures = jobs[RECRUITMENT_OBSERVATIONS].failures
  assert.deepEqual(failures.map(({ stage, message }) => ({ stage, message })), fixture.failures)
  for (const failure of failures) {
    assert.equal(failure.name, 'Error')
    if (failure.stage === 'official-page') assert.equal(typeof failure.requestUrl, 'string')
    if (failure.requestUrl) {
      const url = new URL(failure.requestUrl)
      assert.equal(url.protocol, 'https:')
      assert.equal(url.username + url.password + url.search + url.hash, '')
      assert.ok(fixture.requests.some(receipt => {
        const requested = new URL(receipt.requestedURL)
        return requested.origin + requested.pathname === failure.requestUrl
      }), 'Diagnostic requests must bind to the original retained request')
    }
    if (failure.message === 'Recruitment HTTP 403') {
      assert.equal(failure.status, 403)
      assert.equal(failure.code, 'RECRUITMENT_HTTP_ERROR')
      assert.ok(fixture.requests.some(receipt => receipt.status === 403 && receipt.requestedURL === failure.requestUrl))
    }
  }
  if (fixture.source === 'veriskanalytics') {
    // The original response already contains this explicit legal employer.
    // Preserve the original HTTP fixture and require its newly extracted field.
    for (const job of jobs) assert.equal(job.nativeSourceRecord.detail.requisitionFlexFields
      .find(field => field.Prompt === 'Legal Employer')?.Value, 'Verisk Analytics India Private Limited')
    for (const expected of expectedJobs) {
      expected.nativeHiringOrganization = {name:'Verisk Analytics India Private Limited'}
      expected.nativeEmployerBinding = null
    }
  }
  const actualJobs = jobs.map(job => ({ jobId: String(job.jobId), title: job.title, applyUrl: job.applyUrl,
    nativeHiringOrganization: job.nativeHiringOrganization ?? null, nativeEmployerBinding: job.nativeEmployerBinding || null,
    postingDate: job.postingDate ?? null, descriptionSHA256: sha(job.sourceDescription || job.jobDescription) }))
  if (fixture.source === 'samsungelectronics') {
    actualJobs.sort((a,b) => a.jobId.localeCompare(b.jobId))
    expectedJobs.sort((a,b) => a.jobId.localeCompare(b.jobId))
  }
  assert.deepEqual(actualJobs, expectedJobs)
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
