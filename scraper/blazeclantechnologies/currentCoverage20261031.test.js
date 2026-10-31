import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { run, CAREERS_URL, hasOfficialCareersSignal, isBrokenZohoBoardPage } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const input = JSON.parse(gunzipSync(readFileSync(new URL('./test-inputs/current-unavailable-20261031.json.gz', import.meta.url))))
const capturedTls = input.corporate.find(packet => packet.url === CAREERS_URL)
const tlsError = () => Object.assign(new TypeError(capturedTls.error), { cause: { code: capturedTls.code, message: capturedTls.cause } })

test('the current real TLS failure cannot establish a freshly verified first-party hiring surface', async () => {
  let calls = 0
  const jobs = await run({ now: () => '2026-10-31T07:19:33.000Z', fetchText: async url => { calls++; assert.equal(url, CAREERS_URL); throw tlsError() } })
  const evidence = readInventoryEvidence(jobs)
  assert.equal(calls, 1)
  assert.equal(jobs.length, 0)
  assert.equal(evidence.firstParty, false)
  assert.equal(evidence.listingComplete, false)
  assert.equal(evidence.reportedTotal, null)
  assert.equal(evidence.indiaFacetCount, null)
  assert.equal(evidence.verifiedAt, '2026-10-31T07:19:33.000Z')
})

test('Blazeclan cancellation before inspection makes no request', async () => {
  const controller = new AbortController(), reason = Error('stop Blazeclan')
  controller.abort(reason)
  let calls = 0
  await assert.rejects(run({ signal: controller.signal, fetchText: async () => { calls++; throw tlsError() } }), error => error === reason)
  assert.equal(calls, 0)
})

test('the supplied inspection clock reaches the unavailable-source evidence', async () => {
  const jobs = await run({ now: () => '2026-10-31T07:19:33.000Z', fetchText: async () => { throw tlsError() } })
  assert.equal(readInventoryEvidence(jobs).verifiedAt, '2026-10-31T07:19:33.000Z')
})

test('Blazeclan forwards the active caller signal and retains its reason on transport cancellation', async () => {
  const controller = new AbortController(), reason = Error('stop started Blazeclan')
  await assert.rejects(run({ signal: controller.signal, fetchText: async (url, options) => {
    assert.equal(options.signal, controller.signal)
    controller.abort(reason)
    throw new DOMException('aborted transport', 'AbortError')
  } }), error => error === reason)
})

test('the historical advertised Zoho tenant is still unavailable, without native identity carriers', () => {
  assert.equal(isBrokenZohoBoardPage(input.historicalBoard.body), true)
  assert.equal(/id="(?:meta|jobs)"/.test(input.historicalBoard.body), false)
  assert.equal(JSON.parse(input.publicWordPressPage.body)[0].content.rendered, '')
})

test('inert or hidden historical CTA text cannot establish an active first-party handoff', () => {
  const phrase = 'Join us to grow your career by doing what you love to do and treading the path where you want to go.'
  const anchor = '<a href="https://blazeclan.zohorecruit.in/jobs/Careers" class="cta-btn">Current Openings</a>'
  assert.equal(hasOfficialCareersSignal(phrase + '<!-- ' + anchor + ' -->'), false)
  assert.equal(hasOfficialCareersSignal(phrase + '<div hidden>' + anchor + '</div>'), false)
  assert.equal(hasOfficialCareersSignal(phrase + '<style>.cta-btn{display:none}</style>' + anchor), false)
})
