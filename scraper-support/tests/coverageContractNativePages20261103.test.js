import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import * as cosgrid from '../../scraper/cosgridnetworks/script.js'
import * as cyfuture from '../../scraper/cyfuture/script.js'
import {readInventoryEvidence} from '../utils/inventoryEvidence.js'

const fixtures=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/coverage-contract-native-pages-20261103.json.gz',import.meta.url)))).sources
const replay=async(source,transform=value=>value)=>{
 const capture=fixtures.find(row=>row.source===source),calls=[]
 const fetchPage=async url=>{
  calls.push(url);const row=capture.pages.find(row=>row.url===url);assert.ok(row,`Uncaptured native URL: ${url}`)
  return transform({status:row.status,url:row.finalUrl,html:row.html})
 }
 const jobs=source==='cosgridnetworks'?await cosgrid.run({fetchText:async url=>{
  const row=await fetchPage(url)
  if(row.status!==200)throw Object.assign(Error(`HTTP ${row.status}`),{status:row.status})
  return row.html
 }}):await cyfuture.run({fetchPage})
 return{jobs,calls}
}

for(const capture of fixtures)test(`${capture.source} retained native page captures match their hashes`,()=>{
 for(const page of capture.pages)assert.equal(createHash('sha256').update(page.html).digest('hex'),page.sha256)
})

test('COSGrid current public page changes recover four complete native role criteria',async()=>{
 const{jobs}=await replay('cosgridnetworks');assert.equal(jobs.length,4)
 assert.deepEqual(jobs.map(row=>row.jobId),['backend-developer','frontend-developer','embedded-sw-developer','sales-executive'])
 for(const job of jobs){assert.ok(job.jobDescription.length>1000);assert.ok(job.requiredSkills.length>5);assert.equal(job.country,'India');assert.equal(job.lifecycleCleanupAllowed,false)}
 assert.match(jobs[0].jobDescription,/data structures|RESTful APIs/)
 assert.doesNotMatch(jobs[0].jobDescription,/Full Name \*|Submit Application/)
 const evidence=readInventoryEvidence(jobs);assert.equal(evidence.reportedTotal,8);assert.equal(evidence.listingComplete,false)
 assert.match(evidence.reason,/sales-SDR.*BusinessDevelpoment_Lead_gen.*product_Marketing.*Digital_marketing_content/)
})

test('COSGrid public transport failures cannot become authoritative empty inventory',async()=>{
 const unavailable=Object.assign(Error('connect timeout'),{code:'ETIMEDOUT'})
 await assert.rejects(cosgrid.run({fetchText:async()=>{throw unavailable}}),error=>error===unavailable)
 await assert.rejects(replay('cosgridnetworks',row=>({...row,status:403})),/HTTP 403/)
})

test('COSGrid a foreign native employer cannot supply role descriptions',async()=>{
 const capture=fixtures.find(row=>row.source==='cosgridnetworks')
 const page=capture.pages.find(row=>row.url.endsWith('/backend-developer'))
 const altered=page.html.replaceAll('"name":"COSGrid Networks"','"name":"Unrelated Employer"')
 assert.notEqual(altered,page.html)
 assert.throws(()=>cosgrid.extractJobDetail(altered,{sourceUrl:page.url,fallbackListing:{department:'Engineering'}}),/different employer/)
})

test('Cyfuture current Bootstrap tabs recover all ten India role descriptions',async()=>{
 const{jobs,calls}=await replay('cyfuture');assert.equal(jobs.length,10);assert.equal(new Set(jobs.map(job=>job.jobId)).size,10)
 assert.equal(calls.length,13)
 for(const job of jobs){assert.equal(job.country,'India');assert.ok(job.jobDescription.length>1000);assert.ok(job.requiredSkills.length);assert.equal(job.lifecycleCleanupAllowed,false)}
 assert.equal(jobs.some(job=>job.title==='Coming Soon'),false)
 assert.equal(jobs.some(job=>job.location.includes('UK')),false)
 const evidence=readInventoryEvidence(jobs);assert.equal(evidence.firstParty,true);assert.equal(evidence.listingComplete,false)
})

test('Cyfuture missing current native IDs cannot disappear into an empty successful result',async()=>{
 await assert.rejects(replay('cyfuture',page=>({...page,html:page.html.replaceAll('apply-job/','unrelated/')})),/verified current opportunities|incomplete native identity/)
})

test('Cyfuture denies access and foreign response URLs without accepting cached page content',async()=>{
 await assert.rejects(replay('cyfuture',row=>({...row,status:403})),/verified official homepage/)
 await assert.rejects(replay('cyfuture',row=>({...row,url:'https://unrelated.invalid/careers'})),/response URL/)
})

test('Cyfuture a successful detail for another role cannot overwrite a listed identity',()=>{
 const capture=fixtures.find(row=>row.source==='cyfuture')
 const page=capture.pages.find(row=>row.url.includes('/apply-job/146/'))
 assert.throws(()=>cyfuture.extractJobDetail(page.html,{jobId:'999'}),/different native role ID/)
})
