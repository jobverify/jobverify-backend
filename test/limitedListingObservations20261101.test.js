import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {run as runPolicybazaar} from '../scraper/policybazaar/script.js'
import {run as runPurplle} from '../scraper/purplle/script.js'
import {buildScrapers} from '../scraper-support/providers/index.js'
import {buildScraperAttemptDiagnostics} from '../scraper-support/runner.js'
import {readSourceObservationEvidence} from '../scraper-support/utils/sourceObservationEvidence.js'
import {readInventoryEvidence} from '../scraper-support/utils/inventoryEvidence.js'
import {extractionRawJobMetrics} from '../scraper-support/utils/extractionRawJobMetrics.js'

const readPackets = relative => JSON.parse(gunzipSync(fs.readFileSync(new URL(relative,import.meta.url))))
const scenarios = [
  {source:'policybazaar',run:runPolicybazaar,clock:'2026-10-31T07:15:00.000Z',
    packets:readPackets('../scraper/policybazaar/test-data/2026-10-31-native-packets.json.gz')},
  {source:'purplle',run:runPurplle,clock:'2026-10-23T14:00:00.000Z',
    packets:['fresh-official-pages','fresh-linkedin-pages'].flatMap(name => readPackets('../scraper/purplle/fixtures/'+name+'.json.gz'))},
]
const transport = (packets,calls) => async url => {
  calls.push(url)
  const packet = packets.find(item => item.url === url)
  assert.ok(packet,'Uncaptured request: '+url)
  const response = new Response(packet.body,{status:packet.status})
  Object.defineProperty(response,'url',{value:packet.finalUrl})
  return response
}
const observation = source => ({source,recordKind:'vacancy-rows',observedRecordCount:60,observedVacancyCount:60,
  sourceScopeComplete:false,companyGlobalTotal:null,companyIndiaTotal:null})

for (const scenario of scenarios) {
  test(scenario.source+' keeps observed listing rows separate from fetched detail results',async t => {
    t.mock.method(globalThis,'fetch',async () => assert.fail('Native HTTP is forbidden'))
    const calls=[]
    const jobs=await scenario.run({fetchImpl:transport(scenario.packets,calls),now:()=>scenario.clock})
    assert.ok(jobs.length>0&&jobs.length<60)
    assert.equal(jobs.nativeCollectionEvidence.nativeRecordCount,60)
    assert.ok(jobs.nativeCollectionEvidence.retainedResponses.length>0)
    const originalEvidence=jobs.nativeCollectionEvidence
    assert.deepEqual(readSourceObservationEvidence(jobs,scenario.source),observation(scenario.source))
    assert.equal(jobs.nativeCollectionEvidence,originalEvidence)
    assert.equal(readInventoryEvidence(jobs).listingComplete,false)
    assert.equal(readInventoryEvidence(jobs).reportedTotal,null)
    assert.equal(readInventoryEvidence(jobs).indiaFacetCount,null)
  })

  test(scenario.source+' registration and attempt diagnostics retain all 60 observed cards without claiming company totals',async t => {
    t.mock.method(globalThis,'fetch',async () => assert.fail('Native HTTP is forbidden'))
    const scraper=buildScrapers().find(item=>item.name===scenario.source)
    assert.ok(scraper)
    const calls=[]
    const jobs=await scraper.run({fetchImpl:transport(scenario.packets,calls),now:()=>scenario.clock})
    assert.ok(jobs.length>0&&jobs.length<60)
    assert.deepEqual(readSourceObservationEvidence(jobs,scenario.source),observation(scenario.source))
    const inventory=readInventoryEvidence(jobs)
    assert.equal(inventory.listingComplete,false)
    assert.equal(inventory.reportedTotal,null)
    assert.equal(inventory.indiaFacetCount,null)
    assert.deepEqual(extractionRawJobMetrics(scraper.provider,jobs,inventory),{
      rawJobs:60,rawJobsBasis:'observed-native-vacancy-rows',
    })
    assert.deepEqual(buildScraperAttemptDiagnostics(jobs,undefined,scraper.provider).sourceObservations,observation(scenario.source))
    assert.equal(readSourceObservationEvidence(jobs,'unrelated-company'),null)
    assert.equal(jobs.nativeCollectionEvidence.retainedResponses,undefined)
  })
}
