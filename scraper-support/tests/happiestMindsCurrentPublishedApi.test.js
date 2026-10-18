import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import * as source from '../../scraper/happiestminds/script.js'
import {readInventoryEvidence} from '../utils/inventoryEvidence.js'
const fixture = name => readFile(new URL('./fixtures/happiestminds-current/'+name,import.meta.url),'utf8')
const html=await fixture('current-careers.html')
const payload=JSON.parse(await fixture('published-darwin-roles.json'))
const api='https://smileshrms.darwinbox.com/ms/candidateapi/job/alljobs'
const board='https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/allJobs'
const mockRun=async({body=payload,career=html,cap={},now=()=>'2026-10-09T00:00:00Z',httpStatus=200}={})=>{
 const original=globalThis.fetch
 const calls=[]
 globalThis.fetch=async(url,options={})=>{
  calls.push({url,options})
  if(url===board)return new Response('<title>Smileshrms</title>',{headers:{'set-cookie':'public-test-session=seed; Path=/'}})
  if(url===api+'?companyId=main')return new Response('Forbidden',{status:403})
  assert.equal(url,api)
  assert.equal(options.method,'POST')
  assert.equal(JSON.parse(options.body).companyId,'main')
  assert.equal(options.headers['Accept-Language'],'en')
  return new Response(JSON.stringify(body),{status:httpStatus,headers:{'content-type':'application/json'}})
 }
 try{return {jobs:await source.createHappiestMindsScraper({now,publicBoard:'darwinbox'}).run({...cap,fetchPage:async url=>({status:200,url,html:career})}),calls}}finally{globalThis.fetch=original}
}
test('Happiest current published bare API recovers explicit India roles without claiming the separate Zwayam inventory',async()=>{
 const {jobs,calls}=await mockRun()
 assert.equal(jobs.length,3)
 assert.ok(jobs.every(j=>j.country==='India'&&j.sourceListingComplete===false&&j.jobDescription.length>100))
 assert.ok(calls.some(c=>c.url===api)&&!calls.some(c=>c.url.includes('?companyId=')))
 assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 assert.equal(readInventoryEvidence(jobs).indiaFacetCount,null)
 assert.match(readInventoryEvidence(jobs).reason,/Zwayam/)
 assert.equal(source.createHappiestMindsScraper({publicBoard:'darwinbox'}).buildListingApiUrl(),api)
})
test('Happiest rejects a changed current first-party ATS handoff',async()=>{
 await assert.rejects(mockRun({career:html.replaceAll('https://jobs.happiestminds.com/happiestminds/','https://unrelated.example/jobs')}),/handoff|identity/)
})
for(const [label,change] of [
 ['unverified country',j=>{j.country=null}],
 ['conflicting foreign location',j=>{j.locations='London, United Kingdom'}],
 ['incomplete native description',j=>{j.jd='<p>Engineer</p>'}],
])test('Happiest excludes '+label+' while preserving prior inventory',async()=>{
 const body=structuredClone(payload);change(body.data[0]);const{jobs}=await mockRun({body})
 assert.equal(jobs.length,2);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
test('Happiest zero verified rows retain coverage-gap evidence',async()=>{
 const body=structuredClone(payload);body.data.forEach(j=>{j.country=null});const{jobs}=await mockRun({body})
 assert.equal(jobs.length,0);assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})
test('Happiest caller cap cannot authorize full source reconciliation',async()=>{
 const{jobs}=await mockRun({cap:{maxJobs:1}});assert.equal(jobs.length,1);assert.equal(jobs[0].sourceListingComplete,false)
})

test('Happiest caller cancellation occurs before authority requests',async()=>{
 const controller=new AbortController();controller.abort(new Error('stop-authority'));let calls=0
 await assert.rejects(source.run({signal:controller.signal,fetchPage:async()=>{calls++;return {}}}),/stop-authority/);assert.equal(calls,0)
})
test('Happiest default first-party request receives a bounded caller signal',async()=>{
 const original=globalThis.fetch;const controller=new AbortController();let observed
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://careers.happiestminds.com/');observed=options.signal;const response=new Response(html);Object.defineProperty(response,'url',{value:url});return response}
 try{await source.run({signal:controller.signal,fetchListingPage:async()=>payload});assert.ok(observed&&observed!==controller.signal&&!observed.aborted)}finally{globalThis.fetch=original}
})
test('Happiest duplicate raw IDs across pages fail closed',async()=>{
 const first=structuredClone(payload.data[0]);const conflict={...first,country:'United Kingdom',locations:'London, United Kingdom'}
 await assert.rejects(source.run({fetchPage:async url=>({status:200,url,html}),fetchListingPage:async({page})=>({status:'success',job_counts:11,data:page===1?[first]:[conflict]})}),/duplicate.*ID/i)
})
test('Happiest preserves native careers ISO posting and closing dates',async()=>{
 const body=structuredClone(payload);body.data[0].job_posting.careers.to=Date.parse('2026-12-01')/1000
 const{jobs}=await mockRun({body});assert.equal(jobs[0].postingDate,new Date(body.data[0].job_posting.careers.from*1000).toISOString());assert.equal(jobs[0].closingDate,'2026-12-01T00:00:00.000Z')
})
for(const[label,change]of[['ended',j=>{j.job_posting.careers.to=Date.parse('2026-10-01')/1000}],['future',j=>{j.job_posting.careers.from=Date.parse('2026-11-01')/1000}]])test('Happiest excludes '+label+' native careers lifecycle',async()=>{
 const body=structuredClone(payload);change(body.data[0]);const{jobs}=await mockRun({body});assert.equal(jobs.length,2);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
test('Happiest malformed count cannot become an empty healthy inventory',async()=>{
 await assert.rejects(mockRun({body:{status:'success',job_counts:3,data:[]}}),/malformed or incomplete/)
})

test('Happiest current API denial remains an upstream blocker rather than a zero inventory',async()=>{
 await assert.rejects(mockRun({body:{},httpStatus:403}),error=>error.failureKind==='blocked_or_access_denied'&&error.upstreamOutage===true)
})
