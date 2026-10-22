import test from 'node:test'
import assert from 'node:assert/strict'
import {run} from './script.js'
import {nativePackets,replayTransport} from './nativeReplayFixture.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {getScraperCatalog} from '../../scraper-support/providers/index.js'
import {analyzePublishableJobs} from '../../scraper-support/utils/publishableJobMetrics.js'

const NOW='2026-10-21T17:49:06.302Z'
async function replay(mutate,packets){
 const transport=replayTransport(packets,mutate),prior=globalThis.fetch
 globalThis.fetch=transport.fetch
 try{return {jobs:await run({now:NOW}),transport}}finally{globalThis.fetch=prior}
}
const changeDetail=fn=>(p)=>{if(p.url.includes('/job/')){const d=JSON.parse(p.body);fn(d,p);p.body=JSON.stringify(d)}}

test('all 52 native packets map exact active regional roles without claiming company inventory',async()=>{
 const {jobs,transport}=await replay()
 assert.equal(transport.consumed,52);assert.equal(jobs.length,20)
 assert.equal(new Set(jobs.map(j=>j.jobId)).size,20)
 for(const job of jobs){assert.equal(job.sourceScopeComplete,false);assert.equal(job.sourceListingComplete,false);assert.equal(job.sourceGlobalJobCount,null);assert.equal(job.sourceIndiaJobCount,null);assert.equal(job.country,'India');assert.equal(job.applyUrl,job.sourceUrl);assert.ok(!job.applyUrl.endsWith('/apply'));assert.ok(job.sourceDescription.length>100);assert.equal(job.sourceDetailComplete,true)}
 assert.equal(jobs.find(j=>j.jobId==='JR100432').postedAt,'2026-09-10T00:00:00.000Z')
 assert.equal(jobs.find(j=>j.jobId==='JR102021').postedAt,'2026-10-21T00:00:00.000Z')
 const evidence=readInventoryEvidence(jobs);assert.equal(evidence.status,'coverage-gap');assert.equal(evidence.listingComplete,false);assert.equal(evidence.reportedTotal,null)
 assert.equal(jobs[0].sourceOfficialBinding.observedAt,'2026-10-21T15:53:06.882Z')
})
test('sparse sequence43 catalog override supersedes sentinel/discovery without renewing clocks',()=>{
 const p=getScraperCatalog().find(p=>p.source==='dovercorporation')
 assert.equal(p.atsPlatform,'workday');assert.equal(p.catalogOverride,true);assert.equal(p.verifiedIndiaJobCount,null);assert.equal(p.verifiedPublicJobCount,null);assert.equal(p.verifiedAt,null);assert.equal(p.verifiedOn,null)
 assert.equal(p.officialBindingVerifiedAt,'2026-10-21T15:53:06.882Z');assert.equal(p.sourceScopeComplete,false)
})
test('typed facet ordering is insignificant but nesting, IDs, labels and counts are exact',async()=>{
 const {jobs}=await replay(p=>{if(p.method==='POST'){let d=JSON.parse(p.body);const reverse=a=>{a.reverse();a.forEach(n=>{if(n.values)reverse(n.values)})};reverse(d.facets);p.body=JSON.stringify(d)}})
 assert.equal(jobs.length,20)
 await assert.rejects(replay((p,n)=>{if(n===28){let d=JSON.parse(p.body);d.facets[0].values[0].count++;p.body=JSON.stringify(d)}}),/facet|drift/i)
})
for(const [name,fn,pattern] of [
 ['foreign country',d=>d.jobPostingInfo.country.descriptor='USA',/country/i],
 ['foreign structured location',d=>d.jobPostingInfo.jobRequisitionLocation.country.alpha2Code='US',/country/i],
 ['bad posting UID',d=>d.jobPostingInfo.id='bad',/identity|UID/i],
 ['bad requisition',d=>d.jobPostingInfo.jobReqId='JR999',/identity|requisition/i],
 ['bad native employer',d=>d.hiringOrganization.name='Unrelated India Company',/employer/i],
 ['closed role',d=>d.jobPostingInfo.canApply=false,/closed|available|active/i],
 ['future start date',d=>d.jobPostingInfo.startDate='2026-10-22',/date|future/i],
 ['impossible date',d=>d.jobPostingInfo.startDate='2026-02-30',/date/i],
 ['wrong role URL',d=>d.jobPostingInfo.externalUrl+='?apply=true',/identity|URL/i],
 ['foreign secondary location',d=>d.jobPostingInfo.additionalLocations=['Austin, Texas, USA'],/location|country/i],
])test('fails safely on '+name,async()=>assert.rejects(replay(changeDetail(fn)),pattern))

test('missing or instruction-only JD preserves raw rejection and regional jobs as incomplete',async()=>{
 for(const html of ['', '<p>Please click Apply now to view the full job description and requirements. Please complete your application to access responsibilities and qualifications.</p>', '<div hidden>Design, implement and test software components using C# and .NET.</div>', '<div inert>Design, implement and test software components using C# and .NET.</div>']){
  const {jobs}=await replay(changeDetail(d=>d.jobPostingInfo.jobDescription=html))
  assert.equal(jobs.length,20);assert.ok(jobs.every(j=>j.sourceDetailComplete===false&&j.sourceDescription===null&&j.jobDescription===null&&j.sourceRejectedNativeDescription===html))
 }
})
test('valid JD with recruiting footer remains intact while closed text is rejected',async()=>{
 const {jobs}=await replay();assert.match(jobs[0].sourceDescription,/Fraudulent Recruiting Disclaimer/)
 await assert.rejects(replay(changeDetail(d=>d.jobPostingInfo.jobDescription='<p>This position is no longer available.</p>'+d.jobPostingInfo.jobDescription)),/closed|available/i)
})
test('upstream and final listing failures never become successful zero',async()=>{
 await assert.rejects(replay((p,n)=>{if(n===3)p.status=503}),/HTTP/i)
 await assert.rejects(replay((p,n)=>{if(n===29){let d=JSON.parse(p.body);d.jobPostings=[];p.body=JSON.stringify(d)}}),/truncated|listing|count/i)
 await assert.rejects(replay((p,n)=>{if(n===4){let d=JSON.parse(p.body);d.error='unavailable';p.body=JSON.stringify(d)}}),/envelope|schema|error/i)
})
test('rejects duplicate native listings and detail UID collisions',async()=>{
 await assert.rejects(replay((p,n)=>{if(n===5){let d=JSON.parse(p.body);d.jobPostings[1]=d.jobPostings[0];p.body=JSON.stringify(d)}}),/duplicate/i)
 await assert.rejects(replay(changeDetail(d=>d.jobPostingInfo.id='a'.repeat(32))),/duplicate/i)
})
test('client version may advance on exact advertised CDN, arbitrary hosts fail',async()=>{
 assert.equal((await replay((p,n)=>{if(n===2)p.finalURL=p.finalURL.replace('2026.40.17','2026.41.1')})).jobs.length,20)
 await assert.rejects(replay((p,n)=>{if(n===2)p.finalURL='https://untrusted.example/cx-jobs.min.js'}),/client|URL|identity/i)
})
test('inert shell identity or contradictory canonical cannot establish the board',async()=>{
 await assert.rejects(replay((p,n)=>{if(n===1)p.body='<template>'+p.body+'</template>'}),/board|identity|advertisement/i)
 await assert.rejects(replay((p,n)=>{if(n===1)p.body=p.body.replace('href="https://dover.wd103.myworkdayjobs.com/Dover"','href="https://foreign.example/jobs"')}),/board|identity|advertisement/i)
})
test('selected listing facet count must agree with the office total',async()=>{
 await assert.rejects(replay((p,n)=>{if(n===4){const d=JSON.parse(p.body);const group=d.facets.find(v=>v.facetParameter==='locationMainGroup').values.find(v=>v.facetParameter==='locations');group.values.find(v=>v.id==='fd26dd94fa9b10011f47b0ef19600000').count=2;p.body=JSON.stringify(d)}}),/facet|count/i)
})
test('company intro and footer cannot disguise instruction-only or disabled role text',async()=>{
 const p=JSON.parse(nativePackets()[8].body).jobPostingInfo.jobDescription
 const intro=p.slice(0,p.indexOf('</p>')+4),footer=p.slice(p.indexOf('<p>All qualified applicants'))
 for(const role of ['<p>Please click Apply now to view the full job description and responsibilities.</p>','<div disabled>Diagnose, isolate and resolve technical software and hardware issues and investigate customer reports in C# and .NET applications.</div>']){
  const {jobs}=await replay(changeDetail(d=>d.jobPostingInfo.jobDescription=intro+role+footer));assert.ok(jobs.every(j=>j.sourceDetailComplete===false&&j.sourceRejectedNativeDescription===intro+role+footer))
 }
})
test('native client redirect is checked before fetching its target',async()=>{
 const transport=replayTransport(),prior=globalThis.fetch
 globalThis.fetch=async(url,options)=>url.includes('candidate-experience-jobs')?{status:302,url,headers:new Headers({location:'https://foreign.example/client.js'})}:transport.fetch(url,options)
 try{await assert.rejects(run({now:NOW}),/client redirect URL/i);assert.equal(transport.consumed,1)}finally{globalThis.fetch=prior}
})
test('default GET negotiates HTML board and JavaScript client rather than Workday SPA JSON redirect',async()=>{
 const {transport}=await replay()
 assert.equal(transport.calls[0].accept,'text/html,application/xhtml+xml')
 assert.equal(transport.calls[1].accept,'application/javascript,*/*;q=0.8')
 assert.equal(transport.calls[2].accept,'application/json')
})
test('date-only native endDate is a calendar deadline, without inventing a midnight closure',async()=>{
 const {jobs}=await replay(changeDetail(d=>d.jobPostingInfo.endDate='2026-10-21'))
 assert.ok(jobs.every(j=>j.sourceClosingDateIsExact===false))
 const analysis=analyzePublishableJobs(jobs,{now:new Date(NOW)})
 assert.equal(analysis.filterCounts.closed,0);assert.equal(analysis.filterCounts.old,1)
})
test('explicit zero selected offices stays a coverage gap, never company verified empty',async()=>{
 const packets=nativePackets().filter((_,i)=>i<7||i>=27&&i<=31).map(p=>{
  if(p.method==='POST'){let d=JSON.parse(p.body);const walk=a=>a.forEach(v=>{if(v.id&&['fd26dd94fa9b10011f47b0ef19600000','fd26dd94fa9b10011f511de99c700000','fd26dd94fa9b10011f536a1fce010000','fd26dd94fa9b10011f54c6ccf4c50000'].includes(v.id))v.count=0;if(v.values)walk(v.values)});walk(d.facets);if(p.requestBody.appliedFacets.locations){d.total=0;d.jobPostings=[]}p.body=JSON.stringify(d)}return p
 })
 const {jobs}=await replay(undefined,packets);assert.equal(jobs.length,0);assert.equal(readInventoryEvidence(jobs).status,'coverage-gap');assert.equal(readInventoryEvidence(jobs).reportedTotal,null)
})
test('complete selected office pagination follows exact totals and validates every page',async()=>{
 const packets=nativePackets(),rebuild=[]
 // Split the 11-row Bangalore packet into an actual 20+1 page inventory by
 // adding ten distinct fixture roles derived from captured native records.
 const first=JSON.parse(packets[4].body),template=JSON.parse(packets[8].body),added=[]
 for(let i=0;i<10;i++){const d=structuredClone(template),v=d.jobPostingInfo,req='JR90000'+i;v.id=(i+1).toString(16).padStart(32,'0');v.jobReqId=req;v.jobPostingId='Fixture-Engineer_'+req;v.externalUrl=v.externalUrl.replace(/\/[^/]+$/,'/'+v.jobPostingId);const row={...first.jobPostings[0],title:v.title,externalPath:'/job/Bangalore-Karnataka-India/'+v.jobPostingId,bulletFields:[d.hiringOrganization.name,req]};added.push({d,row})}
 const patchFacet=d=>{const walk=a=>a.forEach(v=>{if(v.id==='fd26dd94fa9b10011f511de99c700000')v.count=21;if(v.values)walk(v.values)});walk(d.facets)}
 for(let i=0;i<52;i++){
  const p=structuredClone(packets[i]);if(p.method==='POST'){let d=JSON.parse(p.body);patchFacet(d);if([4,29].includes(i)){d.total=21;let all=[...d.jobPostings,...added.map(x=>x.row)];d.jobPostings=all.slice(0,20);p.body=JSON.stringify(d);rebuild.push(p);const next=structuredClone(p);next.requestBody.offset=20;d.jobPostings=all.slice(20);next.body=JSON.stringify(d);rebuild.push(next);continue}p.body=JSON.stringify(d)}
  rebuild.push(p)
  if([18,43].includes(i))for(const x of added)rebuild.push({...structuredClone(p),url:'https://dover.wd103.myworkdayjobs.com/wday/cxs/dover/Dover'+x.row.externalPath,finalURL:'https://dover.wd103.myworkdayjobs.com/wday/cxs/dover/Dover'+x.row.externalPath,body:JSON.stringify(x.d)})
 }
 const result=await replay(undefined,rebuild);assert.equal(result.jobs.length,30);assert.equal(result.transport.consumed,74)
})
