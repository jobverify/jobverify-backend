import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {gunzipSync} from 'node:zlib'
import {createApexonScraper,hasOfficialExploreJobsSignal,EXPLORE_JOBS_URL} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'

// Original November2 HTML is historical evidence. Only the title mutations
// below are synthetic; repeated offline responses do not establish a new live
// opening/closing inventory or current vacancy count.
const captures=JSON.parse(gunzipSync(fs.readFileSync(new URL('./test-inputs/surface-20261102.json.gz',import.meta.url))))
for(const row of captures){
 const bytes=Buffer.from(row.html)
 assert.equal(bytes.length,row.bytes)
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256)
}
const original=url=>{
 const row=captures.findLast(row=>row.requestedUrl===url&&row.status===200)
 assert.ok(row,'Unrecorded historical request '+url)
 return row
}
const historicalListing=original(EXPLORE_JOBS_URL).html
const title=value=>historicalListing.replace(/<title>[^<]*<\/title>/,'<title>'+value+'</title>')
const usaTitle='Job Search, Job Opportunities &amp; Openings in USA - Apexon'
const usaListing=title(usaTitle)
const clock=()=>captures.map(row=>row.capturedAt).sort().at(-1)
const run=async transform=>{
 const calls=[]
 const jobs=await createApexonScraper().run({now:clock,fetchText:async(url,options)=>{
  assert.equal(options.includeResponseMetadata,true);calls.push(url)
  const row=original(url)
  return {status:row.status,url:row.finalUrl,html:url===EXPLORE_JOBS_URL?transform(row.html):row.html}
 }})
 return {jobs,calls}
}

test('current USA title permits unchanged historical India native criteria and paired listing checks',async()=>{
 assert.equal(hasOfficialExploreJobsSignal(usaListing),true)
 const {jobs,calls}=await run(()=>usaListing)
 assert.equal(jobs.length,18)
 assert.ok(jobs.every(row=>row.country==='India'&&row.jobDescription.length>500))
 assert.ok(jobs.every(row=>row.sourceScopeComplete===false&&row.lifecycleCleanupAllowed===false))
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 assert.equal(calls.filter(url=>url===EXPLORE_JOBS_URL).length,2)
})

test('the retained India title still qualifies the historical native listing',()=>{
 assert.equal(hasOfficialExploreJobsSignal(historicalListing),true)
})

test('USA title cannot qualify another employer or a page without native job routes',()=>{
 assert.equal(hasOfficialExploreJobsSignal(title(usaTitle.replace('Apexon','Other Employer'))),false)
 assert.equal(hasOfficialExploreJobsSignal(usaListing.replaceAll('career-job-detail/?','other-route/?')),false)
})

test('an inert matching title cannot qualify a different active page title',()=>{
 const html=title('Other Employer Jobs').replace('</head>','<template><title>'+usaTitle+'</title></template></head>')
 assert.equal(hasOfficialExploreJobsSignal(html),false)
})

test('an earlier conflicting head title owns identity even when hidden or inert',()=>{
 for(const attributes of ['',' hidden',' inert']){
  const html=historicalListing.replace('<title>','<title'+attributes+'>Other Employer Jobs</title><title>')
  assert.equal(hasOfficialExploreJobsSignal(html),false)
 }
})

test('a later SEO title cannot override the first India or USA document title',()=>{
 for(const html of [historicalListing,usaListing]){
  assert.equal(hasOfficialExploreJobsSignal(html.replace('</head>','<title>Other Employer Jobs</title></head>')),true)
 }
})

test('a body title cannot replace the main document head identity',()=>{
 const html=title('Other Employer Jobs').replace('</body>','<title>'+usaTitle+'</title></body>')
 assert.equal(hasOfficialExploreJobsSignal(html),false)
})

test('an earlier hidden or inert head cannot transfer identity to a later head',()=>{
 for(const attributes of [' hidden',' inert']){
  const html=usaListing.replace('<head>','<head'+attributes+'><title>Other Employer Jobs</title></head><head>')
  assert.equal(hasOfficialExploreJobsSignal(html),false)
 }
})

test('an earlier hidden or inert HTML root cannot transfer identity to a later document',()=>{
 for(const attributes of [' hidden',' inert']){
  const html='<html'+attributes+'><head><title>Other Employer Jobs</title></head><body></body></html>'+usaListing
  assert.equal(hasOfficialExploreJobsSignal(html),false)
 }
})

test('the USA page label cannot resolve an unknown native worksite country',async()=>{
 const {jobs}=await run(()=>usaListing.replaceAll('data-country="us"','data-country="unknown"'))
 assert.equal(jobs.length,18)
 assert.ok(jobs.every(row=>row.country==='India'&&row.nativeBoardListingComplete===false))
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
