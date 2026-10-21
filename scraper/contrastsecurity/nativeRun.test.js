import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import test from 'node:test'
import assert from 'node:assert/strict'
import {run} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const fixture=()=>JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/current-native-20261021.json.gz',import.meta.url))))
async function replay(change,options={}){
 const original=globalThis.fetch,{packets}=fixture();let count=0
 globalThis.fetch=async(url,init={})=>{assert.equal(init.method??'GET','GET');const p=structuredClone(packets.find(p=>p.url===String(url)));assert.ok(p,'Only exact observed public URLs');change?.(p,++count);const r=new Response(p.body,{status:p.status});Object.defineProperty(r,'url',{value:p.finalURL});return r}
 try{return await run(options)}finally{globalThis.fetch=original}
}
test('actual current corporate and two native empty surfaces reconcile without certifying company zero',async()=>{const jobs=await replay();assert.equal(jobs.length,0);const e=readInventoryEvidence(jobs);assert.equal(e.status,'coverage-gap');assert.equal(e.firstParty,true);assert.equal(e.listingComplete,false);assert.equal(e.reportedTotal,null);assert.equal(e.indiaFacetCount,null)})
for(const [name,mutate]of[
 ['inert corporate',p=>{if(p.url==='https://www.contrastsecurity.com/')p.body='<div inert>'+p.body+'</div>'}],
 ['hidden career handoff',p=>{if(p.url.endsWith('/contrast-careers'))p.body='<div hidden>'+p.body+'</div>'}],
 ['wrong native employer',p=>{if(p.url.startsWith('https://jobs.ashbyhq.com/'))p.body=p.body.replaceAll('Contrast Security','Other Company')}],
 ['wrong native tenant',p=>{if(p.url.startsWith('https://jobs.ashbyhq.com/'))p.body=p.body.replaceAll('contrast-security','different-tenant')}],
 ['inert native preload',p=>{if(p.url.startsWith('https://jobs.ashbyhq.com/'))p.body='<template>'+p.body+'</template>'}],
 ['conditional native preload',p=>{if(p.url.startsWith('https://jobs.ashbyhq.com/'))p.body=p.body.replace('window.__appData =','if(false) window.__appData =')}],
 ['HTTP202',p=>{if(p.url.startsWith('https://api.'))p.status=202}],
 ['redirected tenant',p=>{if(p.url.startsWith('https://api.'))p.finalURL='https://api.ashbyhq.com/posting-api/job-board/wrong'}],
 ['error envelope',p=>{if(p.url.startsWith('https://api.'))p.body='{"apiVersion":"1","jobs":[],"meta":{"ERROR":"unavailable"}}'}],
 ['unknown API version',p=>{if(p.url.startsWith('https://api.'))p.body='{"apiVersion":"2","jobs":[]}'}],
 ['future native rows require qualification',p=>{if(p.url.startsWith('https://api.'))p.body='{"apiVersion":"1","jobs":[{"id":"future-native-role"}]}'}]
])test('rejects '+name,async()=>{await assert.rejects(()=>replay(mutate))})
test('final native empty inventory drift cannot inherit earlier zero',async()=>{await assert.rejects(()=>replay((p,n)=>{if(n===5)p.body='{"apiVersion":"1","jobs":[{"id":"new-role"}]}'}))})
test('caps, explicit zero timeout and cancellation fail rather than return empty',async()=>{await assert.rejects(()=>run({maxJobs:0}));await assert.rejects(()=>run({timeoutMs:0}));const c=new AbortController();await assert.rejects(()=>replay((p,n)=>{if(n===6)c.abort(Error('cancelled at final response'))},{signal:c.signal}),/cancelled/);await assert.rejects(()=>run({signal:AbortSignal.abort(Error('already cancelled'))}),/cancelled/)})
