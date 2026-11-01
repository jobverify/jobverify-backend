import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {run,CAREERS_URL} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {readLiteralFlightRecords} from '../../scraper-support/utils/kulaFlight.js'
const packet=JSON.parse(gunzipSync(fs.readFileSync(new URL('./test-data/2026-10-31-native-packets.json.gz',import.meta.url))))[0]
const replay=html=>run({fetchText:async url=>{assert.equal(url,CAREERS_URL);return html??packet.body},now:()=> '2026-10-31T08:00:00Z'})
const changeFlight=edit=>{
 const records=readLiteralFlightRecords(packet.body);edit(records)
 const content=[...records].map(([id,r])=>r.kind==='text'?id+':T'+Buffer.byteLength(r.value).toString(16)+','+r.value:id+':'+(r.value===undefined?r.raw:JSON.stringify(r.value))+'\n').join('')
 return packet.body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,script=>script.includes('self.__next_f.push(')?'':script).replace('</body>','<script>self.__next_f.push('+JSON.stringify([1,content])+')</script></body>')
}
const allPositions=records=>{let found;const walk=v=>{if(!v||typeof v!=='object')return;if(v.categories)found=v.categories.find(c=>c.categoryName==='ALL POSITIONS');for(const x of Object.values(v))walk(x)};for(const r of records.values())if(r.kind==='model')walk(r.value);assert.ok(found);return found}
test('current Hidden Brains category duplicates do not invent requisitions and exact role descriptions are recovered',async()=>{
 const jobs=await replay()
 assert.equal(jobs.length,14);assert.equal(new Set(jobs.map(j=>j.jobId)).size,14)
 assert.ok(jobs.every(j=>j.jobDescription?.length>100&&j.sourceDetailComplete))
 assert.ok(jobs.every(j=>j.location===null&&j.country===null&&j.requisitionId===null))
 assert.ok(jobs.find(j=>j.title==='Business Development Executive').jobDescription.includes('Communication'))
 assert.ok(jobs.find(j=>j.title==='AI/ML Engineer').jobDescription.includes('machine learning'))
 assert.equal(jobs.nativeCollectionEvidence.nativeAllPositionsCount,15)
 assert.equal(jobs.nativeCollectionEvidence.displayCardOccurrences,60)
 assert.equal(jobs.nativeCollectionEvidence.desktopCardOccurrences,30)
 assert.equal(jobs.nativeCollectionEvidence.mobileCardOccurrences,30)
 assert.equal(readInventoryEvidence(jobs).status,'coverage-gap');assert.equal(readInventoryEvidence(jobs).reportedTotal,null)
 assert.equal(readInventoryEvidence(jobs).indiaFacetCount,null)
})
test('native organization office addresses cannot fill any role workplace',async()=>{
 const jobs=await replay(packet.body.replaceAll('"addressLocality":"Ahmedabad"','"addressLocality":"Different corporate office"'))
 assert.equal(jobs.length,14);assert.ok(jobs.every(j=>j.country===null&&j.location===null))
})
test('missing description reference fails closed instead of replacing employer content',async()=>{
 await assert.rejects(replay(changeFlight(records=>{allPositions(records).jobs[0].job_description='$deadbeef'})))
})
test('a native all-positions count conflict is not treated as complete scope',async()=>{
 await assert.rejects(replay(changeFlight(records=>{allPositions(records).count++})))
})
test('a changed native role identity cannot borrow another visible card description',async()=>{
 await assert.rejects(replay(changeFlight(records=>{allPositions(records).jobs[0].job_title='Different role'})))
})
test('hidden data carriers cannot supply a role description',async()=>{
 await assert.rejects(replay(packet.body.replaceAll('<script','<script hidden')))
})
test('hidden criteria consistently repeated across categories cannot masquerade as a complete native description',async()=>{
 await assert.rejects(replay(changeFlight(records=>{
  const reference=allPositions(records).jobs[0].job_description,original=records.get(reference.slice(1)).value
  for(const record of records.values())if(record.kind==='text'&&record.value===original)record.value+='<p hidden>Work location: Toronto, Canada.</p>'
 })),/hidden.*description|description.*hidden/i)
})
