import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import test from 'node:test'
import {createCdotScraper} from './script.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {buildDescriptionSourceUpdate} from '../../src/services/jobDescriptionPolicy.js'

const {packets}=JSON.parse(gunzipSync(fs.readFileSync(new URL('./test-data/native-20261102.json.gz',import.meta.url))))
for(const packet of packets)assert.equal(createHash('sha256').update(Buffer.from(packet.bodyBase64,'base64')).digest('hex'),packet.sha256)
const html=Buffer.from(packets[0].bodyBase64,'base64').toString('utf8'),pdf=Buffer.from(packets[1].bodyBase64,'base64')

test('C-DOT returns the full native PDF role criteria and a reconciled current official table',async()=>{
  const calls=[]
  const jobs=await createCdotScraper().run({fetchText:async url=>{calls.push(url);assert.equal(url,packets[0].url);return html},
    fetchBinary:async url=>{calls.push(url);assert.equal(url,packets[1].url);return pdf}})
  assert.equal(jobs.length,1)
  const job=jobs[0]
  assert.match(job.jobDescription,/product development and sustenance/i)
  assert.match(job.jobDescription,/Minimum Percentage 70%/)
  assert.match(job.jobDescription,/Python\/Java\/C\+\+\/JavaScript/)
  assert.match(job.jobDescription,/continuous improvement of product architecture/i)
  assert.equal(job.sourceNativePDFSHA256,packets[1].sha256)
  assert.equal(job.sourceNativePDFPages,17)
  assert.equal(job.numberOfOpenings,5)
  assert.equal(job.city,'Delhi')
  assert.equal(job.country,'India')
  assert.equal(job.sourceDetailComplete,true)
  assert.doesNotThrow(()=>buildDescriptionSourceUpdate(job,null))
  assert.deepEqual(calls,[packets[0].url,packets[1].url,packets[0].url])
  const evidence=readInventoryEvidence(jobs)
  assert.equal(evidence.status,'complete-inventory')
  assert.equal(evidence.reportedTotal,1)
  assert.equal(evidence.listingComplete,true)
})

test('C-DOT rejects a changed closing official role identity',async()=>{
  let reads=0
  await assert.rejects(createCdotScraper().run({fetchText:async()=>++reads===1?html:html.replaceAll('adv_id=28','adv_id=999'),fetchBinary:async()=>pdf}),/C-DOT native/)
})

test('C-DOT never substitutes a placeholder when the advertised PDF is missing',async()=>{
  await assert.rejects(createCdotScraper().run({fetchText:async()=>html,fetchBinary:async()=>Buffer.from('not the native PDF')}),/C-DOT native|Published PDF/)
})

test('C-DOT preserves caller cancellation before any official request',async()=>{
  const reason=Error('Stop C-DOT source')
  await assert.rejects(createCdotScraper().run({signal:AbortSignal.abort(reason),fetchText:async()=>{assert.fail('No request after cancellation')}}),error=>error===reason)
})
