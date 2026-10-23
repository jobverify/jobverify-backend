import test from 'node:test'
import assert from 'node:assert/strict'
import {run,createParkPlusCompanyScraper} from './script.js'
const gap=e=>{assert.equal(e.code,'PARKPLUSCOMPANY_COVERAGE_GAP');assert.equal(e.lifecycleCleanupAllowed,false);assert.equal(e.inventoryEvidence.reportedTotal,null);return true}
test('offline source is evidence-bearing coverage gap',async()=>{await assert.rejects(run({fetchImpl:async()=>{throw Error('offline')}}),gap)})
test('factory aliases retain dependency injection',async()=>{for(const factory of [createParkPlusCompanyScraper])await assert.rejects(factory({fetchImpl:async()=>{throw Error('offline')}}).run(),gap)})
test('aggregate source deadline includes fetch and body',async()=>{for(const fetchImpl of [()=>new Promise(()=>{}),async url=>({url,status:200,text:()=>new Promise(()=>{})})])await assert.rejects(run({fetchImpl,timeoutMs:10}),gap)})
test('exact caller abort reason survives before, fetch and body cancellation',async()=>{for(const stage of ['before','fetch','body']){const c=new AbortController(),reason={stage};if(stage==='before')c.abort(reason);await assert.rejects(run({signal:c.signal,fetchImpl:async url=>{if(stage==='fetch'){c.abort(reason);return new Promise(()=>{})}return {url,status:200,text:()=>{c.abort(reason);return new Promise(()=>{})}}}}),e=>e===reason)}})
test('bounded streamed bodies are cancelled at cap and deadline',async()=>{for(const oversized of [true,false]){let cancelled=false;await assert.rejects(run({timeoutMs:15,fetchImpl:async url=>({url,status:200,body:{getReader:()=>({read:()=>oversized?Promise.resolve({done:false,value:new Uint8Array(3000001)}):new Promise(()=>{}),cancel:async()=>{cancelled=true},releaseLock(){}})}})}),gap);assert.equal(cancelled,true)}})
test('actual Response requires exact final URL',async()=>{const response=new Response('<html>no redirect</html>',{status:200});Object.defineProperty(response,'url',{value:'https://unrelated.example/'});await assert.rejects(run({fetchImpl:async()=>response}),gap)})


import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
const captured=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/official-pages.json.gz',import.meta.url))))[0]
test('actual Park+ identity never becomes evidence that literal Park Plus is empty or shares its jobs',async()=>{await assert.rejects(run({fetchImpl:async()=>{const r=new Response(captured.body,{status:captured.status});Object.defineProperty(r,'url',{value:captured.finalUrl});return r}}),e=>{gap(e);assert.match(e.message,/distinct literal catalogue entry/);assert.equal(e.inventoryEvidence.firstParty,false);assert.equal(e.retainedResponses.length,1);return true})})

test('actual receipt bodies and compressed envelopes match SHA manifest',()=>{const m=JSON.parse(readFileSync(new URL('./fixtures/capture-manifest.json',import.meta.url)));for(const file of m.files){const b=readFileSync(new URL('./fixtures/'+file.file,import.meta.url));assert.equal(createHash('sha256').update(b).digest('hex'),file.sha256);assert.equal(createHash('sha256').update(gunzipSync(b)).digest('hex'),file.uncompressedSHA256)}for(const row of m.responses){const r=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/'+row.file,import.meta.url)))).find(r=>r.url===row.url);assert.equal(createHash('sha256').update(r.body).digest('hex'),row.bodySHA256);assert.equal(r.finalUrl,row.finalUrl)}})
