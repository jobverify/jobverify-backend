import assert from 'node:assert/strict'
import test from 'node:test'
import {run,inspectInventory,CAREERS_URL,APPLICATION_URL} from './script.js'
import {fixtureFetch} from './fixtureReplay.js'
import {analyzePublishableJobs} from '../../scraper-support/utils/publishableJobMetrics.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {normalizeScrapedJob} from '../../scraper-support/utils/normalizeScrapedJob.js'
import {generateFingerprint} from '../../scraper-support/utils/saveToDB.js'
const now=()=> '2026-10-23T19:00:00.000Z'
const options=fetchImpl=>({fetchImpl:fetchImpl??fixtureFetch(),now})
const withRoles=async change=>{
 const inspected=await inspectInventory(options()),roles=change(inspected.roles.map(r=>r.nativeRecord))
 return fixtureFetch(row=>{
  if(row.url===CAREERS_URL)row.body=row.body.replace(/const ROLES = \[[\s\S]*?\n\s*\];/,'const ROLES = [\n'+roles.map(r=>JSON.stringify(r)).join(',\n')+'\n];')
  return row
 })
}
test('all twelve native roles pass existing location eligibility while unknown countries and dates remain null',async()=>{
 const jobs=await run(options())
 assert.equal(jobs.length,12)
 assert.equal(analyzePublishableJobs(jobs,{now:new Date(now())}).eligibleJobs.length,12)
 assert.ok(jobs.every(r=>r.country===null&&r.postingDate===null&&r.postedAt===null&&r.closingDate===null))
 assert.ok(jobs.every(r=>r.source=== 'easemytrip'&&r.company==='EaseMyTrip'&&r.sourceDescription.length>100))
 assert.ok(jobs.every(r=>r.jobId===null&&r.requisitionId===null))
 assert.ok(jobs.every(r=>normalizeScrapedJob(r,{countryFilter:'India'}).country===null))
 assert.equal(jobs[0].sourceEmploymentType,'Full-time')
 assert.equal(jobs[0].sourceExperienceRequired,'5 to 9 Year(s)')
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 assert.equal(readInventoryEvidence(jobs).indiaFacetCount,null)
 assert.equal(readInventoryEvidence(jobs).reportedTotal,12)
 assert.ok(jobs.every(r=>r.lifecycleCleanupAllowed===false))
})
test('native Remote roles retain the existing public policy without becoming country India',async()=>{
 const jobs=await run(options()),remote=jobs.filter(r=>r.location==='Remote')
 assert.equal(remote.length,2)
 assert.ok(remote.every(r=>r.city==='Remote'&&r.country===null))
})
test('shared employer form preserves twelve separate normalized fingerprints without invented requisition IDs',async()=>{
 const jobs=await run(options())
 assert.equal(new Set(jobs.map(r=>r.applyUrl)).size,1)
 assert.ok(jobs.every(r=>r.applyUrl===APPLICATION_URL&&r.applicationUrlIsGeneric===true))
 assert.equal(new Set(jobs.map(r=>generateFingerprint(normalizeScrapedJob(r,{countryFilter:'India'})))).size,12)
})
test('reordering native array preserves job fingerprints',async()=>{
 const original=await run(options()),reversed=await run(options(await withRoles(roles=>roles.reverse())))
 const hashes=jobs=>new Map(jobs.map(r=>[r.title,generateFingerprint(normalizeScrapedJob(r,{countryFilter:'India'}))]))
 assert.deepEqual(hashes(reversed),hashes(original))
 assert.equal(reversed.length,12)
})
test('unreviewed or foreign composite native locations are withheld while other roles remain available',async()=>{
 for(const loc of ['London','Gurugram-London','Remote, Canada','Gurugram (London)','Unknown']){
  const jobs=await run(options(await withRoles(roles=>[{...roles[0],loc},...roles.slice(1)])))
  assert.equal(jobs.length,11,loc)
  assert.ok(!jobs.some(r=>r.title==='Senior Frontend Engineer'),loc)
 }
})
test('missing descriptions do not withhold otherwise valid native roles',async()=>{
 const jobs=await run(options(await withRoles(roles=>roles.map(r=>({...r,about:null,resp:[],profile:[]})))))
 assert.equal(jobs.length,12)
 assert.ok(jobs.every(r=>r.sourceDescription===null&&r.jobDescription===null&&!r.sourceDetailComplete&&r.sourceDetailStatus==='missing-description'))
 assert.equal(analyzePublishableJobs(jobs,{now:new Date(now())}).eligibleJobs.length,12)
})
test('new country or expiry fields trigger contract review instead of bypassing those gates',async()=>{
 for(const field of [{country:'Canada'},{validThrough:'2020-01-01'},{datePosted:'2027-01-01'}]){
  await assert.rejects(run(options(await withRoles(roles=>[{...roles[0],...field},...roles.slice(1)]))),{code:'EASEMYTRIP_COVERAGE_GAP'})
 }
})
test('title-only and placeholder descriptions remain partial while native roles stay eligible',async()=>{
 for(const content of [r=>({about:r.title,resp:[],profile:[]}),()=>({about:'Job description',resp:[],profile:[]}),r=>({about:'<h2>'+r.title+'</h2>',resp:['<strong>Responsibilities</strong>'],profile:['Requirements:']})]){
  const jobs=await run(options(await withRoles(roles=>roles.map(r=>({...r,...content(r)})))))
  assert.equal(jobs.length,12)
  assert.ok(jobs.every(r=>r.sourceDescription===null&&r.jobDescription===null&&r.sourceDetailComplete===false))
  assert.equal(analyzePublishableJobs(jobs,{now:new Date(now())}).eligibleJobs.length,12)
 }
})
