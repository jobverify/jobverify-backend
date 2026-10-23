import test from 'node:test'
import assert from 'node:assert/strict'
import {run} from './script.js'
import {readFileSync,readdirSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {activeDocument,collectNative,HANDOFF_URL,ENTRY_URL} from './native.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const gap=e=>{assert.equal(e.code,'DASSAULTAVIATIONINDIA_COVERAGE_GAP');assert.equal(e.lifecycleCleanupAllowed,false);assert.equal(e.inventoryEvidence.reportedTotal,null);return true}
test('Dassault unavailable native inventory is not a successful zero',async()=>{
  await assert.rejects(run({fetchImpl:async()=>{throw Error('offline')}}),gap)
})
test('Dassault aggregate deadline bounds fetch and response body stalls',async()=>{
  for(const fetchImpl of [()=>new Promise(()=>{}),async url=>({url,status:200,text:()=>new Promise(()=>{})})])await assert.rejects(run({fetchImpl,timeoutMs:10}),gap)
})
test('Dassault exact caller abort reason propagates',async()=>{
  for(const stage of ['before','fetch','body']){const c=new AbortController(),reason={stage};if(stage==='before')c.abort(reason);await assert.rejects(run({signal:c.signal,fetchImpl:async url=>{if(stage==='fetch'){c.abort(reason);return new Promise(()=>{})}return{url,status:200,text:()=>{c.abort(reason);return new Promise(()=>{})}}}}),e=>e===reason)}
})
const fixtureDir=new URL('./fixtures/',import.meta.url)
const rows=readdirSync(fixtureDir).filter(f=>/^(official-careers|native-careers|native-listing-pages|native-job-details-\d+)\.json\.gz$/.test(f)).flatMap(f=>{const p=JSON.parse(gunzipSync(readFileSync(new URL(f,fixtureDir))));return Array.isArray(p)?p:[p]})
const replay=(mutate=r=>r)=>async url=>{
  // Redirect branch here is an injected HTTP contract test; original redirect
  // observations remain separate from the captured native response envelopes.
  if(url===HANDOFF_URL)return{url,status:301,headers:{get:key=>key==='location'?ENTRY_URL:null}}
  const found=rows.find(r=>r.url===url);assert.ok(found,'Unexpected native request '+url)
  const r=mutate({...found});return{url:r.finalUrl,status:r.status,text:async()=>r.body}
}
test('all 11 current pages and 103 role details reconcile without relabeling parent jobs as India jobs',async()=>{
  const jobs=await run({fetchImpl:replay()})
  assert.deepEqual(jobs,[])
  const e=readInventoryEvidence(jobs),n=jobs.nativeCollectionEvidence
  assert.equal(e.status,'discovery-only');assert.equal(e.reportedTotal,null);assert.equal(e.listingComplete,false)
  assert.equal(n.nativePublicJobCount,103);assert.equal(n.nativePagesFetched,11);assert.equal(n.exclusions.length,103)
  assert.equal(n.nativePrimaryIndiaJobCount,0);assert.equal(n.nativeIndiaJobCount,null)
  assert.equal(n.exactSubsidiaryScopeComplete,false)
  const prospective=n.exclusions.find(r=>r.id==='15678')
  assert.equal(prospective.countryScopeComplete,false);assert.match(prospective.nativeSecondaryCountryMentions[0],/expatriation en Inde/)
  assert.equal(n.exclusions.find(r=>r.id==='15839').postingDate,'2026-10-21')
  assert.equal(n.exclusions.find(r=>r.id==='15839').nativeListingPublicationDate,'2026-10-23')
})
test('missing page, stale total, changed detail country, hidden location and secondary India scope cannot certify a zero',async()=>{
  const first=rows.find(r=>r.url.includes('emploi-cdd-acheteur-systemes'))
  for(const mutate of [r=>r.url.includes('page=2&')?{...r,status:503}:r,
    r=>r.url.includes('liste-toutes-offres')?{...r,body:r.body.replaceAll('103 offre(s)','104 offre(s)')}:r,
    r=>r.url===first.url?{...r,body:r.body.replace('France, Nouvelle Aquitaine','India, Karnataka')}:r,
    r=>r.url===first.url?{...r,body:r.body.replace('>France, Nouvelle Aquitaine',' hidden>France, Nouvelle Aquitaine')}:r,
    r=>r.url===first.url?{...r,body:r.body.replace('Informations générales','Informations générales').replace('Dans le cadre','Poste en Inde. Dans le cadre')}:r]){
    await assert.rejects(run({fetchImpl:replay(mutate)}),gap)
  }
})
test('corporate hidden/template handoffs and redirect host drift fail closed',async()=>{
  const official=rows.find(r=>r.url.includes('/en/group/careers/'))
  for(const wrap of [s=>'<template>'+s+'</template>',s=>'<div hidden>'+s+'</div>',s=>'<!--'+s+'-->']){
    await assert.rejects(run({fetchImpl:replay(r=>r.url===official.url?{...r,body:r.body.replace(/<a\b[^>]*href="https:\/\/carriere\.dassault-aviation\.com\/accueil\.aspx\?LCID=1036"[^>]*>[\s\S]*?<\/a>/g,wrap)}:r)}),gap)
  }
  await assert.rejects(run({fetchImpl:async url=>url===HANDOFF_URL?{url,status:301,headers:{get:()=> 'https://example.com/jobs'}}:replay()(url)}),gap)
})
test('stream byte bounds and stalled-reader deadline cancel the reader',async()=>{
  for(const oversize of [true,false]){let cancelled=false;await assert.rejects(run({timeoutMs:15,fetchImpl:async url=>({url,status:200,body:{getReader:()=>({read:()=>oversize?Promise.resolve({value:new Uint8Array(3000001),done:false}):new Promise(()=>{}),cancel:async()=>{cancelled=true},releaseLock:()=>{}})}})}),gap);assert.equal(cancelled,true)}
})
test('original native captured envelopes retain exact gzip, raw and body hashes',()=>{
  const manifest=JSON.parse(readFileSync(new URL('capture-manifest.json',fixtureDir))),sha=v=>createHash('sha256').update(v).digest('hex')
  assert.equal(manifest.redirectReplay.rawResponseCaptured,false)
  for(const item of manifest.evidence){const gz=readFileSync(new URL(item.file,fixtureDir)),raw=gunzipSync(gz);assert.equal(sha(gz),item.sha256);assert.equal(sha(raw),item.uncompressedSha256);const p=JSON.parse(raw),rs=Array.isArray(p)?p:[p];for(const r of item.responses)assert.equal(sha(rs.find(x=>x.url===r.url).body),r.bodySHA256)}
})
