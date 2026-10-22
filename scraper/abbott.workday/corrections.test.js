import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {run} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const load=name=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8'))
const ordinary=load('native-india-001.json'),authentic=load('optional-posting-001.json').roles
const asArray=value=>Array.isArray(value)?value:[value]
const html=role=>`<link rel="canonical" href="${role.detail.canonical}"><script>var phApp = phApp || ${JSON.stringify(role.detail.app)};phApp.ddo = ${JSON.stringify(role.detail.ddo)};</script>${role.detail.posting?`<script type="application/ld+json">${JSON.stringify(role.detail.posting)}</script>`:''}${role.detail.advertisedMainViews.map(view=>`<div as-element="ph-job-details-v1" original-view="${view}"></div>`).join('')}`
const replay=async(role,change=()=>{})=>{
 role=structuredClone(role);change(role.detail.posting,role)
 const r={refineSearch:{status:200,hits:1,totalHits:1,data:{jobs:[role.listing],aggregations:[{field:'country',value:{India:1}}],ui_selections:{country:['India']}}}}
 const search=`<script>var phApp = phApp || ${JSON.stringify(ordinary.searchApp)};phApp.ddo = ${JSON.stringify({siteConfig:ordinary.siteConfig,eagerLoadRefineSearch:r.refineSearch})};</script>`
 let networkCalls=0;const previous=globalThis.fetch;globalThis.fetch=()=>{networkCalls++;throw Error('Network prohibited')}
 try{const jobs=await run({fetchText:async url=>url.includes('search-results')?search:html(role),fetchJson:async()=>r});assert.equal(networkCalls,0);assert.equal(readInventoryEvidence(jobs).listingComplete,false);return jobs[0]}finally{globalThis.fetch=previous}
}
for(const role of authentic)test('authentic optional posting baseline '+role.id,async()=>{const j=await replay(role);assert.equal(j.sourceDetailComplete,true);assert.deepEqual(j.sourceNativeJobPosting,role.detail.posting);assert.equal(j.sourceEmployerEvidence.legalEmployerVerified,false)})
for(const [name,change]of [
 ['unrelated employer',p=>p.hiringOrganization.name='Unrelated Employer'],
 ['foreign country name',p=>p.jobLocation.address.addressCountry='United States'],
 ['foreign country code',p=>p.jobLocation.address.addressCountry='US'],
 ['foreign Country name object',p=>p.jobLocation.address.addressCountry={'@type':'Country',name:'United States'}],
 ['foreign location after a valid array entry',p=>{const original=structuredClone(p.jobLocation);p.jobLocation=[original,{...structuredClone(original),address:{...original.address,addressCountry:'US'}}]}],
 ['foreign address after a valid array entry',p=>{p.jobLocation.address=[p.jobLocation.address,{...p.jobLocation.address,addressCountry:'US'}]}],
 ['foreign country after a valid country array entry',p=>p.jobLocation.address.addressCountry=['India','US']],
])test('optional posting rejects '+name,async()=>{const j=await replay(authentic[0],change);assert.equal(j.sourceDetailComplete,false);assert.equal(j.sourceDetailFailureKind,'identity-mismatch');assert.equal(j.jobDescription,null);assert.equal(j.sourceNativeDetail.companyName,'Abbott Laboratories');assert.ok(j.sourceNativeJobPosting)})
for(const country of ['India','INDIA','IN',{'@type':'Country',name:'India'},{'@type':'Country',name:'IN'},['India','IN']])test('supported explicit India representation '+JSON.stringify(country),async()=>{const j=await replay(authentic[0],p=>p.jobLocation.address.addressCountry=country);assert.equal(j.sourceDetailComplete,true)})
for(const field of ['hiringOrganization','jobLocation'])test('absent optional '+field+' remains supported',async()=>{const j=await replay(authentic[0],p=>delete p[field]);assert.equal(j.sourceDetailComplete,true)})
test('missing optional posting preserves authentic no-JSON-LD detail',async()=>{const role={id:ordinary.listing.jobId,listing:ordinary.listing,detail:{...ordinary.detail,advertisedMainViews:['job-nav-ABLAUS-en_us-page997-prod']}};assert.equal(role.detail.posting,null);const j=await replay(role);assert.equal(j.sourceDetailComplete,true);assert.equal(j.sourceNativeJobPosting,null)})
test('every authentic location in country array is reconciled',async()=>{const role=authentic[1];assert.equal(Array.isArray(role.detail.posting.jobLocation),true);assert.equal(role.detail.posting.jobLocation.length,2);const j=await replay(role,p=>asArray(p.jobLocation)[1].address.addressCountry='United States');assert.equal(j.sourceDetailComplete,false);assert.equal(j.sourceDetailFailureKind,'identity-mismatch')})
