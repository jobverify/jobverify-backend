import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'
import { runVerifiedWorkdayBoardUnion } from '../shared/workdayBoardUnion.js'

const sourceDir = fileURLToPath(new URL('../../scraper/cmegroup.workday/', import.meta.url))
const fixture = () => JSON.parse(gunzipSync(fs.readFileSync(new URL('../../scraper/cmegroup.workday/fixtures/native-20261021.json.gz', import.meta.url))))

async function runWithAddress(t, label, transform = () => {}) {
  const { packets, checkedAt } = fixture()
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    const packet = packets.find(p => p.url === String(url) && p.method === (init.method ?? 'GET')
      && p.requestBody === (init.body ?? null))
    assert.ok(packet, 'Only the captured native requests are allowed')
    let body = packet.body
    if (packet.url.includes('/job/')) {
      const payload = JSON.parse(body)
      payload.jobPostingInfo.location = label
      payload.jobPostingInfo.jobRequisitionLocation.descriptor = label
      transform(payload.jobPostingInfo)
      body = JSON.stringify(payload)
    }
    const response = new Response(body, { status: packet.status })
    Object.defineProperty(response, 'url', { value: packet.finalURL })
    return response
  })
  return runVerifiedWorkdayBoardUnion({
    source: 'cmegroup', company: 'CME Group', requireEmployer: true,
    employerPattern: /^(?:INTEC CME India Pvt Ltd|CME Chicago Mercantile Exchange Inc\.)$/,
    completeSourceScope: false,
    boards: [{ tenant: 'cmegroup', site: 'cme_careers', scraperDir: sourceDir,
      baseUrl: 'https://cmegroup.wd1.myworkdayjobs.com/cme_careers?locations=7a3301e6ea5710f69c0ee6a821946acb' }],
  }, { now: () => checkedAt, retryBaseDelayMs: 0,
    requestScheduler: { acquire: async () => () => {}, recordRateLimit() {}, minIntervalMs: 0 } })
}

test('foreign primary country retains an explicitly listed India additional location', async t => {
  const jobs = await runWithAddress(t, 'Remote-Philippines', info => {
    const country = { descriptor: 'Philippines', id: 'e56f1daf83e04bacae794ba5c5593560', alpha2Code: 'PH' }
    info.country = { descriptor: country.descriptor, id: country.id }
    info.jobRequisitionLocation.country = country
    info.additionalLocations = ['Bangalore']
  })
  assert.equal(jobs.length, 16)
  assert.ok(jobs.every(job => job.country === 'India'))
})

for (const label of [
  'No. 2, IT Park, Bangalore, India',
  'NO.2, IT Park, Bangalore, India',
  'No: 2, IT Park, Bangalore, India',
  'IT Park, Bangalore, India',
]) test('typed India address preserves building number: ' + label, async t => {
  const jobs = await runWithAddress(t, label)
  assert.equal(jobs.length, 16)
  assert.ok(jobs.every(job => job.locations.includes(label)))
  assert.ok(jobs.every(job => job.sourceListingComplete === false))
})

for (const label of [
  'NO - Oslo',
  'US - Chicago',
  'No. 2, IT Park, US',
  'No. 2, Singapore Office',
]) test('foreign evidence still rejects typed India address: ' + label, async t => {
  await assert.rejects(() => runWithAddress(t, label))
})
