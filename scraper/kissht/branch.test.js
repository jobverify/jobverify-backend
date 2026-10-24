import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {run} from './script.js'
import {readEmployerBranches} from './branches.js'
import {generateFingerprint} from '../../scraper-support/utils/saveToDB.js'
import {normalizeScrapedJob} from '../../scraper-support/utils/normalizeScrapedJob.js'
import {analyzePublishableJobs} from '../../scraper-support/utils/publishableJobMetrics.js'
const packet=n=>{try{return JSON.parse(readFileSync(new URL('./fixtures/'+n,import.meta.url)))}catch(e){if(e.code!=='ENOENT')throw e;return JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/'+n+'.gz',import.meta.url))))}}
const rows=['official-response.json','board-response.json','listing-response.json','detail-responses.json','financing-partners-pages.json','legal-employer-branches.json'].flatMap(packet)
const replay=(edit=r=>r)=>async url=>{const original=rows.find(r=>r.url===url);assert.ok(original,'uncaptured '+url);const r=edit({...original}),response=new Response(r.body,{status:r.status});Object.defineProperty(response,'url',{value:r.finalUrl??r.url});return response}
const options={fetchImpl:replay(),timeoutMs:240000}
const listing=JSON.parse(JSON.parse(packet('listing-response.json').body).d.obj1)
test('branch country authorization rejects additional visible, hidden and structured country carriers',()=>{
 const partner=packet('financing-partners-pages.json')[0].body,html=packet('legal-employer-branches.json')[0].body
 for(const carrier of ['<span itemprop="addressCountry">United States</span>','<span hidden itemprop="addressCountry">United States</span>','<span hidden data-country="US"></span>','<script type="application/ld+json">{"@type":"PostalAddress","addressCountry":"US"}</script>']){
  assert.throws(()=>readEmployerBranches(partner,html.replace(/(<h3[^>]*>\s*Agra\s*<\/h3>)/, '$1'+carrier)),/unreviewed branch address metadata/)
 }
})
test('Kissht uses exact legal-employer branch country, not compliance address as workplace',async()=>{
 const jobs=await run(options);assert.equal(jobs.length,199);assert.ok(jobs.every(j=>j.country==='India'&&j.nativeLegalEmployer==='Si Creva Capital Services Private Limited'))
 const corrected=jobs.find(j=>j.id==='3050');assert.ok(corrected);assert.equal(corrected.city,'Mysore');assert.equal(corrected.state,'Karnataka');assert.equal(corrected.location,'Mysore, Karnataka, India');assert.match(corrected.fingerprintLocation,/Bangalore/)
 const eligible=analyzePublishableJobs(jobs,{now:new Date('2026-10-23T13:00:00Z')}).eligibleJobs;assert.equal(eligible.length,26)
 assert.equal(jobs.some(j=>j.id==='6186'),false)
 for(const job of jobs){const r=listing.find(r=>String(r.ERFCode)===job.id),legacy={...job,city:r.City_Name||null,location:[r.LOCATIONNAME,r.State_Name,'India'].filter(Boolean).join(', ')};delete legacy.fingerprintLocation;assert.equal(generateFingerprint(normalizeScrapedJob(job,{source:'kissht'})),generateFingerprint(normalizeScrapedJob(legacy,{source:'kissht'})))}
})
test('unknown branch and different legal employer cannot borrow compliance-country or branch proof',async()=>{
 const jobs=await run({...options,fetchImpl:replay(r=>{if(r.url.endsWith('/GetCurrentopening')){const p=JSON.parse(r.body),v=JSON.parse(p.d.obj1);v.find(r=>r.ERFCode===3050).CustomName1='Unknown Work Branch';p.d.obj1=JSON.stringify(v);r.body=JSON.stringify(p)}return r})});assert.equal(jobs.some(j=>j.id==='3050'),false);assert.ok(jobs.every(j=>j.nativeLegalEmployer!=='OnEMI Technology Solutions Limited'))
})
test('hidden legal branch directory and changed official domain handoff cannot supply country',async()=>{
 for(const edit of [r=>{if(r.url.includes('/our-branches/'))r.body='<div hidden>'+r.body+'</div>';return r},r=>{if(r.url.includes('financing-partners'))r.body=r.body.replaceAll('https://sicrevacapital.com/','https://other.example/');return r}])await assert.rejects(run({...options,fetchImpl:replay(edit)}),{code:'KISSHT_COVERAGE_GAP'})
})
test('eligible matched work branches retain missing descriptions without bypassing country validation',async()=>{
 const jobs=await run({...options,fetchImpl:replay(r=>{if(r.url.includes('/CandidatePortal/'))r.body=r.body.replaceAll('class="description-info"','hidden class="description-info"');return r})});assert.equal(jobs.length,199);assert.ok(jobs.every(j=>j.sourceDescription===null));assert.equal(analyzePublishableJobs(jobs,{now:new Date('2026-10-23T13:00:00Z')}).eligibleJobs.length,26)
})
