import assert from 'node:assert/strict'
import test from 'node:test'
import {getScraperCatalog,createCatalogScraper} from '../../scraper-support/providers/index.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {extractJobDetail,extractListingJobs} from './script.js'

const corporate='<a href="/careers/">Careers</a>'
const careers='<a href="https://careers.brillio.com/job-listing/">Explore</a>'
const board=`<form id="job-filter-form"></form><script>
var ajaxurl="https://careers.brillio.com/wp-admin/admin-ajax.php";
function loadJobs(page=1){$.ajax({url:ajaxurl,type:"POST",data:{action:"filter_jobs",job_title:$("#job_title").val(),country:$("#country").val(),jobpost:$("#jobpost").val(),hybrid:$("#hybrid").is(":checked")?1:0,onsite:$("#onsite").is(":checked")?1:0,remote:$("#remote").is(":checked")?1:0,paged:page},success:function(response){$("#job-results").html(response.data.html);$(".ajax-pagination").html(response.data.pagination)}})}</script>`
const card=(id,location='Bangalore, India')=>`<div class="job-listing__item"><h4 class="title"><strong>Engineer - R${id}</strong></h4><p class="location">${location}</p><span class="info-pills">LTR</span><p class="description">Preview ...<a class="see-more" href="https://careers.brillio.com/job-details?job-id=${id}">See more</a></p><a class="btn btn-cta" href="https://careers.brillio.com/job-details?job-id=${id}">Apply</a></div>`
const detail=(id,extra='',location='Bangalore, India',apply=id)=>`<meta property="article:published_time" content="2022-03-22T04:29:21+00:00"><section class="job-detail"><div class="job-detail__item"><h1 class="title">Engineer - R${id}</h1><p class="location">${location}</p><span class="info-pills">LTR</span><div class="description-block"><div class="description"><h6>Primary Skills</h6><ul><li>SQL, Python</li></ul><h6>Job requirements</h6><ul><li>Build reliable pipelines and test all source to target transformations.</li></ul>${extra}</div></div>${apply?`<a href="https://careers.brillio.com/privacy-notice?job-id=${apply}" class="btn btn-cta">Apply</a>`:''}</div></section>`
const pagination=page=>`<ul class="page-numbers"><li><${page===1?'span aria-current="page"':'a href="/wp-admin/admin-ajax.php?paged=1"'}>1</${page===1?'span':'a'}></li><li><${page===2?'span aria-current="page"':'a href="/wp-admin/admin-ajax.php?paged=2"'}>2</${page===2?'span':'a'}></li></ul>`
const registered=()=>createCatalogScraper(getScraperCatalog().find(x=>x.source==='brillio'))
const fixture=(overrides={})=>{
 const requests=[]
 const fetch=async(url,init={})=>{
  requests.push({url:String(url),method:init.method||'GET',body:init.body})
  let body=String(url)==='https://www.brillio.com/'?corporate:String(url)==='https://www.brillio.com/careers/'?careers:String(url)==='https://careers.brillio.com/job-listing/'?board:null
  if(init.method==='POST') {const page=Number(new URLSearchParams(init.body).get('paged'));body=JSON.stringify({success:true,data:{html:page===1?card('1')+card('2','Dallas, United States'):card('3','Boston'),pagination:pagination(page)}})}
  const id=new URL(url).searchParams.get('job-id');if(id)body=detail(id,'',id==='3'?'Boston':'Bangalore, India')
  const override=overrides[String(url)];if(override!==undefined)body=typeof override==='function'?override(init):override
  assert.notEqual(body,null,'unexpected fixture request '+url)
  return new Response(body,{status:overrides.status||200})
 };return{fetch,requests}
}
test('current native cards preserve posting ID separately from requisition and infer no work mode from LTR',()=>{
 const rows=extractListingJobs(card('21232'))
 assert.equal(rows.length,1);assert.equal(rows[0].jobId,'21232');assert.equal(rows[0].requisitionId,'R21232')
 const d=extractJobDetail(detail('21232'),{jobId:'21232'})
 assert.match(d.jobDescription,/Build reliable pipelines/);assert.equal(d.postingDate,null);assert.equal(d.remoteStatus,null)
})
test('detail includes visible criteria outside description delimiters and excludes inert and zero opacity content once',()=>{
 const html=detail('1',`<template>Template bad criteria</template><div inert>Inert bad criteria</div><object>Object fallback bad criteria</object><iframe>Frame fallback bad criteria</iframe><noscript>Noscript bad criteria</noscript><script>Script bad criteria</script><style>.zero { opacity: 0e0 } .entity { opacity: &amp;#48; }</style><p class="zero">Stylesheet bad criteria</p><p style="opacity:00">Zero bad criteria</p><p style="opacity:+0">Plus bad criteria</p><p style="opacity:0e0">Exponent bad criteria</p><p style="opacity:&#48;">Entity bad criteria</p><p style="opacity:&amp;#48;">Uncertain visible criteria</p><p class="entity">Raw CSS visible criteria</p><p>Certification &amp;#65; is required</p>`).replace('</div></section>','<aside>Outside certification is mandatory.</aside></div></section>')
 const d=extractJobDetail(html,{jobId:'1'})
 assert.match(d.jobDescription,/Outside certification is mandatory/)
 assert.doesNotMatch(d.jobDescription,/bad criteria/)
 assert.match(d.jobDescription,/Certification &#65; is required/)
 assert.match(d.jobDescription,/Uncertain visible criteria/);assert.match(d.jobDescription,/Raw CSS visible criteria/)
 assert.equal(d.sourceDetailComplete,false)
})
test('missing or mismatched native application identity never constructs an apply URL',()=>{
 for(const apply of [null,'99']){const d=extractJobDetail(detail('1','',undefined,apply),{jobId:'1'});assert.equal(d.applyUrl,null);assert.equal(d.sourceDetailComplete,false)}
})
test('a heading embedded in the native description remains visible criteria and cannot replace the role title',()=>{
 const d=extractJobDetail(detail('1','<h1>Mandatory architecture certification</h1>'),{jobId:'1'})
 assert.equal(d.title,'Engineer - R1');assert.match(d.jobDescription,/Mandatory architecture certification/);assert.equal(d.sourceDetailComplete,true)
})
test('visible criteria beside the main role item are retained and prevent a truncated full claim',()=>{
 const d=extractJobDetail(detail('1').replace('</section>','<aside>Security clearance is mandatory.</aside></section>'),{jobId:'1'})
 assert.match(d.jobDescription,/Security clearance is mandatory/)
 assert.equal(d.sourceDetailComplete,false)
})
test('the role-owned apply control outside the item is navigation and does not become omitted criteria',()=>{
 const html=detail('1').replace('<a href="https://careers.brillio.com/privacy-notice?job-id=1" class="btn btn-cta">Apply</a></div>','</div><a href="https://careers.brillio.com/privacy-notice?job-id=1" class="btn btn-cta">Apply</a>')
 const d=extractJobDetail(html,{jobId:'1'});assert.equal(d.sourceDetailComplete,true);assert.doesNotMatch(d.jobDescription,/Apply/)
})
test('unresolved JobPosting criteria remain structured evidence and cannot be silently called full',()=>{
 const d=extractJobDetail(detail('1')+'<script type="application/ld+json">{"@type":"JobPosting","identifier":"99","qualifications":"Professional certification required"}</script>',{jobId:'1'})
 assert.equal(d.sourceDetailComplete,false);assert.equal(d.sourceNativeStructuredCriteria[0].qualifications,'Professional certification required')
})
test('registered path enumerates unfiltered pages and unknown country details before caps and retains partial evidence',async()=>{
 const f=fixture(),jobs=await registered().run({...f,maxJobs:1,now:'2026-10-27T05:00:00Z'})
 assert.equal(jobs.length,1);assert.equal(jobs[0].jobId,'1');assert.equal(jobs[0].country,'India');assert.equal(jobs[0].employmentType,null);assert.equal(jobs[0].remoteStatus,null)
 assert.equal(jobs[0].sourceDetailComplete,true);assert.equal(jobs[0].sourceListingComplete,false);assert.equal(jobs[0].lifecycleCleanupAllowed,false)
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 assert.ok(f.requests.some(r=>r.url.endsWith('job-id=3')));assert.ok(!f.requests.some(r=>r.url.endsWith('job-id=2')))
 assert.equal(f.requests.filter(r=>r.method==='POST').length,4)
 for(const r of f.requests.filter(r=>r.method==='POST')){const q=new URLSearchParams(r.body);assert.equal(q.get('country'),'');assert.equal(q.get('jobpost'),'all');assert.equal(q.get('remote'),'0')}
 assert.equal(jobs[0].sourceNativeInventory.globalCount,3);assert.equal(jobs[0].sourceNativeInventory.countryUnknownCount,1)
})
test('careers denial stops immediately without retry or subsequent discovery',async()=>{
 const f=fixture({status:403}),jobs=await registered().run(f)
 assert.equal(jobs.length,0);assert.equal(f.requests.length,1);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
test('detail failure keeps an explicitly partial preview with no fabricated application identity',async()=>{
 const f=fixture({'https://careers.brillio.com/job-details?job-id=1':()=>{throw Error('network failure')}}),jobs=await registered().run(f)
 assert.equal(jobs[0].sourceDetailComplete,false);assert.equal(jobs[0].applyUrl,null);assert.equal(jobs[0].sourceListingComplete,false)
 assert.equal(jobs[0].sourceDescriptionType,'listing-preview');assert.match(jobs[0].jobDescription,/Preview/)
})
