import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import * as source from '../../scraper/dentalkart/script.js'
import {readInventoryEvidence} from '../utils/inventoryEvidence.js'

const capture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/dentalkart-public-20261103.json.gz',import.meta.url))))
const replay=async({page=value=>value,api=value=>value}={})=>{
 let apiCalls=0
 return source.run({fetchPage:async url=>{
  const row=capture.responses.find(row=>row.url===url);assert.ok(row)
  return page({status:row.status,url:row.finalUrl,html:row.body})
 },fetchJson:async url=>{
  assert.equal(url,source.CAREERS_API_URL);apiCalls++
  return api(JSON.parse(capture.responses.find(row=>row.url===url).body),apiCalls)
 }})
}

test('Dentalkart current public captures match their retained hashes',()=>{
 for(const row of capture.responses)assert.equal(createHash('sha256').update(row.body).digest('hex'),row.sha256)
})

test('Dentalkart changed store copy still binds 18 active India roles to the current legal employer',async()=>{
 const jobs=await replay();assert.equal(jobs.length,18)
 for(const job of jobs){assert.ok(job.jobDescription.length>1000);assert.equal(job.country,'India');assert.equal(job.source,'dentalkart')}
 const evidence=readInventoryEvidence(jobs);assert.equal(evidence.listingComplete,true);assert.equal(evidence.reportedTotal,31);assert.equal(evidence.indiaFacetCount,18)
 assert.match(evidence.reason,/complete-stable-public-zoho-inventory/)
})

test('Dentalkart inert or hidden handoffs cannot bind the public tenant',async()=>{
 for(const hide of[link=>`<template>${link}</template>`,link=>`<div hidden>${link}</div>`,link=>`<!--${link}-->`]){
  await assert.rejects(replay({page:row=>({...row,html:row.html.replace(/<a\b[^>]*href="https:\/\/dentalkart\.zohorecruit\.in\/jobs\/Careers"[^>]*>[\s\S]*?<\/a>/g,hide)})}),/verified/)
 }
})

test('Dentalkart a different portal legal employer remains a binding failure',async()=>{
 await assert.rejects(replay({page:row=>({...row,html:row.html.replaceAll('VASA Denticity Limited','Other Employer')})}),/Zoho portal identity/)
})

test('Dentalkart an initially denied native API never becomes a successful zero',async()=>{
 const error=Object.assign(Error('HTTP 403 public API denied'),{status:403})
 await assert.rejects(replay({api:()=>{throw error}}),value=>value===error)
})

test('Dentalkart a denied closing read retains positive proven roles with cleanup disabled',async()=>{
 const jobs=await replay({api:(value,call)=>{if(call===2)throw Object.assign(Error('HTTP 403 closing'),{status:403});return value}})
 assert.equal(jobs.length,18);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 for(const job of jobs)assert.equal(job.lifecycleCleanupAllowed,false)
})

test('Dentalkart changed closing role criteria cannot certify complete inventory',async()=>{
 const jobs=await replay({api:(value,call)=>{if(call===2)value.data.find(row=>row.Publish).Job_Description+=' Changed native requirements.';return value}})
 assert.equal(jobs.length,17);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 assert.match(readInventoryEvidence(jobs).reason,/closing-native-role-records-changed/)
})

test('Dentalkart a role explicitly unpublished at closing is withheld from partial results',async()=>{
 let closedId
 const jobs=await replay({api:(value,call)=>{
  if(call===2){const row=value.data.find(row=>row.Publish&&row.Country==='India');closedId=String(row.id);row.Publish=false}
  return value
 }})
 assert.ok(closedId);assert.equal(jobs.length,17);assert.equal(jobs.some(job=>job.jobId===closedId),false)
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
