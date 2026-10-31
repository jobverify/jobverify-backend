import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {getScraperCatalog,createCatalogScraper} from '../../scraper-support/providers/index.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {extractionRawJobMetrics} from '../../scraper-support/utils/extractionRawJobMetrics.js'

for(const [source,observed,emitted]of[['sachaengineering',136,136],['hiddenbrainsinfotech',15,14],['ammachilabs',23,23],['hostbooks',9,9]]){
 test(source+' registered decoration preserves observed native row evidence without certifying an India total',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw Object.assign(Error('Unexpected default test network'),{abortRetries:true})})
  const packets=JSON.parse(gunzipSync(fs.readFileSync(new URL('../'+source+'/test-data/2026-10-31-native-packets.json.gz',import.meta.url))))
  const read=async url=>{const p=packets.find(p=>p.url===url);assert.ok(p,'Uncaptured '+url);assert.equal(p.status,200);return p.body}
  const provider=getScraperCatalog().find(p=>p.source===source)
  const jobs=await createCatalogScraper(provider).run({fetchText:read,fetchBellCompanyApiPage:read,fetchJson:async url=>JSON.parse(await read(url)),now:()=> '2026-10-31T08:00:00.000Z'})
  assert.equal(jobs.length,emitted)
  const audit=jobs[0].nativeCollectionEvidence,evidence=readInventoryEvidence(jobs)
  assert.equal(audit?.source,source);assert.equal(audit.observedListingCount,observed)
  assert.equal(audit.sourceScopeComplete,false);assert.equal(audit.reportedTotal,null);assert.equal(audit.indiaFacetCount,null)
  assert.ok(jobs.slice(1).every(job=>!Object.hasOwn(job,'nativeCollectionEvidence')))
  assert.equal(evidence.listingComplete,false);assert.equal(evidence.reportedTotal,null);assert.equal(evidence.indiaFacetCount,null)
  assert.deepEqual(extractionRawJobMetrics(provider,jobs,evidence),{rawJobs:observed,rawJobsBasis:'observed-native-listing-rows'})
 })
}
