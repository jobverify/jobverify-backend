import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {getScraperCatalog,createCatalogScraper} from '../scraper-support/providers/index.js'
import {readInventoryEvidence} from '../scraper-support/utils/inventoryEvidence.js'
import {WorkdayHostCircuitBreaker} from '../scraper-support/myworkday/engine.js'
import {withRecordedWorkdayClock} from './helpers/workdayRecordedClock.js'

const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./test-data/recruitmentGoal20261104/native-production.json.gz',import.meta.url))))
const sha=value=>createHash('sha256').update(value).digest('hex')
const key=(url,init={})=>(init.method||'GET')+':'+url+':'+(init.body||'')
const proof=job=>({id:String(job.jobId||job.requisitionId||job.sourceUrl),title:job.title,country:job.country,location:job.location,
 descriptionSHA256:sha(job.sourceDescription||job.jobDescription),postingDate:job.postingDate||null,sourceUrl:job.sourceUrl,applyUrl:job.applyUrl,
 nativeRecordSHA256:sha(JSON.stringify(job.nativeSourceRecord||job.sourceNativeRecord)),nativeEmployer:job.nativeHiringOrganization||null,
 sourceScopeComplete:job.sourceScopeComplete,lifecycleCleanupAllowed:job.lifecycleCleanupAllowed})

test('the current goal proof retains 47 sources, 992 independently verified India records and intact original response bytes',()=>{
 assert.equal(fixture.sources.length,47)
 assert.equal(fixture.sources.reduce((n,s)=>n+s.expected.proofs.length,0),992)
 for(const source of fixture.sources){
  assert.equal(source.countryEvidence.length,source.expected.proofs.length)
  for(const r of source.requests)if(r.text!==undefined||r.bodyBase64!==undefined){
   assert.equal(r.replayed,false)
   assert.equal(sha(r.bodyBase64?Buffer.from(r.bodyBase64,'base64'):r.text),r.bodySHA256)
  }
 }
})
for(const capture of fixture.sources)test(capture.source+': current registered route preserves its native identity, employer, country, full description and incomplete scope',async()=>{
 const provider=getScraperCatalog().find(p=>p.source===capture.source),pending=new Map()
 assert.ok(provider)
 for(const r of capture.requests){const id=key(r.requestedURL,{method:r.method,body:r.body}),rows=pending.get(id)||[];rows.push(r);pending.set(id,rows)}
 const original=globalThis.fetch
 globalThis.fetch=async(url,init={})=>{
  const rows=pending.get(key(String(url),init));assert.ok(rows?.length,'Uncaptured HTTP request: '+url)
  const r=rows.shift()
  if(r.error)throw Object.assign(Error(r.error),{abortRetries:true})
  const response=new Response([204,205,304].includes(r.status)?null:r.bodyBase64?Buffer.from(r.bodyBase64,'base64'):r.text,{status:r.status,headers:r.headers||{'content-type':r.contentType}})
  Object.defineProperty(response,'url',{value:r.finalURL})
  return response
 }
 let jobs
 const run=()=>createCatalogScraper(provider).run({now:()=>capture.completedAt,
  ...(capture.source==='cocacola'?{requestScheduler:{acquire:async()=>()=>{},recordRateLimit(){}},retryBaseDelayMs:0,
   circuitBreaker:new WorkdayHostCircuitBreaker(),detailCircuitBreaker:new WorkdayHostCircuitBreaker()}:{}),
  ...(['britannia','navi','monocept','byteridge','dovercorporation','telstra','aspentechnology','amberstudent','digitalwebsolutions'].includes(capture.source)?{requestIntervalMs:0,fetchImpl:(...args)=>globalThis.fetch(...args)}:{}),
  ...(['teradata','lyrahealth','lakechemicalspvtltd','cdot'].includes(capture.source)?{minIntervalMs:0,fetchImpl:(...args)=>globalThis.fetch(...args)}:{})})
 try{jobs=await(capture.source==='cocacola'?withRecordedWorkdayClock(capture.startedAt,run):run())}finally{globalThis.fetch=original}
 if(capture.expected.globalNativeRecords){
  assert.equal(provider.countryFilter,'Global')
  assert.deepEqual(jobs.map(job=>({...proof(job),sourceClosingQualified:job.sourceClosingQualified,
   sourceCountryScopeUnresolved:job.sourceCountryScopeUnresolved})),capture.expected.globalNativeRecords)
  assert.equal(jobs.length,5)
  assert.deepEqual(jobs.filter(j=>j.country===null).map(j=>j.jobId),['524','512','511','498'])
  assert.ok(jobs.filter(j=>j.country===null).every(j=>j.city===null&&j.location===null&&j.sourceCountryScopeUnresolved))
 }
 const verifiedIndiaJobs=capture.expected.globalNativeRecords?jobs.filter(job=>job.country==='India'):jobs
 assert.deepEqual(verifiedIndiaJobs.map(proof),capture.expected.proofs)
 assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
 assert.equal(readInventoryEvidence(jobs).listingComplete,capture.expected.inventoryEvidence.listingComplete)
 assert.ok(verifiedIndiaJobs.every(j=>j.country==='India'))
 assert.ok(jobs.every(j=>j.sourceScopeComplete===false&&j.lifecycleCleanupAllowed===false))
 if(capture.source==='cdot'){
  assert.equal(jobs.length,1);const job=jobs[0]
  assert.equal(job.numberOfOpenings,5);assert.equal(job.nativeWorkplace,'Delhi');assert.equal(job.location,'Delhi')
  assert.equal(job.sourceWorksiteCountryProof.method,'advertisement-national-deployment-context')
  assert.equal(job.sourceWorksiteCountryProof.contextualBinding,true);assert.equal(job.sourceWorksiteCountryProof.literalRoleCountry,false)
  assert.equal(job.sourceDetailComplete,true);assert.equal(job.nativeRoleClosingReconciled,true)
  assert.equal(job.nativeSourceRecord.pdf.pages.length,17);assert.deepEqual(job.sourceDescriptionPages,[1,2,3,4,5,6,7])
  for(const key of ['requisitionId','nativeCanonicalRoleURL','postingDate','postedAt','firstEverPublication','legalEmployer','applicationDateTimezone'])assert.equal(job[key],null,key)
  assert.equal(job.applicationOpeningDate,'2026-10-07');assert.equal(job.closingDate,'2026-11-08')
  assert.equal(job.applicationUrlIsGeneric,true);assert.equal(job.applicationVisited,false);assert.equal(job.activeApplyVerified,false)
 }
 if(capture.source==='wspindia'){
  assert.equal(jobs.length,444)
  assert.ok(jobs.every(job=>job.companyDomain==='wsp.com'&&job.sourceDetailComplete===true&&job.nativeListingEnumerationComplete===true))
  const audit=jobs[0].sourceNativeCollectionAudit
  assert.equal(audit.distinctAdvertisedRoles,445)
  assert.equal(audit.pagesFetched,23)
  assert.deepEqual(audit.heldNativeRoles.map(row=>row.id),['94515'])
 }
 if(capture.source==='mintifi'){
  assert.equal(jobs[0].locations.length,3)
  assert.equal(jobs[0].city,null)
  assert.equal(jobs[0].requisitionId,null)
  assert.deepEqual(jobs[0].nativeCountryLocations,jobs[0].nativeSourceRecord.jobLocations)
 }
 if(capture.source==='airasiamove'){
  assert.equal(jobs.length,1)
  assert.equal(jobs[0].nativeEmployerBinding.method,'explicit-native-role-company-brand')
  assert.equal(jobs[0].nativeSourceRecord.companyBrand,'MOVE')
  assert.equal(jobs[0].nativeHiringOrganization.name,'AirAsia Technology Center India Private Limited')
 }
 if(capture.source==='samsungelectronics'){
  assert.equal(jobs.length,20)
  assert.ok(jobs.every(job=>job.nativeHiringOrganization.name==='Samsung R&D Institute India - Bangalore'))
 }
 if(capture.source==='zebratechnologies'){
  assert.equal(jobs.length,29)
  assert.ok(jobs.every(job=>job.sourceDescription===job.nativeSourceRecord.jobPostingInfo.jobDescription
   &&job.nativeHiringOrganization.name===job.nativeSourceRecord.hiringOrganization.name))
 }
 if(capture.source==='primenumberstechnologies'){
  assert.equal(jobs.length,3)
  assert.ok(jobs.every(job=>job.sourceDescription===job.nativeSourceRecord.description&&job.postingDatePrecision==='calendar-date'
   &&job.firstEverPostedAt===null&&job.applicationVisited===false))
 }
 if(capture.source==='slb'){
  assert.equal(jobs.length,43)
  assert.equal(jobs.filter(job=>job.nativeCurrentPostingId.startsWith('WD')).length,1)
  assert.equal(jobs.filter(job=>job.nativeCurrentPostingId.startsWith('EF')).length,42)
  assert.ok(jobs.every(job=>job.nativeRoleClosingReconciled===true&&job.nativeEmployerBinding.publisher==='SLB'
   &&job.nativeEmployerBinding.legalEmployer===null&&job.firstEverPostedAt===null&&job.applicationVisited===false))
 }
 if(capture.source==='teradata'){
  assert.equal(jobs.length,86)
  assert.ok(jobs.every(job=>job.nativeRoleClosingReconciled&&job.sourceDetailComplete&&job.applicationVisited===false
   &&job.sourceDescription===job.nativeSourceRecord.posting.descriptionHTML
   &&job.sourceDescription===job.nativeSourceRecord.jobPosting.description
   &&job.postingDate===job.nativeSourceRecord.posting.postedOn&&job.sourceDatePrecision==='millisecond'
   &&job.requisitionId===null&&job.legalEmployer===null&&job.firstEverPublication===null))
  assert.deepEqual(jobs.find(j=>j.jobId==='220747').locations.map(p=>p.country),['India','Mexico','Czechia','Poland'])
  assert.equal(jobs.find(j=>j.jobId==='220835').city,null)
  assert.deepEqual(capture.requests.filter(p=>p.method==='POST').map(p=>JSON.parse(p.body).variables.start),[0,100,0,100])
 }
 if(capture.source==='lyrahealth'){
  assert.equal(jobs.length,7)
  assert.equal(jobs.filter(job=>job.legalEmployer==='Lyra Clinical Associates').length,4)
  assert.ok(jobs.every(job=>job.nativeSourceRecord.posting.country==='IN'&&job.nativeRoleClosingReconciled&&job.sourceDetailComplete
   &&job.applicationVisited===false&&job.postingDate===job.nativeSourceRecord.jobPosting.datePosted&&job.sourceDatePrecision==='day'
   &&job.requisitionId===null&&job.firstEverPublication===null&&job.nativeHiringOrganization.name==='Lyra Health'
   &&job.sourceDescription===job.nativeSourceRecord.jobPosting.description))
  const intake=jobs.find(job=>job.jobId==='0c4e320a-afda-4355-b56a-d4ba6fa9d35e')
  assert.equal(intake.nativeSourceRecord.posting.description,'');assert.match(intake.jobDescription,/Clinical Intake & Triage/)
  assert.ok(jobs.filter(job=>job.location==='India').every(job=>job.city===null))
  assert.equal(capture.requests.length,42)
 }
 if(capture.source==='lakechemicalspvtltd'){
  assert.equal(jobs.length,6)
  assert.ok(jobs.every(j=>j.requisitionId===null&&j.nativeCanonicalRoleURL===null&&j.applicationUrlIsGeneric===true
   &&j.sourceWorksiteCountryProof?.method==='role-assigned-named-worksite-to-current-employer-address'
   &&j.nativeRoleClosingReconciled===true&&j.sourceDetailComplete===true&&j.sourceListingComplete===false
   &&j.applicationVisited===false&&j.legalEmployer===null&&j.postingDate===null&&j.closingDate===null))
  assert.equal(new Set(jobs.map(j=>j.jobId)).size,6)
  assert.equal(new Set(jobs.map(j=>j.sourceUrl)).size,1)
  assert.equal(capture.requests.length,4)
 }
 assert.equal([...pending.values()].reduce((n,rows)=>n+rows.length,0),0,'All recorded requests must be reconciled')
})
