import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import * as source from '../scraper/cyfuture/script.js'
import {getScraperCatalog,createCatalogScraper} from '../scraper-support/providers/index.js'
import {readInventoryEvidence} from '../scraper-support/utils/inventoryEvidence.js'
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./test-data/recruitmentGoal20261104/cyfuture-native-quality.json.gz',import.meta.url))))
const index='https://cyfuture.com/current-opportunities.html',contact='https://cyfuture.com/contact-us.html'
const lookup=url=>fixture.packets.find(q=>q.requestedURL===url),sha=v=>createHash('sha256').update(v).digest('hex')
const roleURLs=fixture.packets.filter(q=>q.requestedURL.includes('/apply-job/')).map(q=>q.requestedURL)
const fullOrder=[index,contact,...roleURLs,index,contact,...roleURLs]
async function replay(t,edit=()=>{},options={},registered=false){
 const calls=[],counts=new Map(),audits=[]
 const fetchImpl=async(url,init={})=>{
  url=String(url);calls.push({url,init});const packet=lookup(url)
  assert.ok(packet,'Uncaptured Cyfuture URL: '+url)
  const q=structuredClone(packet),n=(counts.get(url)||0)+1;counts.set(url,n);edit(q,n)
  if(q.error)throw Object.assign(Error(q.error),{abortRetries:true})
  const response=new Response(q.bodyText,{status:q.status,headers:q.headers});Object.defineProperty(response,'url',{value:q.finalURL});return response
 }
 t.mock.method(globalThis,'fetch',fetchImpl)
 const settings={fetchImpl,minIntervalMs:0,now:()=> '2026-11-05T15:00:00.000Z',...options,
  onAudit:async audit=>{audits.push(audit);await options.onAudit?.(audit)}}
 let jobs,error
 try{jobs=await(registered?createCatalogScraper(getScraperCatalog().find(p=>p.source==='cyfuture')).run(settings):source.createCyfutureScraper(settings).run())}catch(e){error=e}
 return {jobs,error,calls,audits}
}
test('Cyfuture quality fixture retains twelve distinct original successful public HTML responses',()=>{
 assert.equal(fixture.packets.length,12);assert.equal(new Set(fixture.packets.map(q=>q.requestedURL)).size,12)
 for(const q of fixture.packets){assert.equal(q.status,200);assert.equal(q.replayed,false);assert.equal(sha(Buffer.from(q.bodyText)),q.bodySHA256);assert.equal(Buffer.byteLength(q.bodyText),q.bodyBytes)}
})
test('Cyfuture listing helpers preserve native locations without a city-country dictionary or fabricated requisitions',()=>{
 const rows=source.extractCurrentOpportunities(lookup(index).bodyText);assert.equal(rows.length,10)
 for(const row of rows){assert.equal(row.country,null);assert.equal(row.city,null);assert.equal(row.state,null);assert.equal(row.location,null);assert.equal(row.requisitionId,null);assert.ok(row.nativeLocation)}
 assert.deepEqual(rows.map(r=>r.jobId),['146','143','116','91','126','101','98','70','94','93'])
})
test('Cyfuture detail helpers retain full native criteria and cannot inherit an unproven caller country',()=>{
 const url=roleURLs[0],job=source.extractJobDetail(lookup(url).bodyText,{jobId:'146',sourceUrl:url,country:'India',location:'Noida, India'})
 assert.equal(job.country,null);assert.equal(job.requisitionId,null);assert.equal(job.legalEmployer,null)
 assert.ok(job.nativeSourceRecord);assert.match(job.sourceDescription,/Recruiter Details/);assert.ok(job.sourceDescription.includes('years’ of relevant experience'))
})
test('Cyfuture reconciles ten whole roles and all native country-office context using twenty-four declared reads',async t=>{
 const {jobs,error,calls}=await replay(t);assert.ifError(error);assert.equal(jobs.length,10);assert.deepEqual(calls.map(c=>c.url),fullOrder)
 assert.deepEqual(jobs.map(j=>j.jobId),['146','143','116','91','126','101','98','70','94','93'])
 for(const j of jobs){assert.equal(j.country,'India');assert.equal(j.sourceCountryScopeUnresolved,false);assert.equal(j.sourceDetailComplete,true);assert.equal(j.nativeRoleClosingReconciled,true)
  assert.equal(j.sourceDescription,j.jobDescription);assert.ok(j.sourceDescription.length>500);assert.ok(j.nativeSourceRecord);assert.ok(j.nativeClosingRecord)
  assert.equal(j.sourceWorksiteCountryProof.method,'role-location-to-publisher-office-country-group');assert.equal(j.sourceWorksiteCountryProof.exactCampusEstablished,false)}
})
test('Cyfuture actual India office-tab membership supplies country without treating company spelling or HQ as country',async t=>{
 const {jobs,error}=await replay(t);assert.ifError(error)
 const noida=jobs.find(j=>j.jobId==='146');assert.equal(noida.nativeLocation,'Noida');assert.equal(noida.location,'Noida');assert.equal(noida.city,null);assert.equal(noida.state,null)
 assert.equal(noida.sourceWorksiteCountryProof.countryLabel,'INDIA');assert.equal(noida.sourceWorksiteCountryProof.matchingOffices.length,2)
 assert.equal(noida.sourceWorksiteCountryProof.contactURL,contact);assert.equal(noida.sourceWorksiteCountryProof.contextualBinding,true)
})
test('Cyfuture full native recruiter and optional benefits sections survive without truncated qualification projections',async t=>{
 const {jobs,error}=await replay(t);assert.ifError(error)
 const role=jobs.find(j=>j.jobId==='146');assert.match(role.sourceDescription,/Recruiter Details/);assert.match(role.sourceDescription,/Perks and Benefits/)
 assert.ok(role.sourceDescription.includes('years’ of relevant experience'));assert.equal(role.minimumQualification,null)
 for(const key of ['requisitionId','legalEmployer','postingDate','postedAt','closingDate','firstEverPublication'])assert.equal(role[key],null,key)
 assert.equal(role.applicationUrlIsGeneric,true);assert.equal(role.applicationVisited,false);assert.equal(role.activeApplyVerified,false)
 assert.notEqual(jobs.find(j=>j.jobId==='91').sourceUrl,jobs.find(j=>j.jobId==='70').sourceUrl)
})
test('Cyfuture preserves every original opening and closing index, office and role body with hashes',async t=>{
 const {jobs,error}=await replay(t);assert.ifError(error);const j=jobs[0],packet=lookup(j.sourceUrl)
 for(const [key,q]of [['sourceRawNativeHTML',packet],['sourceClosingRawNativeHTML',packet],['sourceRawNativeIndexHTML',lookup(index)],
  ['sourceClosingRawNativeIndexHTML',lookup(index)],['sourceRawNativeOfficeHTML',lookup(contact)],['sourceClosingRawNativeOfficeHTML',lookup(contact)]]){
  assert.equal(j[key],q.bodyText);assert.equal(j[key+'SHA256'],q.bodySHA256)}
 assert.equal(j.sourceNativeCollectionAudit.responses.length,24)
})
test('Cyfuture registered route preserves own role identity and leaves company/listing/cleanup authority unqualified',async t=>{
 const {jobs,error}=await replay(t,()=>{},{},true);assert.ifError(error);assert.equal(jobs.length,10)
 for(const j of jobs){assert.equal(j.source,'cyfuture');assert.equal(j.sourceScopeComplete,false);assert.equal(j.sourceListingComplete,false);assert.equal(j.lifecycleCleanupAllowed,false)}
 assert.equal(readInventoryEvidence(jobs).status,'coverage-gap');assert.equal(readInventoryEvidence(jobs).reportedTotal,null)
 assert.equal(jobs[0].sourceNativeCollectionAudit.nativeRecords,10)
})
test('Cyfuture missing native India country label cannot be replaced by a company or provider default',async t=>{
 const {jobs,error}=await replay(t,q=>{if(q.requestedURL===contact)q.bodyText=q.bodyText.replace('>INDIA</span>','>UNREVIEWED</span>')})
 assert.ifError(error);assert.equal(jobs.length,10);assert.ok(jobs.every(j=>j.country===null&&j.sourceDetailComplete===false&&j.sourceCountryScopeUnresolved===true))
})
test('Cyfuture a changed closing office-country label withholds opening roles before further detail reads',async t=>{
 const {jobs,error,calls,audits}=await replay(t,(q,n)=>{if(q.requestedURL===contact&&n===2)q.bodyText=q.bodyText.replace('>INDIA</span>','>FRANCE</span>')})
 assert.ok(!jobs||jobs.length===0);assert.equal(calls.length,14)
 const audit=audits[0]||error?.recruitmentObservations;assert.equal(audit.heldNativeRows.length,10);assert.ok(audit.heldNativeRows[0].opening.nativeRecord)
})
test('Cyfuture a changed closing listed role is held before its next detail read',async t=>{
 const {jobs,error,calls,audits}=await replay(t,(q,n)=>{if(q.requestedURL===index&&n===2)q.bodyText=q.bodyText.replaceAll('SOCIAL MEDIA EXECUTIVE / Sr EXECUTIVE','Changed native post title')})
 assert.ifError(error);assert.equal(jobs.length,9);assert.equal(calls.length,23)
 const audit=audits[0];assert.equal(audit.heldNativeRows.length,1);assert.ok(audit.heldNativeRows[0].opening.nativeRecord)
})
test('Cyfuture changed closing full criteria cannot regain qualification through an unchanged listing',async t=>{
 const {jobs,error,audits}=await replay(t,(q,n)=>{if(q.requestedURL===roleURLs[0]&&n===2)q.bodyText=q.bodyText.replace('social media strategies.','social media strategies with a changed requirement.')})
 assert.ifError(error);assert.equal(jobs.length,9);assert.ok(!jobs.some(j=>j.jobId==='146'));assert.equal(audits[0].heldNativeRows.length,1)
})
test('Cyfuture first later denial retains earlier whole native observations as partial and stops the source',async t=>{
 const {jobs,error,calls}=await replay(t,q=>{if(q.requestedURL===roleURLs[1])q.status=403})
 assert.ifError(error);assert.equal(calls.length,4);assert.equal(jobs.length,1);assert.equal(jobs[0].jobId,'146')
 assert.equal(jobs[0].sourceDetailComplete,false);assert.equal(jobs[0].nativeRoleClosingReconciled,false);assert.equal(jobs[0].lifecycleCleanupAllowed,false)
})
for(const status of [202,401,403,429,451])test('Cyfuture first HTTP '+status+' stops the whole source without empty success',async t=>{
 const {jobs,error,calls}=await replay(t,q=>{if(q.requestedURL===index)q.status=status})
 assert.ok(!jobs);assert.ok(error);assert.equal(calls.length,1);assert.equal(calls[0].url,index)
})
test('Cyfuture zero caller cap and exact pre-cancellation perform no HTTP reads',async t=>{
 const zero=await replay(t,()=>{},{maxJobs:0});assert.ifError(zero.error);assert.equal(zero.jobs.length,0);assert.equal(zero.calls.length,0)
 const reason=Error('Cancel Cyfuture before reads'),a=await replay(t,()=>{},{signal:AbortSignal.abort(reason)});assert.equal(a.error,reason);assert.equal(a.calls.length,0)
})
test('Cyfuture a positive cap still reconciles all source observations without cleanup permission',async t=>{
 const {jobs,error,calls}=await replay(t,()=>{},{maxJobs:1});assert.ifError(error);assert.equal(jobs.length,1);assert.equal(calls.length,24);assert.equal(jobs[0].lifecycleCleanupAllowed,false)
})
test('Cyfuture body-only legacy transports and unsupported page caps are rejected before reads',async t=>{
 for(const options of [{fetchPage:async()=>({status:200,url:index,html:lookup(index).bodyText})},{fetchText:async()=>lookup(index).bodyText},{maxPages:1}]){
  const r=await replay(t,()=>{},options);assert.ok(r.error);assert.equal(r.calls.length,0)}
})
test('Cyfuture exact anonymous GETs omit credentials and manually expose redirects',async t=>{
 const {error,calls}=await replay(t);assert.ifError(error)
 for(const {init}of calls){assert.equal(init.method,'GET');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'manual');assert.ok(!init.body)}
})
test('Cyfuture awaited audit callbacks preserve exact caller cancellation',async t=>{
 const controller=new AbortController(),reason=Error('Cancel Cyfuture audit')
 const {jobs,error}=await replay(t,()=>{},{signal:controller.signal,onAudit:async()=>{await Promise.resolve();controller.abort(reason)}})
 assert.ok(!jobs);assert.equal(error,reason)
})
