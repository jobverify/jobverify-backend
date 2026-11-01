import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createCatalogScraper, getScraperCatalog } from '../providers/index.js'
import * as spec from '../../scraper/specindia/script.js'
const fixture = JSON.parse(gunzipSync(readFileSync(new URL('../native-sources/citiSpec/fixtures/actual-http-20261031.json.gz', import.meta.url))))
const pages = new Map(fixture.entities.map(page => [page.receipt.url, page]))
test('SPEC current metadata no longer claims July verification', () => {
  assert.equal(spec.SOURCE, 'specindia');assert.equal(spec.COMPANY, 'SPEC INDIA')
  assert.equal(spec.PROVIDER_METADATA.verifiedOn, null)
})
test('SPEC registered path preserves all own details without India, CMS-date or form-option defaults', async () => {
  const provider = getScraperCatalog().find(row => row.source === 'specindia');let audit
  const jobs = await createCatalogScraper(provider).run({ fetchPage: async url => {
    const page = pages.get(url);assert.ok(page, url)
    return { url, status: page.receipt.status, headers: page.receipt.headers || page.receipt.responseHeaders, bodyBase64: page.bodyBase64 }
  }, onAudit: value => { audit = value } })
  assert.equal(jobs.length, 3);assert.equal(audit.observations.length, 3)
  assert.ok(jobs.every(job => job.jobDescription && job.country === null && job.postingDate === null && job.requisitionId === null))
  assert.ok(jobs.every(job => job.sourceNativeCMSPostId && job.sourceNativeRoleIdentity.originalOpenGraphURLs[0] === job.sourceUrl))
})
