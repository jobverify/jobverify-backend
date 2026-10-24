import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {run} from './script.js'
import {run as parentRun} from '../parkplusindia/script.js'
import {generateFingerprint} from '../../scraper-support/utils/saveToDB.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {analyzePublishableJobs} from '../../scraper-support/utils/publishableJobMetrics.js'
const native=['official-pages.json','linkedin-pages.json'].flatMap(f=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/native-'+f+'.gz',import.meta.url)))))
const identities=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/identity-pages.json.gz',import.meta.url))))
const rows=[...native,...identities]
const replay=rows=>async url=>{const r=rows.find(r=>r.url===url);assert.ok(r,'uncaptured '+url);const response=new Response(r.body,{status:r.status});Object.defineProperty(response,'url',{value:r.finalUrl});return response}
const now='2026-10-23T12:00:00Z'
test('first-party literal alias proof recovers verified native India jobs without new fingerprints',async()=>{
 const jobs=await run({now,fetchImpl:replay(rows)}),parent=await parentRun({now,fetchImpl:replay(native)})
 assert.equal(jobs.length,4);assert.deepEqual(jobs.map(generateFingerprint),parent.map(generateFingerprint))
 assert.ok(jobs.every(j=>j.source==='parkpluscompany'&&j.company==='Park+ India'))
 assert.equal(jobs.filter(j=>j.country==='India').length,3);assert.equal(jobs.filter(j=>j.country===null).length,1)
 assert.equal(readInventoryEvidence(jobs).listingComplete,false);assert.equal(readInventoryEvidence(jobs).reportedTotal,null)
 assert.equal(jobs.nativeCollectionEvidence.verifiedAlias,'Park Plus')
})
test('alias requires active first-party literal, brand and legal identity proof',async()=>{
 for(const target of ['Park Plus, a provider','Also known as Park+']){
  await assert.rejects(run({now,fetchImpl:replay(rows.map(r=>r.url.includes('/car-news/')||r.url.endsWith('/contact-us')?{...r,body:r.body.replaceAll(target,'unverified identity')}:r))}),e=>e.code==='PARKPLUSCOMPANY_COVERAGE_GAP')
 }
})
test('missing descriptions survive alias extraction and publishing eligibility',async()=>{
 const jobs=await run({now,fetchImpl:replay(rows.map(r=>r.url.includes('/jobs/view/')?{...r,body:r.body.replaceAll('class="show-more-less-html__markup','hidden class="show-more-less-html__markup')}:r))})
 assert.equal(jobs.length,4);assert.ok(jobs.filter(j=>j.sourceUrl.includes('linkedin.com')).every(j=>j.sourceDescription===null&&j.sourceDetailComplete===false));assert.equal(analyzePublishableJobs(jobs,{now:new Date(now)}).eligibleJobs.length,3)
})

test('hidden first-party alias evidence cannot authorize employer substitution',async()=>{
 for(const path of ['/car-news/','/contact-us'])await assert.rejects(run({now,fetchImpl:replay(rows.map(r=>r.url.includes(path)?{...r,body:'<div hidden>'+r.body+'</div>'}:r))}),e=>e.code==='PARKPLUSCOMPANY_COVERAGE_GAP')
})
