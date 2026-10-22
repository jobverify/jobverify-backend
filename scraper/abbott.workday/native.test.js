import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {run} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const f=JSON.parse(fs.readFileSync(new URL('./fixtures/native-india-001.json',import.meta.url),'utf8'))
const html=(app,ddo,canonical,attrs='type="text/javascript"')=>`<html><head>${canonical?`<link rel="canonical" href="${canonical}">`:''}<script ${attrs}>var phApp = phApp || ${JSON.stringify(app)}; phApp.ddo = ${JSON.stringify(ddo)};</script></head><body><div as-element="ph-job-details-v1" original-view="job-nav-ABLAUS-en_us-page997-prod"></div></body></html>`
const inventory=()=>({refineSearch:{status:200,hits:1,totalHits:1,data:{jobs:[structuredClone(f.listing)],aggregations:[{field:'country',value:{India:1}}],ui_selections:{country:['India']}}}})
const search=()=>html(f.searchApp,{siteConfig:f.siteConfig,eagerLoadRefineSearch:inventory().refineSearch})
const detail=()=>html(f.detail.app,f.detail.ddo,f.detail.canonical)
const replay=async (options={})=>run({fetchText:async url=>url.includes('search-results')?search():detail(),fetchJson:async()=>inventory(),...options})
test('official India detail uses the complete employer description and preserves native evidence',async()=>{
 const jobs=await replay();assert.equal(jobs.length,1);const j=jobs[0]
 assert.equal(j.sourceDetailComplete,true);assert.match(j.jobDescription,/100% coverage of Doctors/)
 assert.equal(j.sourceNativeDetail.description,f.detail.ddo.jobDetail.data.job.description)
 assert.notEqual(j.jobDescription,j.sourceNativeDetail.ml_Description)
 assert.equal(j.sourceEmployerEvidence.legalEmployerVerified,false)
 assert.equal(j.sourceNativePublicationEvidence.originalPublicationVerified,false)
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
const withDetail=change=>async url=>{if(url.includes('search-results'))return search();const m=structuredClone(f.detail);change(m);return html(m.app,m.ddo,m.canonical)}
for(const [name,change]of [
 ['title mismatch',m=>m.ddo.jobDetail.data.job.title='Another role'],
 ['wrong native company',m=>m.ddo.jobDetail.data.job.companyName='Other Company'],
 ['country conflict',m=>m.ddo.jobDetail.data.job.ml_country='United States'],
 ['office country conflict',m=>m.ddo.jobDetail.data.job.multi_location[0].country='United States'],
 ['standardised office conflict',m=>m.ddo.jobDetail.data.job.standardised_multi_location[0].standardisedCountry='United States'],
 ['wrong application URL',m=>m.ddo.jobDetail.data.job.applyUrl=f.listing.applyUrl.replace('abbott.wd5','other.wd5')],
 ['missing authoritative content',m=>delete m.ddo.jobDetail.data.job.description],
 ['empty authoritative content',m=>m.ddo.jobDetail.data.job.description='<script>ignored content</script>'],
 ['explicit native closed status',m=>m.ddo.jobDetail.data.job.postingStatus='CLOSED'],
 ['explicit native skip',m=>m.ddo.jobDetail.data.job.skipJob=true],
 ['career site hidden',m=>m.ddo.jobDetail.data.job.displayCareerSite=false],
 ['native success false retains stale job',m=>m.ddo.jobDetail.success=false],
 ['native error string retains stale job',m=>m.ddo.jobDetail.error='upstream failure'],
 ['native errorMsg retains stale job',m=>m.ddo.jobDetail.errorMsg='upstream failure'],
 ['invalid publication',m=>m.ddo.jobDetail.data.job.postedDate='2026-02-30'],
 ['invalid closing date',m=>m.ddo.jobDetail.data.job.closingDate='not-a-date'],
 ['conflicting closing dates',m=>{m.ddo.jobDetail.data.job.closingDate='2026-12-01';m.ddo.jobDetail.data.job.validThrough='2026-12-02'}],
 ['wrong canonical ID',m=>m.canonical=m.canonical.replace('31165220','31165221')],
])test(name+' remains an explicit incomplete detail',async()=>{
 const jobs=await replay({fetchText:withDetail(change)});assert.equal(jobs.length,1);assert.equal(jobs[0].sourceDetailComplete,false);assert.equal(jobs[0].jobDescription,null);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
for(const [name,change]of [
 ['success false',r=>r.refineSearch.success=false],['outer success false',r=>r.success=false],['outer native error',r=>r.error='failure'],
 ['native error envelope',r=>r.refineSearch.error='failure'],['errorMsg',r=>r.refineSearch.errorMsg='failure'],['errorCode',r=>r.refineSearch.errorCode='502'],
 ['inconsistent hits',r=>r.refineSearch.hits=2],['missing total',r=>delete r.refineSearch.totalHits],
 ['wrong filter',r=>r.refineSearch.data.ui_selections={country:['United States']}],
 ['wrong listing country',r=>r.refineSearch.data.jobs[0].country='United States'],
 ['wrong listing identity',r=>r.refineSearch.data.jobs[0].reqId='2'],
 ['wrong listing application ID',r=>r.refineSearch.data.jobs[0].applyUrl=f.listing.applyUrl.replace('_31165220','_1')]
])test('listing '+name+' rejects retained rows',async()=>{
 await assert.rejects(replay({fetchJson:async()=>{const r=inventory();change(r);return r}}),/INCOMPLETE_SNAPSHOT/)
})
test('missing publication remains unknown without falling back to dateCreated',async()=>{
 const r=inventory();delete r.refineSearch.data.jobs[0].postedDate
 const jobs=await replay({fetchJson:async()=>r,fetchText:withDetail(m=>delete m.ddo.jobDetail.data.job.postedDate)})
 assert.equal(jobs[0].postingDate,null);assert.equal(jobs[0].sourceNativePublicationEvidence.reconciliation,'unknown')
})
test('native date-only closing keeps UTC day precision',async()=>{
 const jobs=await replay({fetchText:withDetail(m=>m.ddo.jobDetail.data.job.closingDate='2026-12-01')});assert.equal(jobs[0].sourceClosingDatePrecision,'utc-day');assert.equal(jobs[0].sourceClosingDateIsExact,false)
})
test('zero detail budget preserves incomplete jobs',async()=>{const jobs=await replay({detailEnrichmentBudgetMs:0});assert.equal(jobs[0].sourceDetailComplete,false);assert.equal(readInventoryEvidence(jobs).listingComplete,false)})
test('explicit native zero cannot authorize company-wide deletion',async()=>{
 const r=inventory();r.refineSearch.data.jobs=[];r.refineSearch.hits=0;r.refineSearch.totalHits=0;r.refineSearch.data.aggregations=[{field:'country',value:{India:0}}]
 const jobs=await replay({fetchJson:async()=>r});assert.equal(jobs.length,0);assert.equal(readInventoryEvidence(jobs).listingComplete,false);assert.equal(readInventoryEvidence(jobs).status,'discovery-only')
})
const {readNativePage}=await import('./native.js')
for(const attrs of ['language="VBScript"','language="javascript1.6"','type="text/plain" language="javascript"','type=" " language="javascript"','type="module"','type="text/javascript; charset=utf-8"'])test('inert bootstrap '+attrs,()=>{assert.equal(readNativePage(html(f.searchApp,{},null,attrs)).app,null)})
for(const attrs of ['', 'language="JavaScript"','type="" language="VBScript"','type=" TEXT/JAVASCRIPT " language="VBScript"','type="text/javascript1.5"'])test('active classic bootstrap '+attrs,()=>{assert.equal(readNativePage(html(f.searchApp,{},null,attrs)).app.refNum,'ABLAUS')})
for(const wrapper of [s=>`<!--${s}-->`,s=>`<template>${s}</template>`,s=>`<textarea>${s}</textarea>`])test('inert HTML cannot establish identity',()=>{assert.equal(readNativePage(wrapper(search())).app,null)})
for(const body of ['if(false){phApp.ddo = {};}','function never(){phApp.ddo = {};}','var dead = "phApp.ddo = {}";','phApp.ddo = {}; throw new Error("stopped");'])test('dead or unsupported JavaScript cannot establish model: '+body,()=>{try{assert.equal(readNativePage(`<script>${body}</script>`).ddo,null)}catch(e){assert.match(e.message,/INCOMPLETE_SNAPSHOT/)}})
test('initial native errorCode fails before an inventory call',async()=>{
 let calls=0;await assert.rejects(replay({fetchText:async()=>{const r=inventory().refineSearch;r.errorCode='502';return html(f.searchApp,{siteConfig:f.siteConfig,eagerLoadRefineSearch:r})},fetchJson:async()=>{calls++;return inventory()}}),/INCOMPLETE_SNAPSHOT/);assert.equal(calls,0)
})
test('advertised uppercase India alias is included and an inconsistent facet remains partial',async()=>{
 let body
 const aliasSearch=html(f.searchApp,{siteConfig:f.siteConfig,eagerLoadRefineSearch:{...inventory().refineSearch,data:{...inventory().refineSearch.data,aggregations:[{field:'country',value:{India:1,INDIA:1}}]}}})
 const jobs=await replay({fetchText:async url=>url.includes('search-results')?aliasSearch:detail(),fetchJson:async(url,r)=>{body=JSON.parse(r.body);const result=inventory();result.refineSearch.data.aggregations=[{field:'country',value:{India:1,INDIA:1}}];result.refineSearch.data.ui_selections={country:['India','INDIA']};return result}})
 assert.deepEqual(body.selected_fields,{country:['India','INDIA']});assert.equal(jobs.length,1);assert.equal(jobs[0].sourceDetailComplete,true);assert.equal(readInventoryEvidence(jobs).indiaFacetCount,2);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
test('outer native failure status rejects stale inventory',async()=>await assert.rejects(replay({fetchJson:async()=>({...inventory(),status:500})}),/INCOMPLETE_SNAPSHOT/))
test('closed lifecycle on listing cannot be rescued by stale open detail',async()=>{const r=inventory();r.refineSearch.data.jobs[0].postingStatus='CLOSED';const jobs=await replay({fetchJson:async()=>r});assert.equal(jobs[0].sourceDetailComplete,false)})
test('exact native offsets enumerate two pages without losing IDs',async()=>{
 const second=JSON.parse(JSON.stringify(f.listing).replaceAll('31165220','31165221')),offsets=[]
 const page=(from)=>{const r=inventory();r.refineSearch.totalHits=2;r.refineSearch.data.aggregations=[{field:'country',value:{India:2}}];r.refineSearch.data.jobs=[from===0?f.listing:second];return r}
 const jobs=await replay({fetchJson:async(url,r)=>{const from=JSON.parse(r.body).from;offsets.push(from);assert.ok([0,1].includes(from));return page(from)},fetchText:async url=>{if(url.includes('search-results'))return html(f.searchApp,{siteConfig:f.siteConfig,eagerLoadRefineSearch:page(0).refineSearch});return url.includes('31165221')?detail().replaceAll('31165220','31165221'):detail()}})
 assert.deepEqual(offsets,[0,1]);assert.deepEqual(jobs.map(j=>j.jobId),['31165220','31165221']);assert.ok(jobs.every(j=>j.sourceDetailComplete));assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
test('duplicate page before reported total fails closed',async()=>{
 const r=inventory();r.refineSearch.totalHits=2;r.refineSearch.data.aggregations=[{field:'country',value:{India:2}}]
 await assert.rejects(replay({fetchJson:async()=>r}),/duplicate page/)
})
test('listing row limits keep previous vacancies',async()=>{const jobs=await replay({maxPages:1});assert.equal(readInventoryEvidence(jobs).listingComplete,false)})

test('missing advertised main description view cannot promote a native field',async()=>{const jobs=await replay({fetchText:async url=>url.includes('search-results')?search():detail().replace('job-nav-ABLAUS-en_us-page997-prod','unrelated-view')});assert.equal(jobs[0].sourceDetailComplete,false);assert.equal(jobs[0].sourceNativeDetail.jobId,f.listing.jobId)})
for(const page of ['995-prod','22','998-prod','1223-prod','1236-prod','1231-prod','1233-prod'])test('proven main description template page'+page,async()=>{const jobs=await replay({fetchText:async url=>url.includes('search-results')?search():detail().replace('job-nav-ABLAUS-en_us-page997-prod','job-nav-ABLAUS-en_us-page'+page)});assert.equal(jobs[0].sourceDetailComplete,true)})
