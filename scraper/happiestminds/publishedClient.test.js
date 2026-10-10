import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import {run,OFFICIAL_CAREERS_URL,ZWAYAM_BOARD_URL,COMPANY_CONFIG_URL,LISTING_API_URL,DETAIL_API_URL} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
const careers=await fs.readFile(new URL('../../scraper-support/tests/fixtures/happiestminds-current/current-careers.html',import.meta.url),'utf8')
const portal=await fs.readFile(new URL('./fixtures/current-published-portal.html',import.meta.url),'utf8')
const bundle=await fs.readFile(new URL('./fixtures/current-published-client-binding.js',import.meta.url),'utf8')
const listing=JSON.parse(await fs.readFile(new URL('./fixtures/current-zwayam-listing.json',import.meta.url),'utf8'))
const detail=JSON.parse(await fs.readFile(new URL('./fixtures/current-zwayam-detail.json',import.meta.url),'utf8'))
const row=listing.data.data[0]._source
const clientUrl='https://jobs.happiestminds.com/happiestminds/main.452213c4245cdb93.js'
const page={data:{data:[{_source:row}],totalCount:1,hasMoreData:false,facetedSearchConfig:{paginationHowMuch:'10'}}}
const denied=()=>Object.assign(new Error('HTTP 403 for company configuration'),{status:403})
const exercise=async({portalBody=portal,bundleBody=bundle,configError=denied(),configPayload,signal,override}={})=>run({now:()=> '2026-10-09T00:00:00Z',signal,
 fetchPage:async(url,options)=>{const response={status:200,url,html:url===OFFICIAL_CAREERS_URL?careers:url===ZWAYAM_BOARD_URL?portalBody:url===clientUrl?bundleBody:assert.fail('Unexpected authority '+url)};return await override?.(url,response,options)??response},
 fetchJson:async(url,options)=>{if(url===COMPANY_CONFIG_URL){if(configPayload)return configPayload;throw configError}if(url===LISTING_API_URL)return structuredClone(page);assert.equal(url,DETAIL_API_URL);assert.equal(options.json.companyId,'15974');return structuredClone(detail)},
})
test('fresh employer-published client identity recovers public India jobs when only company configuration access fails',async()=>{
 const jobs=await exercise()
 assert.equal(jobs.length,1);assert.equal(jobs[0].country,'India');assert.equal(jobs[0].jobId,String(row.jobCode));assert.ok(jobs[0].jobDescription.includes('Data Governance'))
 assert.equal(jobs[0].sourceListingComplete,false)
 const evidence=readInventoryEvidence(jobs);assert.equal(evidence.status,'coverage-gap');assert.equal(evidence.listingComplete,false);assert.equal(evidence.indiaFacetCount,null);assert.match(evidence.reason,/published.client.binding/);assert.match(evidence.reason,/Darwinbox/)
})

for(const[name,options]of[
 ['foreign published tenant',{bundleBody:bundle.replace('MTU5NzQ=','OTk5OTk=')}],
 ['foreign employer domain',{bundleBody:bundle.replace('DOMAIN:"jobs.happiestminds.com"','DOMAIN:"other.example"')}],
 ['foreign API authority',{bundleBody:bundle.replace('APIENDPOINT:"https://public.zwayam.com/"','APIENDPOINT:"https://other.example/"')}],
 ['duplicate tenant binding',{bundleBody:bundle+bundle}],
 ['commented tenant binding',{bundleBody:'/*'+bundle.split('\n')[0]+'*/\n'+bundle.split('\n')[1]}],
 ['unused published tenant',{bundleBody:bundle.replace('sessionStorage.setItem("COMPANYID",Zs.COMPANYID)','void 0')}],
 ['foreign client handoff',{portalBody:portal.replace('src="main.452213c4245cdb93.js"','src="https://other.example/main.452213c4245cdb93.js"')}],
 ['missing client handoff',{portalBody:portal.replace('main.452213c4245cdb93.js','app.452213c4245cdb93.js')}],
 ['missing employer portal identity',{portalBody:portal.replace('Careers at Happiest Minds','Careers at Other Employer')}],
])test(name+' cannot turn an inaccessible configuration into trusted India inventory',async()=>{await assert.rejects(exercise(options),/published.client.identity/i)})
test('native portal or client redirect cannot establish publisher identity',async()=>{
 for(const target of[ZWAYAM_BOARD_URL,clientUrl])await assert.rejects(exercise({override:(url,response)=>url===target?{...response,url:'https://other.example/'}:response}),/final.URL/)
})
test('authentication or retired-tenant errors are retained instead of using the client alternative',async()=>{
 for(const status of[401,404]){const error=Object.assign(new Error('HTTP '+status+' for configuration'),{status});let read=false;await assert.rejects(exercise({configError:error,override:(url,response)=>{if(url!==OFFICIAL_CAREERS_URL)read=true;return response}}),e=>e===error);assert.equal(read,false)}
})
test('an available configuration that contradicts employer identity remains fatal',async()=>{
 const configPayload=JSON.parse(await fs.readFile(new URL('./fixtures/current-zwayam-company.json',import.meta.url),'utf8'));configPayload.reponseObject.company.id=99999
 let read=false;await assert.rejects(exercise({configPayload,override:(url,response)=>{if(url!==OFFICIAL_CAREERS_URL)read=true;return response}}),/tenant.employer.identity/);assert.equal(read,false)
})
test('cancellation during the current published identity request stops traversal',async()=>{
 const c=new AbortController(),error=new Error('Cancel current publisher identity');await assert.rejects(exercise({signal:c.signal,override:(url,response,options)=>{if(url===ZWAYAM_BOARD_URL){assert.equal(options.signal,c.signal);c.abort(error)}return response}}),e=>e===error)
})

test('a tenant declaration inside template data cannot replace unavailable live employer configuration',async()=>{
 const bundleBody=bundle.replace(/;const Zs=\{[^}]+\};/,match=>'const staleData=\x60'+match+'\x60;')
 await assert.rejects(exercise({bundleBody}),/published.client.identity/i)
})
test('commented client consumers cannot establish an active employer tenant binding',async()=>{
 const bundleBody=bundle.replace(/sessionStorage\.setItem\("(?:COMPANYID|COMPANYURL|DOMAIN|APIENDPOINT|APIENDPOINTNEW)",Zs\.[A-Z]+\)/g,match=>'/*'+match+'*/')
 await assert.rejects(exercise({bundleBody}),/published.client.identity/i)
})
