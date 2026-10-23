import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import assert from 'node:assert/strict'
import test from 'node:test'
import { run } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { analyzePublishableJobs } from '../../scraper-support/utils/publishableJobMetrics.js'
const CORPORATE = 'https://group.accor.com/en', HOME = 'https://careers.accor.com/global/en/'
const INDIA = 'https://careers.accor.com/global/en/jobs?options=502&page=1'
const API = 'https://api.smartrecruiters.com/v1/companies/AccorHotel/postings'
const BOARD = API + '?country=in&limit=100&offset=0'
const now = () => '2026-10-23T09:00:00.000Z'
const fixture = () => JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/native-20261023.json.gz', import.meta.url))))
function mock({ synthetic = 0, old = false, mutate = p => p } = {}) {
  const pack = fixture(), calls = []
  const original = JSON.parse(Buffer.from(pack.requests.find(p => p.url === BOARD).rawBodyBase64, 'base64'))
  let rows = original.content.filter(j => ['744000157403242','744000157394119'].includes(j.id))
  if (old) rows[1].releasedDate = '2026-07-01T06:50:36.398Z'
  if (synthetic) rows = Array.from({ length: synthetic }, (_, i) => ({ ...rows[0],
    id: String(744000157403242 + i), ref: API + '/' + String(744000157403242 + i),
    ...(i ? { refNumber: 'REF' + (900000 + i) + 'A', uuid: '10000000-0000-4000-8000-' + String(i).padStart(12, '0'),
      jobAdId: '20000000-0000-4000-8000-' + String(i).padStart(12, '0') } : {}) }))
  return { calls, async transport(url, request) {
    calls.push({ url, method: request.method }); assert.equal(request.method, 'GET')
    let body
    if (url.startsWith(API + '?')) {
      const offset = Number(new URL(url).searchParams.get('offset')), data = structuredClone(original)
      data.content = rows.slice(offset, offset + 100); data.totalFound = rows.length; data.offset = offset
      body = Buffer.from(JSON.stringify(data))
    } else {
      const stored = pack.requests.find(p => p.url === url)
        || synthetic && url.startsWith(API + '/') && pack.requests.find(p => p.url === API + '/744000157403242')
      assert.ok(stored, url)
      body = Buffer.from(stored.rawBodyBase64, 'base64')
      if (url.startsWith(API + '/')) {
        const data = JSON.parse(body), row = rows.find(r => r.id === url.split('/').at(-1)); assert.ok(row)
        if (synthetic) Object.assign(data, { id: row.id, uuid: row.uuid, jobAdId: row.jobAdId, refNumber: row.refNumber,
          postingUrl: 'https://jobs.smartrecruiters.com/AccorHotel/' + row.id + '-commis',
          applyUrl: 'https://jobs.smartrecruiters.com/AccorHotel/' + row.id + '-commis?oga=true' })
        data.releasedDate = row.releasedDate
        body = Buffer.from(JSON.stringify(data))
      }
    }
    return mutate({ url, status: 200, headers: { 'content-type': url.startsWith(API) ? 'application/json' : 'text/html' }, body, bodyComplete: true }, calls)
  } }
}
const editJSON = (packet, action) => { const data = JSON.parse(packet.body); action(data); return { ...packet, body: Buffer.from(JSON.stringify(data)) } }
test('Accor sentinel becomes native India postings with complete employer sections and original native dates', async () => {
  const m = mock(), jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 2)
  const job = jobs.find(j => j.jobId === '744000157403242')
  assert.equal(job.company, 'Accor'); assert.equal(job.country, 'India'); assert.equal(job.city, 'Kolkata')
  assert.equal(job.requisitionId, 'REF123818E')
  assert.equal(job.nativeJobAdID, '0aa7e08f-747b-4956-a87c-24eb113ac4a5')
  assert.equal(job.postingDate, '2026-10-23T07:43:46.580Z')
  assert.equal(job.sourceDescription, Object.values(job.nativeFacts.nativeAPIRecord.jobAd.sections).map(s => s.text).filter(Boolean).join('\n\n'))
  assert.equal(job.sourceUrl, 'https://jobs.smartrecruiters.com/AccorHotel/744000157403242-commis')
  assert.equal(job.applyUrl, job.sourceUrl + '?oga=true')
  assert.equal(job.applicationVisited, false); assert.equal(job.lifecycleCleanupAllowed, false)
  assert.equal(job.nativeCollectionEvidence.failures.length, 0)
  assert.equal(job.nativeCollectionEvidence.closingInventoryMatches, true)
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 2)
  assert.equal(analyzePublishableJobs(jobs, { now: new Date(now()) }).eligibleJobs.length, 2)
  assert.ok(m.calls.every(p => !p.url.startsWith('https://jobs.smartrecruiters.com')))
})

test('201 synthetic roles traverse three API pages and retain all HTTP evidence only once', async () => {
  const m = mock({ synthetic: 201 }), jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 201); assert.equal(new Set(jobs.map(j => j.jobId)).size, 201)
  assert.equal(jobs[0].nativeCollectionEvidence.pagesFetched, 3)
  assert.equal(jobs[0].nativeCollectionEvidence.retainedResponses.length, 209)
  assert.equal(Object.hasOwn(jobs[1].nativeCollectionEvidence, 'retainedResponses'), false)
  assert.equal(jobs[1].nativeCollectionEvidence.retainedResponseCount, 209)
  assert.equal(jobs[1].nativeCollectionEvidence.fullBatchEvidenceOnFirstExtractedJob, true)
  assert.equal(jobs[1].nativeCollectionEvidence.firstExtractedJobID, jobs[0].jobId)
})

test('native release dates retain old postings without refreshing them from the observation clock', async () => {
  const jobs = await run({ transport: mock({ old: true }).transport, now })
  assert.equal(jobs.find(j => j.jobId === '744000157394119').postingDate, '2026-07-01T06:50:36.398Z')
  const analysis = analyzePublishableJobs(jobs, { now: new Date(now()) })
  assert.equal(analysis.eligibleJobs.length, 1); assert.equal(analysis.filterCounts.old, 1)
})

test('native inactive postings remain explicit exclusions even when role content is no longer returned', async () => {
  const m = mock({ mutate: p => p.url !== API + '/744000157394119' ? p : editJSON(p, j => { j.active = false; j.jobAd = null }) })
  const jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 1); assert.equal(jobs[0].nativeCollectionEvidence.failures.length, 0)
  assert.equal(jobs[0].nativeCollectionEvidence.exclusions[0].exclusionReason, 'native-posting-inactive')
})

test('missing content, identity/country/date conflicts and upstream errors preserve valid details and unknown evidence', async () => {
  for (const kind of ['content','id','ad-id','company','country','city','date','posting','private','HTTP']) {
    const m = mock({ mutate: p => p.url !== API + '/744000157394119' ? p : kind === 'HTTP' ? { ...p, status: 503 }
      : editJSON(p, j => {
        if (kind === 'content') j.jobAd.sections.jobDescription.text = ''
        if (kind === 'id') j.id = '744000000000000'
        if (kind === 'ad-id') j.jobAdId = '00000000-0000-4000-8000-000000000000'
        if (kind === 'company') j.company.identifier = 'OtherCompany'
        if (kind === 'country') j.location.country = 'us'
        if (kind === 'city') j.location.city = 'Mumbai'
        if (kind === 'date') j.releasedDate = '2099-01-01T00:00:00.000Z'
        if (kind === 'posting') j.postingUrl = j.postingUrl.replace('AccorHotel', 'OtherCompany')
        if (kind === 'private') j.visibility = 'PRIVATE'
      }) }), jobs = await run({ transport: m.transport, now })
    assert.equal(jobs.length, 1, kind)
    assert.equal(jobs[0].nativeCollectionEvidence.failures.length, 1, kind)
    assert.equal(jobs[0].nativeCollectionEvidence.unknownRawFailures.length, 1, kind)
  }
})

test('partial native pagination retains first-page jobs and never authorizes cleanup', async () => {
  const m = mock({ synthetic: 201, mutate: p => p.url === API + '?country=in&limit=100&offset=100' ? { ...p, status: 503 } : p })
  const jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 100)
  assert.equal(jobs[0].nativeCollectionEvidence.listingPaginationComplete, false)
  assert.ok(jobs[0].nativeCollectionEvidence.failures.length > 0)
})

test('failed official links cannot establish a verified zero', async () => {
  for (const target of [CORPORATE, HOME, INDIA, BOARD]) {
    const m = mock({ mutate: p => p.url === target ? { ...p, status: 503 } : p })
    await assert.rejects(run({ transport: m.transport, now }), error => {
      assert.equal(error.nativeEvidence.verifiedZeroInventory, false)
      assert.equal(error.nativeEvidence.cleanupAllowed, false)
      return true
    })
  }
})

test('an explicit scoped zero retains its count and never authorizes cleanup', async () => {
  const m = mock({ mutate: p => p.url !== BOARD ? p : editJSON(p, d => { d.totalFound = 0; d.content = [] }) })
  const jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 0); assert.equal(readInventoryEvidence(jobs).reportedTotal, 0)
  assert.equal(readInventoryEvidence(jobs).status, 'coverage-gap')
  assert.equal(jobs[Symbol.for('jobverify.native-html-evidence')].verifiedZeroInventory, false)
})

test('public API configuration rejects other tenants, altered country scopes, account actions and unlisted details', async () => {
  const { createSourceConfig } = await import('./parser.js'), config = createSourceConfig({ now })
  for (const url of [API.replace('AccorHotel','OtherCompany') + '?country=in&limit=100&offset=0',
    API + '?country=us&limit=100&offset=0', API + '?country=in&limit=100&offset=1', API + '/744000157403242',
    'https://jobs.smartrecruiters.com/AccorHotel/744000157403242-commis?oga=true', HOME + 'login',
  ]) assert.throws(() => config.validateURL(url))
})

test('default bounded transport uses anonymous GETs and stops new reads on access/rate denial', async () => {
  const m = mock(), jobs = await run({ now, fetchImpl: async (url, request) => {
    assert.equal(request.method, 'GET'); assert.equal(request.credentials, 'omit'); assert.equal(request.redirect, 'manual')
    assert.ok(!url.startsWith('https://jobs.smartrecruiters.com/'))
    const p = await m.transport(url, request)
    return { url, status: p.status, headers: new Headers(p.headers),
      body: new ReadableStream({ start(c) { c.enqueue(p.body); c.close() } }) }
  } })
  assert.equal(jobs.length, 2)
  for (const status of [401,403,429]) {
    const blocked = mock({ synthetic: 201, mutate: p => p.url.startsWith(API + '/') ? { ...p, status } : p })
    await assert.rejects(run({ transport: blocked.transport, now }), e => {
      assert.equal(e.nativeEvidence.verifiedZeroInventory, false); return true
    })
    assert.ok(blocked.calls.filter(c => c.url.startsWith(API + '/')).length <= 4)
  }
})
