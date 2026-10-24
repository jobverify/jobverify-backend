import assert from 'node:assert/strict'
import test from 'node:test'
import {run} from './script.js'
import {run as aliasRun} from '../parkpluscompany/script.js'
import {fixtureFetch} from './fixtureReplay.js'
import {document} from '../../scraper-support/shared/rmkNativePairHtml.js'
import {analyzePublishableJobs} from '../../scraper-support/utils/publishableJobMetrics.js'
import {normalizeScrapedJob} from '../../scraper-support/utils/normalizeScrapedJob.js'
import {generateFingerprint} from '../../scraper-support/utils/saveToDB.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const SALES_URL='https://parkplus.io/careers/jobs/sales-manager'
const now=()=> '2026-10-23T19:50:00.000Z'
const options=mutate=>({fetchImpl:fixtureFetch(mutate),now})
const changeJob=change=>row=>{
 if(row.url===SALES_URL){const doc=document(row.body),script=doc.nodes(n=>n.tag==='script'&&n.attrs.id==='__NEXT_DATA__')[0],payload=JSON.parse(script.raw);change(payload.props.pageProps.job);row.body=row.body.replace(script.raw,JSON.stringify(payload))}
 return row
}
test('native first-party sales role retains all six city labels, unknown country and original publication',async()=>{
 const jobs=await run(options()),corporate=jobs.find(j=>j.sourceUrl===SALES_URL)
 assert.equal(jobs.length,4)
 assert.ok(corporate)
 assert.equal(corporate.title,'Sales Manager')
 assert.equal(corporate.country,null)
 assert.equal(normalizeScrapedJob(corporate,{countryFilter:'India'}).country,null)
 assert.deepEqual(corporate.locations,['Gurugram','Chennai','Hyderabad','Kolkata','Pune','Mumbai'])
 assert.equal(corporate.postingDate,'2026-07-08T09:42:54.048Z')
 assert.equal(corporate.nativeCreatedAt,'2025-09-29T11:01:27.927Z')
 assert.equal(corporate.nativeUpdatedAt,'2026-07-08T09:42:54.124Z')
 assert.ok(corporate.activeApplyVerified&&corporate.sourceDetailComplete&&corporate.sourceDescription.length>500)
 const metrics=analyzePublishableJobs(jobs,{now:new Date(now())})
 assert.equal(metrics.filterCounts.old,1)
 assert.equal(metrics.eligibleJobs.length,3)
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 assert.equal(readInventoryEvidence(jobs).indiaFacetCount,null)
})
test('both reviewed Park+ aliases produce the same canonical role fingerprints',async()=>{
 const parent=await run(options()),alias=await aliasRun(options())
 assert.equal(alias.length,4)
 assert.ok(alias.every(j=>j.company==='Park+ India'&&j.source==='parkpluscompany'))
 const hashes=jobs=>jobs.map(j=>generateFingerprint(normalizeScrapedJob(j,{countryFilter:'India'})))
 assert.deepEqual(hashes(alias),hashes(parent))
 assert.equal(new Set(hashes(parent)).size,4)
})
test('missing or section-label native descriptions retain the dated partial first-party role',async()=>{
 for(const values of [{whatYouWillDo:null,whoYouAre:null},{whatYouWillDo:'Responsibilities',whoYouAre:'Requirements'},{whatYouWillDo:'<h2>Responsibilities</h2><h3>Requirements</h3>',whoYouAre:null},{whatYouWillDo:'<p>Responsibilities</p><p>Requirements</p>',whoYouAre:null}]){
  const jobs=await run(options(changeJob(job=>Object.assign(job,values)))),corporate=jobs.find(j=>j.sourceUrl===SALES_URL)
  assert.equal(jobs.length,4)
  assert.equal(corporate.sourceDescription,null)
  assert.equal(corporate.sourceDetailComplete,false)
 }
})
test('a native closed flag withholds only the corporate role',async()=>{
 const jobs=await run(options(changeJob(job=>{job.isClosed=true})))
 assert.equal(jobs.length,3)
 assert.ok(!jobs.some(j=>j.sourceUrl===SALES_URL))
})
test('missing enabled submission or matching job profile cannot recover the corporate role',async()=>{
 for(const replace of [body=>body.replace('<button type="submit"','<button disabled type="submit"'),body=>body.replace('value="sales manager"','value="unrelated role"')]){
  const jobs=await run(options(row=>{if(row.url===SALES_URL)row.body=replace(row.body);return row}))
  assert.equal(jobs.length,3)
  assert.ok(!jobs.some(j=>j.sourceUrl===SALES_URL))
 }
})
test('raw country and expiry metadata on the corporate role require reconciliation',async()=>{
 for(const carrier of ['<meta name="country" content="US">','<span hidden data-country="Canada"></span>','<span hidden data-expiry-date="2020-01-01"></span>']){
  await assert.rejects(run(options(row=>{if(row.url===SALES_URL)row.body=row.body.replace('</head>',carrier+'</head>');return row})),e=>e.code==='PARKPLUSINDIA_COVERAGE_GAP')
 }
})
test('invalid or future native publication cannot silently refresh the historical role',async()=>{
 for(const value of [null,'2026-02-30T09:42:54.048Z','2027-07-08T09:42:54.048Z'])await assert.rejects(run(options(changeJob(job=>{job.publishedAt=value}))),e=>e.code==='PARKPLUSINDIA_COVERAGE_GAP')
})
test('a rate-limited external search preserves the verified first-party dated role under both aliases',async()=>{
 for(const execute of [run,aliasRun]){
  const jobs=await execute(options(row=>row.url.includes('/jobs/search/')?{...row,status:429,body:'Rate limited'}:row))
  assert.equal(jobs.length,1)
  assert.equal(jobs[0].sourceUrl,SALES_URL)
  assert.equal(jobs[0].country,null)
  assert.equal(jobs[0].postingDate,'2026-07-08T09:42:54.048Z')
  assert.match(readInventoryEvidence(jobs).reason,/429/)
  assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 }
})
