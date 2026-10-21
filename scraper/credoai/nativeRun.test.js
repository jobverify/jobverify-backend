import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {run} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {analyzePublishableJobs} from '../../scraper-support/utils/publishableJobMetrics.js'
import {preload} from './nativeContract.js'
import {readNativeDocument} from './nativeHtml.js'
const packets=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/native-browser-20261021.json.gz',import.meta.url))))
const now=packets[0].startedAt
async function replay(mutate=()=>{},options={}){const p=structuredClone(packets);mutate(p);let i=0;const jobs=await run({now,...options,fetch:async(url,init)=>{const r=p[i++];assert.ok(r);assert.equal(url,r.url);assert.equal(init.method,'GET');return{status:r.status,url:r.finalURL,text:async()=>r.body}}});assert.equal(i,8);return jobs}
const apiMutation=(p,fn)=>{for(const i of[3,6]){const d=JSON.parse(p[i].body);fn(d);p[i].body=JSON.stringify(d)}}
test('actual eight responses preserve current India role and unknown generic Remote scope',async()=>{const j=await replay();assert.equal(j.length,1);assert.equal(j[0].jobId,'73f15a77-9b84-46de-bd9e-bf76f70b6d84');assert.equal(j[0].country,'India');assert.equal(j[0].city,null);assert.equal(j[0].postingDate,'2026-09-26T02:01:08.473+00:00');assert.equal(j[0].sourceDetailComplete,true);assert.equal(j[0].sourceListingComplete,false);assert.equal(analyzePublishableJobs(j,{now}).eligibleJobs.length,1);assert.equal(readInventoryEvidence(j).reportedTotal,null)})
for(const[name,mutate]of[
 ['HTTP202',p=>p[3].status=202],['wrong final URL',p=>p[4].finalURL='https://example.com/'],
 ['wrong native organization',p=>p[2].body=p[2].body.replace('"organizationId":"79a3b1bb-4ea1-4fa0-8f3c-bffc3aac9be9"','"organizationId":"00000000-0000-4000-8000-000000000000"')],
 ['inactive organization preload',p=>p[2].body=p[2].body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,s=>s.includes('window.__appData')?'<template>'+s+'</template>':s)],
 ['inert corporate handoff',p=>p[0].body=p[0].body.replace('<body','<body inert')],
 ['inactive embed',p=>p[1].body=p[1].body.replace('src="https://jobs.ashbyhq.com/credo.ai/embed"','nomodule src="https://jobs.ashbyhq.com/credo.ai/embed"')],
 ['error envelope',p=>apiMutation(p,d=>d.ERROR='failure')],
 ['duplicate native ID',p=>apiMutation(p,d=>d.jobs.push(d.jobs[0]))],
 ['unlisted India role',p=>apiMutation(p,d=>d.jobs[3].isListed=false)],
 ['foreign country contradiction',p=>apiMutation(p,d=>d.jobs[3].address.postalAddress.addressCountry='United States')],
 ['secondary unqualified location',p=>apiMutation(p,d=>d.jobs[3].secondaryLocations=[{location:'Global Remote'}])],
 ['foreign application identity',p=>apiMutation(p,d=>d.jobs[3].applyUrl='https://example.com/application')],
 ['future publication',p=>apiMutation(p,d=>d.jobs[3].publishedAt='2099-01-01T00:00:00.000+00:00')],
 ['invalid native calendar',p=>apiMutation(p,d=>d.jobs[3].publishedAt='2026-02-30T00:00:00.000+00:00')],
 ['native title drift',p=>apiMutation(p,d=>d.jobs[3].title='Different role')],
 ['has more',p=>apiMutation(p,d=>d.hasMore=true)],
 ['final inventory drift',p=>{const d=JSON.parse(p[6].body);d.jobs.pop();p[6].body=JSON.stringify(d)}],
])test(name,async()=>assert.rejects(replay(mutate)))
test('cap0 cannot certify zero',async()=>assert.rejects(replay(()=>{},{maxJobs:0})))
test('caller abort',async()=>{const c=new AbortController();c.abort();await assert.rejects(replay(()=>{},{signal:c.signal}))})
const descriptionMutation=(p,value)=>{const old=JSON.parse(p[3].body).jobs[3].descriptionHtml;apiMutation(p,d=>d.jobs[3].descriptionHtml=value);for(const i of[4,5]){const changed=p[i].body.replaceAll(JSON.stringify(old),JSON.stringify(value));assert.notEqual(changed,p[i].body);p[i].body=changed}}
for(const[name,html]of[
 ['company-only','<h1>About Credo AI</h1><p>Credo AI is an innovative global leader in responsible AI governance and helps major global enterprises transform their organizations safely.</p>'],
 ['inert role sections','<template><h2>About the Role</h2><p>Build and maintain AI governance services and support production customers with enterprise deployments.</p><h2>Key Responsibilities</h2><p>Design scalable systems and develop production applications with strong testing and documentation.</p><h2>Minimum Qualifications</h2><p>Extensive software engineering experience and understanding of distributed systems and production machine learning.</p></template>'],
 ['instruction-only','<h2>About the Role</h2><p>Please click Apply now to view all details and learn more about this opportunity and our recruitment process.</p><h2>Key Responsibilities</h2><p>Please submit your application to view further information about this position and responsibilities.</p><h2>Minimum Qualifications</h2><p>Please click Apply now to view all qualifications and submit your application to this position.</p>'],
])test(name+' remains a missing-description native role',async()=>{const j=await replay(p=>descriptionMutation(p,html));assert.equal(j.length,1);assert.equal(j[0].sourceDetailComplete,false);assert.equal(j[0].jobDescription,null);assert.equal(analyzePublishableJobs(j,{now}).filterCounts.emptyDescription,1)})
test('application confidential flag rejects',async()=>assert.rejects(replay(p=>p[5].body=p[5].body.replace('"isConfidential":false','"isConfidential":true'))))
test('native application deadline is not silently discarded',async()=>assert.rejects(replay(p=>p[5].body=p[5].body.replace('"applicationDeadline":null','"applicationDeadline":"2020-01-01T00:00:00.000Z"'))))
test('final-response caller abort rejects',async()=>{const c=new AbortController();let i=0;await assert.rejects(run({now,signal:c.signal,fetch:async url=>{const p=packets[i++];return{status:p.status,url,text:async()=>{if(i===8)c.abort();return p.body}}}}))})
test('bounded uncooperative transport settles',async()=>assert.rejects(run({now,timeoutMs:20,fetch:()=>new Promise(()=>{})})))
const mutatePreload=(p,index,mutate)=>{
 const data=preload(p[index].body),script=readNativeDocument(p[index].body).nodes(n=>n.tag==='script'&&/^\s*window\.__appData\s*=\s*\{/.test(n.raw??''))[0].raw
 const old=JSON.stringify(data);mutate(data);const changed=script.replace(old,JSON.stringify(data));assert.notEqual(changed,script);p[index].body=p[index].body.replace(script,changed)
}
for(const[name,mutate]of[
 ['new conflicting country field',p=>apiMutation(p,d=>d.jobs[3].country='United States')],
 ['new conflicting employer field',p=>apiMutation(p,d=>d.jobs[3].employer='Unrelated Corp')],
 ['remote boolean contradiction',p=>apiMutation(p,d=>d.jobs[3].isRemote=false)],
 ['native board workplace contradiction',p=>{for(const i of[2,7])mutatePreload(p,i,d=>d.jobBoard.jobPostings.find(j=>j.id===JSON.parse(p[3].body).jobs[3].id).workplaceType='OnSite')}],
 ['second active null preload assignment',p=>p[2].body+='<script>window.__appData = null;</script>'],
 ['India future-hiring pool masquerading as a vacancy',p=>{const id=JSON.parse(p[3].body).jobs[3].id,title='Submit your Resume for Future Hiring';apiMutation(p,d=>d.jobs[3].title=title);for(const i of[2,7])mutatePreload(p,i,d=>d.jobBoard.jobPostings.find(j=>j.id===id).title=title);for(const i of[4,5])mutatePreload(p,i,d=>d.posting.title=title)}],
])test(name+' rejects',async()=>assert.rejects(replay(mutate)))
test('native closed notice overrides preserved historical duties',async()=>{const original=JSON.parse(packets[3].body).jobs[3].descriptionHtml;const changed=original.replace('<h2><strong>About the Role</strong></h2>','<h2><strong>About the Role</strong></h2><p>This role is closed.</p>');assert.notEqual(changed,original);const jobs=await replay(p=>descriptionMutation(p,changed));assert.equal(jobs.length,1);assert.equal(jobs[0].sourceDetailComplete,false);assert.equal(analyzePublishableJobs(jobs,{now}).eligibleJobs.length,0)})
