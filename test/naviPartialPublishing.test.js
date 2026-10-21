import fs from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import { buildPartialAttempt,recordPartialPublishingStatus } from '../scripts/partialPublishingGapEvidence.js'
import { isSuccessfulPublishingGapTrial } from '../scripts/publishPublishingGapRepairs.js'
const now=new Date('2026-10-20T23:20:00Z'),sha=b=>createHash('sha256').update(b).digest('hex')
const moduleURL=new URL('../scripts/naviPartialPublishingEvidence.js',import.meta.url)
const load=async()=>{assert.ok(fs.existsSync(moduleURL),'Navi exact partial proof implementation is required');return import(moduleURL)}
const fixture=()=>{const f=JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/naviPartial/reviewed-native-003.json.gz',import.meta.url)))),files=new Map(Object.entries(f.files).map(([key,value])=>[key,Buffer.from(value,'base64')]));return{source:'navi',httpEvidence:f.httpEvidence,files,readEvidence:async file=>files.get(file),now}}
async function makeTrial(f=fixture()){
 const {deriveNaviPartialEvidence}=await load(),p=await deriveNaviPartialEvidence(f)
 const trial={schemaVersion:1,source:'navi',mode:'native-http-partial-positive-trial',outcome:'positive-extraction-incomplete-evidence',productionWrites:false,
  attemptedAt:p.startedAt,completedAt:p.capturedAt,httpEvidence:f.httpEvidence,originalCapture:p.originalCapture,sourceNativeInventoryEvidence:p.sourceNativeInventoryEvidence,
  inventoryEvidence:p.inventoryEvidence,bindingEvidence:p.bindingEvidence,detailHealth:p.detailHealth,selectedDetailHealth:p.selectedDetailHealth,missingNativeDetails:p.missingNativeDetails,
  filterCounts:p.filterCounts,rawJobs:38,indiaJobs:38,globalTotal:38,observedSelectedIndia:36,jobs:p.jobs}
 return{trial,bytes:Buffer.from(JSON.stringify(trial)),readEvidence:f.readEvidence,now:f.now}
}
test('exact reviewed Navi proof accepts36 healthy roles while native38/missing2 and false publication flags stay distinct',async()=>{
 const{verifyNaviPartialPublishingTrial}=await load(),args=await makeTrial(),p=await verifyNaviPartialPublishingTrial(args)
 assert.equal(p.eligibleJobs,36);assert.equal(p.rawTotal,38);assert.equal(p.indiaTotal,38);assert.equal(p.detailHealth.complete,false);assert.equal(p.selectedDetailHealth.complete,true)
 assert.equal(p.sourceNativeInventoryEvidence.listingComplete,true);assert.equal(p.inventoryEvidence.listingComplete,false);assert.equal(p.missingNativeDetails.length,2)
 assert.ok(p.jobs.every(j=>j.sourceListingComplete===false&&j.sourceDetailComplete===true));assert.equal(p.filterCounts.emptyDescription,2)
 assert.equal(isSuccessfulPublishingGapTrial(args.trial,{source:'navi',now}),false)
 assert.equal(p.replayEvidence.runtimeResponsesUsed,43);assert.equal(p.replayEvidence.rawResponseBodiesVerified,42);assert.equal(p.replayEvidence.syntheticJobContent,false)
 const original=JSON.parse(await args.readEvidence('evidence/frozen-trials/navi.json'))
 assert.deepEqual(p.jobs,original.jobs.filter(j=>j.sourceDetailComplete).map(j=>({...j,sourceListingComplete:false})))
 const attempt=buildPartialAttempt(p,{inserted:36,updated:0,deleted:0,expired:0,missed:0},now),updates=[]
 await recordPartialPublishingStatus({collection:()=>({updateOne:async(q,u)=>{updates.push(u);return{matchedCount:1}}})},'navi',attempt)
 assert.equal(attempt.success,false);assert.equal(attempt.rawRecords,38);assert.equal(attempt.jobs,38);assert.equal(attempt.eligibleJobs,36);assert.equal(attempt.detailHealth.complete,false)
 assert.equal(Object.hasOwn(updates[0].$set,'lastCompleteCheckAt'),false)
})
test('Navi proof rejects selected content, geography, identities, date precision, false totals and health mutations',async()=>{
 const{verifyNaviPartialPublishingTrial}=await load(),base=await makeTrial()
 for(const change of [t=>{t.source='other'},t=>{t.jobs.pop()},t=>{t.jobs.push(structuredClone(t.jobs[0]))},t=>{t.maxJobs=20},t=>{t.truncated=true},
  t=>{t.jobs[0].sourceListingComplete=true},t=>{t.jobs[0].sourceDetailComplete=false},t=>{t.jobs[0].jobDescription='See attachment'},t=>{t.jobs[0].location='New York, United States, India'},
  t=>{t.jobs[0].country='US'},t=>{t.jobs[0].city='Paris'},t=>{t.jobs[0].jobId='fake'},t=>{t.jobs[0].applyUrl='https://example.com/fake'},t=>{t.jobs[0].sourceClosingDateIsExact=!t.jobs[0].sourceClosingDateIsExact},
  t=>{t.rawJobs=36},t=>{t.indiaJobs=36},t=>{t.globalTotal=null},t=>{t.inventoryEvidence.listingComplete=true},t=>{t.detailHealth.complete=true},t=>{t.detailHealth.missingDescriptions=0},
  t=>{t.sourceNativeInventoryEvidence.reportedTotal=36},t=>{t.missingNativeDetails=[]},t=>{t.filterCounts.emptyDescription=0},t=>{t.completedAt='2026-10-20T23:19:00Z'},t=>{t.productionWrites=true},
 ]){const trial=structuredClone(base.trial);change(trial);await assert.rejects(verifyNaviPartialPublishingTrial({...base,trial,bytes:Buffer.from(JSON.stringify(trial))}),change.toString())}
})
test('Navi evidence rejects missing, duplicate, unreviewed, stale, changed current code and native HTTP receipts',async()=>{
 const{deriveNaviPartialEvidence}=await load()
 for(const change of [f=>{f.httpEvidence.receipts.pop()},f=>{f.httpEvidence.receipts.push({...f.httpEvidence.receipts[0]})},f=>{f.now=new Date('2026-10-23T23:20:00Z')},
  ...['capture-manifest','catalog-trial','independent-review','reviewed-replay','official-http','current-code','native'].map(kind=>f=>{const r=f.httpEvidence.receipts.find(r=>r.kind===kind);f.files.set(r.file,Buffer.from('{}'))}),
  f=>{f.httpEvidence.receipts=f.httpEvidence.receipts.filter(r=>r.kind!=='attachment-body')},
 ]){const f=fixture();change(f);await assert.rejects(deriveNaviPartialEvidence(f))}
})
test('caller-updated hashes cannot replace omitted anonymous token body, original source content or capture-time code provenance',async()=>{
 const{deriveNaviPartialEvidence}=await load()
 for(const kind of ['token','native','reviewed-replay']){const f=fixture(),r=kind==='reviewed-replay'?f.httpEvidence.receipts.find(r=>r.kind===kind):f.httpEvidence.receipts.filter(r=>r.kind==='native').find(r=>r.originFile===(kind==='token'?'0003.json':'0004.json')),p=JSON.parse(f.files.get(r.file))
  if(kind==='token')p.body='{"access_token":"forged-offline-token-not-native-content"}'
  else if(kind==='native')p.status=202
  else p.captureTimeCodeHashes=p.currentReviewedReplayCodeHashes
  const bytes=Buffer.from(JSON.stringify(p));f.files.set(r.file,bytes);r.bytes=bytes.length;r.sha256=sha(bytes);await assert.rejects(deriveNaviPartialEvidence(f))
 }
})

test('Navi offline freezer preserves original timestamps and evidence bytes, refuses existing output and escaped paths',async()=>{
 const url=new URL('../scripts/freezeNaviPartialPublishingTrial.js',import.meta.url);assert.ok(fs.existsSync(url),'Navi immutable partial freezer is required')
 const {freezeNaviPartialTrial}=await import(url),parent=fs.mkdtempSync(path.join(os.tmpdir(),'navi-proof-')),outputDirectory=path.join(parent,'release')
 try{
  const f=fixture(),result=await freezeNaviPartialTrial({...f,outputDirectory}),trial=JSON.parse(fs.readFileSync(path.join(outputDirectory,'navi.json')))
  assert.equal(result.eligibleJobs,36);assert.equal(result.trialByteHash,sha(fs.readFileSync(path.join(outputDirectory,'navi.json'))))
  assert.equal(trial.attemptedAt,'2026-10-20T22:51:04.289Z');assert.equal(trial.completedAt,'2026-10-20T22:51:08.827Z')
  for(const[file,bytes]of f.files)assert.deepEqual(fs.readFileSync(path.join(outputDirectory,file)),bytes)
  await assert.rejects(freezeNaviPartialTrial({...f,outputDirectory}))
  const bad=fixture();bad.httpEvidence.receipts[0].file='../escape.json'
  const badOutput=path.join(parent,'bad');await assert.rejects(freezeNaviPartialTrial({...bad,outputDirectory:badOutput}));assert.equal(fs.existsSync(badOutput),false)
 }finally{
  assert.equal(path.dirname(parent),fs.realpathSync(os.tmpdir()));assert.ok(path.basename(parent).startsWith('navi-proof-'));fs.rmSync(parent,{recursive:true})
 }
})
