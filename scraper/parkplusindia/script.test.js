import test from 'node:test'
import assert from 'node:assert/strict'
import {run,createParkPlusIndiaScraper} from './script.js'
const gap=e=>{assert.equal(e.code,'PARKPLUSINDIA_COVERAGE_GAP');assert.equal(e.lifecycleCleanupAllowed,false);assert.equal(e.inventoryEvidence.reportedTotal,null);return true}
test('offline source is evidence-bearing coverage gap',async()=>{await assert.rejects(run({fetchImpl:async()=>{throw Error('offline')}}),gap)})
test('factory aliases retain dependency injection',async()=>{for(const factory of [createParkPlusIndiaScraper])await assert.rejects(factory({fetchImpl:async()=>{throw Error('offline')}}).run(),gap)})
test('aggregate source deadline includes fetch and body',async()=>{for(const fetchImpl of [()=>new Promise(()=>{}),async url=>({url,status:200,text:()=>new Promise(()=>{})})])await assert.rejects(run({fetchImpl,timeoutMs:10}),gap)})
test('exact caller abort reason survives before, fetch and body cancellation',async()=>{for(const stage of ['before','fetch','body']){const c=new AbortController(),reason={stage};if(stage==='before')c.abort(reason);await assert.rejects(run({signal:c.signal,fetchImpl:async url=>{if(stage==='fetch'){c.abort(reason);return new Promise(()=>{})}return {url,status:200,text:()=>{c.abort(reason);return new Promise(()=>{})}}}}),e=>e===reason)}})
test('bounded streamed bodies are cancelled at cap and deadline',async()=>{for(const oversized of [true,false]){let cancelled=false;await assert.rejects(run({timeoutMs:15,fetchImpl:async url=>({url,status:200,body:{getReader:()=>({read:()=>oversized?Promise.resolve({done:false,value:new Uint8Array(3000001)}):new Promise(()=>{}),cancel:async()=>{cancelled=true},releaseLock(){}})}})}),gap);assert.equal(cancelled,true)}})
test('actual Response requires exact final URL',async()=>{const response=new Response('<html>no redirect</html>',{status:200});Object.defineProperty(response,'url',{value:'https://unrelated.example/'});await assert.rejects(run({fetchImpl:async()=>response}),gap)})


import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {analyzePublishableJobs} from '../../scraper-support/utils/publishableJobMetrics.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const receipts=['official-pages.json','linkedin-pages.json'].flatMap(file=>JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/'+file+'.gz',import.meta.url)))))
const replay=rows=>async url=>{const row=rows.find(r=>r.url===url);assert.ok(row,'uncaptured '+url);const r=new Response(row.body,{status:row.status});Object.defineProperty(r,'url',{value:row.finalUrl});return r}
test('actual native Park+ roles retain explicit India and original native public dates',async()=>{const jobs=await run({fetchImpl:replay(receipts),now:'2026-10-23T09:00:00Z'});assert.deepEqual(jobs.map(j=>[j.jobId,j.postingDate]),[['4477179645','2026-10-08'],['4473723466','2026-09-30'],['4478381909','2026-10-12']]);assert.ok(jobs.every(j=>j.country==='India'&&j.activeApplyVerified&&j.sourceDetailComplete));assert.equal(readInventoryEvidence(jobs).reportedTotal,null);assert.equal(readInventoryEvidence(jobs).listingComplete,false);assert.equal(jobs.nativeCollectionEvidence.excludedCorporateSalesRole.country,null)})

test('native identity, explicit country and date/expiry metadata drift fail closed',async()=>{for(const edit of [s=>s.replaceAll('urn:li:organization:31193090','urn:li:organization:7'),s=>s+'<script type="application/ld+json">{"@type":"JobPosting"}</script>',s=>s+'<span itemprop="addressCountry">France</span>',s=>s+'<meta property="validThrough" content="2026-10-01">',s=>s+'<article itemtype="https://schema.org/JobPosting"></article>'])await assert.rejects(run({fetchImpl:replay(receipts.map(r=>r.url.includes('/company/')?{...r,body:edit(r.body)}:r))}),gap)})

test('actual receipt bodies and compressed envelopes match SHA manifest',()=>{const m=JSON.parse(readFileSync(new URL('./fixtures/capture-manifest.json',import.meta.url)));for(const file of m.files){const b=readFileSync(new URL('./fixtures/'+file.file,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),file.sha256);assert.equal(createHash('sha256').update(gunzipSync(b)).digest('hex'),file.uncompressedSHA256)}for(const row of m.responses){const r=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/'+row.file,import.meta.url)))).find(r=>r.url===row.url);assert.equal(createHash('sha256').update(r.body).digest('hex'),row.bodySHA256);assert.equal(r.finalUrl,row.finalUrl)}})

test('new primary role absolute time cannot be hidden by recent listing dates',async()=>{await assert.rejects(run({fetchImpl:replay(receipts.map(r=>r.url.includes('/jobs/view/')?{...r,body:r.body.replace('</h1>','</h1><time datetime="2025-01-01">First published January 1, 2025</time>')}:r))}),gap)})

test('missing native description remains eligible and partial after identity, country and application verification',async()=>{const jobs=await run({now:'2026-10-23T09:00:00Z',fetchImpl:replay(receipts.map(r=>r.url.includes('/jobs/view/')?{...r,body:r.body.replaceAll('class="show-more-less-html__markup','hidden class="show-more-less-html__markup')}:r))});assert.equal(jobs.length,3);assert.equal(analyzePublishableJobs(jobs,{now:new Date('2026-10-23T09:00:00Z')}).eligibleJobs.length,3);assert.ok(jobs.every(j=>j.sourceDescription===null&&j.sourceDetailComplete===false&&j.sourceDetailStatus==='partial'))})
