import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { run, CAREERS_URL, LEVER_BOARD_URL } from '../../scraper/verygoodsecurityindia/script.js'
const foreign=JSON.parse(readFileSync(new URL('./fixtures/verygoodsecurityindia/current-lever.json',import.meta.url),'utf8'))
const careers='<title>Careers | VGS</title><h1>It Takes Exceptional People to Build VGS</h1><h2>What We Look For In Every Teammate</h2><h2>Discover Opportunities</h2><a href="#lever-jobs-container">Open Roles</a><div id="lever-jobs-container"></div>'
const board=records=>'<title>VGS</title><meta property="og:url" content="https://jobs.lever.co/verygoodsecurity">Location type Location Team Work type Powered by Lever'+records.map(row=>'<a href="'+row.hostedUrl+'">'+row.text+'</a>').join('')
const runWith=(fetchJson,records=foreign)=>run({fetchText:async url=>url===CAREERS_URL?careers:url===LEVER_BOARD_URL?board(records):assert.fail('Unexpected source URL'),fetchJson})
const indiaRole=()=>({...foreign[0],id:'india-role',text:'Software Engineer',country:'IN',categories:{...foreign[0].categories,location:'Bengaluru, India',allLocations:['Bengaluru, India']},hostedUrl:'https://jobs.lever.co/verygoodsecurity/india-role',applyUrl:'https://jobs.lever.co/verygoodsecurity/india-role/apply'})
test('VGS validates the complete all-foreign Lever inventory',async()=>{
 const calls=[];assert.deepEqual(await runWith(async url=>{calls.push(url);return foreign}),[]);assert.equal(calls.length,1)
})
test('VGS extracts India roles with complete public descriptions and real application links',async()=>{
 const rows=[...foreign,indiaRole()];const jobs=await runWith(async()=>rows,rows)
 assert.equal(jobs.length,1);assert.equal(jobs[0].country,'India');assert.equal(jobs[0].location,'Bengaluru, India')
 assert.equal(jobs[0].applyUrl,indiaRole().applyUrl);assert.ok(jobs[0].jobDescription.length>500)
 assert.match(jobs[0].jobDescription,/How We Work/)
})
test('VGS keeps only India location evidence when it is a secondary posting location',async()=>{
 const row={...indiaRole(),country:'US',categories:{location:'United States',allLocations:['United States','Bengaluru, India']}}
 const jobs=await runWith(async()=>[row],[row]);assert.equal(jobs[0].location,'Bengaluru, India');assert.equal(jobs[0].city,'Bengaluru')
})
test('VGS fails closed on malformed, duplicate, mismatched-tenant or unknown-location records',async()=>{
 for(const data of [{error:'not jobs'},[foreign[0],foreign[0]],[{...foreign[0],hostedUrl:'https://jobs.lever.co/unrelated/123'}],[{...foreign[0],country:null,categories:{location:'Remote',allLocations:['Remote']}}]]) {
  await assert.rejects(runWith(async()=>data),/invalid|incomplete|identity|location|duplicate/i)
 }
})
test('VGS detects API truncation by comparing the independently rendered board inventory',async()=>{
 await assert.rejects(runWith(async()=>foreign.slice(1)),/incomplete|inventory/i)
})
test('VGS paginates full Lever pages and rejects repeated pages',async()=>{
 const first=Array.from({length:100},(_,i)=>({...foreign[0],id:'role-'+i,hostedUrl:'https://jobs.lever.co/verygoodsecurity/role-'+i,applyUrl:'https://jobs.lever.co/verygoodsecurity/role-'+i+'/apply'}));const calls=[]
 const jobs=await runWith(async url=>{calls.push(url);return calls.length===1?first:[indiaRole()]},[...first,indiaRole()])
 assert.equal(jobs.length,1);assert.equal(new URL(calls[1]).searchParams.get('skip'),'100')
 await assert.rejects(runWith(async()=>first,first),/duplicate|repeated|incomplete/i)
})
test('VGS cancellation stops before either public transport is invoked',async()=>{
 const reason=new Error('cancel VGS');await assert.rejects(run({signal:AbortSignal.abort(reason),fetchText:()=>assert.fail('aborted'),fetchJson:()=>assert.fail('aborted')}),error=>error===reason)
})

test('VGS rejects an explicitly supplied unrelated apply URL instead of masking it with hostedUrl',async()=>{
 const row={...indiaRole(),applyUrl:'https://jobs.lever.co/unrelated/india-role/apply'}
 await assert.rejects(runWith(async()=>[row],[row]),/invalid|application/i)
})
