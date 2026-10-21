import test from 'node:test'
import assert from 'node:assert/strict'
import {run} from './script.js'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const fixture=()=>JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/runtime-native-20261021.json.gz',import.meta.url))))
async function replay(change,options={}){
 const f=fixture(),original=globalThis.fetch;let calls=0
 globalThis.fetch=async(url,init={})=>{const packet=f.packets.find(p=>p.url===String(url)&&p.requestBody===(init.body??null));assert.ok(packet,'Uncaptured native request '+url);const p=structuredClone(packet);change?.(p,++calls);const r=new Response(p.body,{status:p.status});Object.defineProperty(r,'url',{value:p.finalURL});return r}
 try{return await run({now:f.now,requestScheduler:{acquire:async()=>()=>{},recordRateLimit:()=>{},minIntervalMs:0},retryBaseDelayMs:0,...options})}finally{globalThis.fetch=original}
}
test('all53 native India country roles include cityless explicit-country office without inventing a city',async()=>{
 const jobs=await replay();assert.equal(jobs.length,53);const j=jobs.find(j=>j.requisitionId==='30219751');assert.equal(j.city,null);assert.equal(j.country,'India');assert.equal(j.location,'2nd Floor, IndiQube ARCADE, Subramanya ARCADE,Bannerghatta Road, Old Gurappanapalya, BTM Layout');assert.ok(jobs.every(j=>j.sourceDetailComplete&&j.sourceListingComplete===false));assert.equal(readInventoryEvidence(jobs).reportedTotal,null)
})

test('Carrier rejects a zero cap rather than returning a verified empty sentinel',async()=>{
 await assert.rejects(()=>run({maxJobs:0}),/truncated/)
})
test('Carrier requires a current successful official handoff before any native inventory',async()=>{
 await assert.rejects(()=>run({fetchPage:async url=>({status:200,url,body:'<html><title>Carrier</title><body>No current careers handoff</body></html>'})}),/binding/)
})
test('Carrier honours explicit zero timeout and an already aborted caller',async()=>{
 await assert.rejects(()=>run({timeoutMs:0}),/deadline/)
 const c=new AbortController();c.abort(Error('caller stopped'));await assert.rejects(()=>run({signal:c.signal}),/caller stopped/)
})
const detailChange=fn=>p=>{if(p.url.includes('/wday/cxs/')&&p.url.includes('/job/')){const j=JSON.parse(p.body);fn(j);p.body=JSON.stringify(j)}}
for(const [name,fn]of [
 ['uppercase failure',j=>{j.META={STATUS:500}}],['native numeric ID',j=>{j.jobPostingInfo.jobReqId=Number(j.jobPostingInfo.jobReqId)}],
 ['foreign structured country',j=>{j.jobPostingInfo.jobRequisitionLocation.country.alpha2Code='US'}],
 ['foreign primary country',j=>{j.jobPostingInfo.country={descriptor:'United States',id:'foreign'}}],
 ['foreign explicit address segment',j=>{j.jobPostingInfo.location='New York, United States, India'}],
 ['unknown secondary office',j=>{j.jobPostingInfo.additionalLocations=['Remote']}],
 ['wrong application identity',j=>{j.jobPostingInfo.externalUrl=j.jobPostingInfo.externalUrl.replace(/_\d+(?:-\d+)?$/,'_99999999')}],
 ['private/closed native status',j=>{j.jobPostingInfo.canApply=false}],['unknown legal employer',j=>{j.hiringOrganization.name='Unrelated Corp'}],
 ['future publication',j=>{j.jobPostingInfo.startDate='2099-01-01'}],['impossible calendar',j=>{j.jobPostingInfo.startDate='2026-02-30'}],
 ['hidden fullJD',j=>{j.jobPostingInfo.jobDescription='<div hidden>'+j.jobPostingInfo.jobDescription+'</div>'}],
 ['inert fullJD',j=>{j.jobPostingInfo.jobDescription='<div inert>'+j.jobPostingInfo.jobDescription+'</div>'}],
 ['closed notice instead of fullJD',j=>{j.jobPostingInfo.jobDescription='<p>This job is no longer available.</p>'}],
 ['CTA instead of fullJD',j=>{j.jobPostingInfo.jobDescription='<p>Click Apply Now to view the full job description.</p>'}],
])test('full ordinary wrapper rejects '+name,async()=>{await assert.rejects(()=>replay(detailChange(fn)))})
test('exact native pages reject duplicate IDs, primitive total errors and final inventory drift',async()=>{
 for(const mode of ['duplicate','total','drift']){let posts=0;await assert.rejects(()=>replay(p=>{if(p.method==='POST'){posts++;const j=JSON.parse(p.body);if(mode==='duplicate'&&posts===1)j.jobPostings[1]=structuredClone(j.jobPostings[0]);if(mode==='total')j.total=[j.total];if(mode==='drift'&&posts===4)j.jobPostings[0].title+=' changed';p.body=JSON.stringify(j)}}))}
})
test('HTTP202 and changed final response URL fail without producing an empty result',async()=>{for(const fn of [p=>{p.status=202},p=>{p.finalURL='https://example.invalid/'}])await assert.rejects(()=>replay(p=>{if(p.method==='POST')fn(p)}))})
test('caller cancellation after the final response remains a failed attempt',async()=>{const c=new AbortController();let posts=0;await assert.rejects(()=>replay(p=>{if(p.method==='POST'&&++posts===6)c.abort(Error('final response cancellation'))},{signal:c.signal}),/final response cancellation/)})
