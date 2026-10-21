import fs from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {runNativeCastrol} from './nativeRun.js'
import {CORPORATE,BOARD,API} from './nativeContract.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/native-20261021.json',import.meta.url)))
function options(mutate=()=>{}){const calls=[];return{now:'2026-10-21T02:00:00Z',timeoutMs:5000,calls,fetchImpl:async(url,init={})=>{calls.push(url);const body=url===CORPORATE?f.corporate:url===BOARD?f.board:url===API?JSON.stringify(f.payload):f.details[url.split('/').at(-1)];assert.ok(body,'Unexpected native request');const r={status:200,url,text:async()=>body};mutate(r,calls);return r}}}
test('shared GH mapping retains both primary and secondary India with native fields and incomplete global scope',async()=>{const jobs=await runNativeCastrol(options());assert.equal(jobs.length,2);assert.ok(jobs.every(j=>j.sourceDetailComplete&&j.sourceListingComplete===false));assert.equal(readInventoryEvidence(jobs).reportedTotal,3);assert.equal(readInventoryEvidence(jobs).indiaFacetCount,null);assert.equal(readInventoryEvidence(jobs).status,'coverage-gap');assert.match(jobs.find(j=>j.jobId==='4983338101').nativeLocation,/China.*India/);assert.equal(jobs.find(j=>j.jobId==='4983338101').city,'Mumbai')})
test('cap0 stays partial with unknown complete India total',async()=>{const jobs=await runNativeCastrol({...options(),maxJobs:0});assert.equal(jobs.length,0);assert.equal(readInventoryEvidence(jobs).listingComplete,false);assert.equal(readInventoryEvidence(jobs).reportedTotal,3)})
for(const status of [202,403,500])test('HTTP'+status+' is failure never zero',async()=>assert.rejects(runNativeCastrol(options(r=>r.status=status))))
test('final feed drift fails',async()=>assert.rejects(runNativeCastrol(options((r,c)=>{if(r.url===API&&c.filter(x=>x===API).length===2)r.text=async()=>JSON.stringify({...f.payload,jobs:f.payload.jobs.slice(1)})}))))
test('redirect and final cancellation fail',async()=>{await assert.rejects(runNativeCastrol(options(r=>r.url='https://other.example/')));const c=new AbortController();await assert.rejects(runNativeCastrol({...options((r,calls)=>{if(r.url===API&&calls.filter(x=>x===API).length===2)c.abort(new Error('caller abort'))}),signal:c.signal}),/abort/)})
test('explicit0 and hung transport deadlines settle',async()=>{await assert.rejects(runNativeCastrol({...options(),timeoutMs:0}));await assert.rejects(runNativeCastrol({...options(),timeoutMs:20,fetchImpl:()=>new Promise(()=>{})}),/deadline/)})
