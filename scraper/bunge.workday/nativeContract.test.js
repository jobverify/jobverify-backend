import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {run} from './script.js'
import {document} from '../../scraper-support/shared/rmkNativePairHtml.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const fixture=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/native-20261022.json.gz',import.meta.url))))
const firstID='1440517333',search='https://jobs.bunge.com/search/'
function mock(mutate=r=>r){const requests=[],index=new Map(),calls=new Map();for(const p of fixture.packets)index.set(p.url,[...(index.get(p.url)||[]),p]);return{requests,transport:async url=>{requests.push(url);const list=index.get(url);assert.ok(list,'Unexpected fixture request: '+url);const i=calls.get(url)||0;calls.set(url,i+1);const p=list[Math.min(i,list.length-1)];return mutate({...p,body:Buffer.from(p.rawBodyBase64,'base64')},requests)}}}
const text=(r,fn)=>({...r,body:Buffer.from(fn(r.body.toString('utf8')))})
const changeDescription=(r,fn)=>text(r,html=>{const d=document(html),n=d.nodes(n=>n.attrs.itemprop==='description')[0];assert.ok(n);return html.replace(d.inner(n),fn(d.inner(n)))})
const changeRanges=(r,fn)=>text(r,html=>{const d=document(html),labels=d.nodes(n=>d.hasClass(n,'paginationLabel'));assert.ok(labels.length>0);let changed=html;for(const n of labels)changed=changed.replace(d.outer(n),d.outer(n).replace(d.inner(n),fn(d.text(n))));assert.notEqual(changed,html);return changed})
test('Bunge selected executable replaces sentinel with140India roles from complete841native records and161details',async()=>{
 const m=mock(),jobs=await run({transport:m.transport});assert.equal(jobs.length,140)
 const n=jobs[0].nativeCollectionEvidence;assert.equal(n.observedListingCount,841);assert.equal(n.nativeReportedTotal,841);assert.equal(n.pagesFetched,9);assert.equal(n.candidateDetails,161);assert.equal(n.exclusions.length,21);assert.equal(n.failures.length,0);assert.equal(n.listingPaginationComplete,true);assert.equal(n.closingInventoryMatches,true);assert.equal(m.requests.length,172)
 assert.ok(m.requests.every(u=>new URL(u).origin==='https://jobs.bunge.com'&&!u.includes('/talentcommunity/')&&!u.includes('/apply')&&!u.includes('/login')))
 for(const j of jobs){assert.equal(j.source,'bunge');assert.equal(j.company,'Bunge');assert.equal(j.country,'India');assert.equal(j.jobId,j.nativePublicPostingID);assert.equal(j.sourceDescription,j.nativeDescriptionHTML);assert.equal(j.sourceListingComplete,false);assert.equal(j.lifecycleCleanupAllowed,false);assert.ok(j.nativeAddresses.some(a=>a.nativeCountryCode==='IN'));assert.equal(new URL(j.applyUrl).pathname,'/talentcommunity/apply/'+j.jobId+'/')}
 const first=jobs.find(j=>j.jobId===firstID);assert.equal(first.requisitionId,'48116');assert.equal(first.city,'Mohali');assert.equal(first.nativeAddresses[0].addressLocality,'Bhurai In');assert.equal(first.nativeLocalityAliasEquivalenceKnown,false)
 assert.equal(jobs.find(j=>j.jobId==='1262839101').requisitionId,'42217');assert.equal(jobs.find(j=>j.jobId==='1251492801').requisitionId,null);assert.equal(jobs.find(j=>j.jobId==='1118099401').requisitionId,null)
 assert.equal(jobs.filter(j=>j.requisitionId===null).length,2);assert.equal(readInventoryEvidence(jobs).reportedTotal,841);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 const unresolved=jobs.filter(j=>j.nativeRegionEvidenceConflict);assert.equal(unresolved.length,5);assert.ok(unresolved.every(j=>j.city===null&&j.state===null&&j.location==='India'&&j.country==='India'));assert.ok(unresolved.every(j=>j.nativeAddresses.every(a=>a.nativeCountryCode==='IN')&&j.nativeVisibleHeader.country==='India (IN)'))
})
test('a failed later page retains a validated positive subset with incomplete pagination',async()=>{
 const m=mock(r=>new URL(r.url).searchParams.get('startrow')==='100'?{...r,status:503,body:Buffer.from('Unavailable')}:r)
 const jobs=await run({transport:m.transport});assert.ok(jobs.length>0&&jobs.length<140);assert.equal(jobs[0].nativeCollectionEvidence.listingPaginationComplete,false);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
test('first-page failures and missing native ranges cannot establish no-openings evidence',async()=>{
 for(const kind of['HTTP','range','empty']){const m=mock(r=>r.url===search?(kind==='HTTP'?{...r,status:503,body:Buffer.from('Unavailable')}:kind==='empty'?text(r,()=>'<html>No jobs found</html>'):changeRanges(r,()=>'Results unavailable')):r)
 await assert.rejects(run({transport:m.transport}),e=>{assert.equal(e.nativeEvidence.verifiedZeroInventory,false);assert.equal(e.nativeEvidence.cleanupAllowed,false);return true},kind)}
})
test('missing descriptions,country conflicts,invalid dates and upstream role failures stay explicit partial results',async()=>{
 for(const kind of['description','country','date','future','HTTP','application','body-country']){const m=mock(r=>{
  if(!new URL(r.url).pathname.endsWith('/'+firstID+'/'))return r
  if(kind==='HTTP')return{...r,status:503,body:Buffer.from('Unavailable')}
  if(kind==='description')return changeDescription(r,()=> '')
  if(kind==='country')return text(r,h=>h.replace(/(itemprop=["']addressCountry["']\s+content=["'])IN/,'$1US'))
  if(kind==='application')return text(r,h=>h.replaceAll('/talentcommunity/apply/'+firstID+'/','/talentcommunity/apply/9999999/'))
  if(kind==='body-country')return changeDescription(r,h=>h.replaceAll('India (IN)','United States (US)'))
  return text(r,h=>{const d=document(h),p=d.nodes(n=>n.attrs.itemprop==='datePosted')[0];return h.replace(p.attrs.content,kind==='date'?'Thu Feb 31 02:01:00 UTC 2026':'2099-10-22T00:00:00.000Z')})
 });const jobs=await run({transport:m.transport});assert.equal(jobs.length,139,kind);assert.ok(!jobs.some(j=>j.jobId===firstID));assert.equal(jobs[0].nativeCollectionEvidence.failures.length,1);assert.equal(readInventoryEvidence(jobs).listingComplete,false)}
})
test('missing requisition labels remain null instead of copying the public posting ID',async()=>{
 const m=mock(r=>new URL(r.url).pathname.endsWith('/'+firstID+'/')?changeDescription(r,h=>h.replaceAll('Requisition Number','Legacy reference')):r)
 const jobs=await run({transport:m.transport});assert.equal(jobs.length,140);assert.equal(jobs.find(j=>j.jobId===firstID).requisitionId,null)
})
test('closing drift and a missing owned corporate backlink remain evidence gaps',async()=>{
 const m=mock((r,requests)=>r.url===search&&requests.filter(u=>u===search).length===2?changeRanges(r,label=>label.replace('of 841','of 842')):r)
 const jobs=await run({transport:m.transport});assert.equal(jobs.length,140);assert.equal(jobs[0].nativeCollectionEvidence.closingInventoryMatches,false)
 const bad=mock(r=>r.url==='https://jobs.bunge.com/'?text(r,h=>h.replaceAll('https://www.bunge.com/','https://foreign.example.test/')):r);await assert.rejects(run({transport:bad.transport}),/incomplete|forbidden/i)
})
