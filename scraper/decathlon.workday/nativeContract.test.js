import fs from 'node:fs'
import { gunzipSync } from 'node:zlib'
import assert from 'node:assert/strict'
import test from 'node:test'
import { run } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { analyzePublishableJobs } from '../../scraper-support/utils/publishableJobMetrics.js'

const BASE = 'https://api.digitalrecruiters.com/public/v1/careers-site/job-ads'
const HOME = 'https://joinus.decathlon.in/en', CORPORATE = 'https://www.decathlon.in/'
const load = () => JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/native-20261023.json.gz', import.meta.url))))
const now = () => '2026-10-23T06:00:00.000Z'
function mock({ synthetic = 0, edgeID = null, mutate = packet => packet } = {}) {
  const fixture = load(), all = fixture.requests.filter(p => p.method === 'POST').flatMap(p => JSON.parse(Buffer.from(p.rawBodyBase64, 'base64')).items)
  const details = fixture.requests.filter(p => p.method === 'GET' && p.url.startsWith(BASE + '/'))
    .map(p => JSON.parse(Buffer.from(p.rawBodyBase64, 'base64')))
  if (edgeID) {
    const edge = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/native-edgecases-20261023.json.gz', import.meta.url))))
    details.push(...edge.requests.map(p => JSON.parse(Buffer.from(p.rawBodyBase64, 'base64'))))
    const short = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/native-short-content-20261023.json.gz', import.meta.url))))
    details.push(...short.requests.map(p => JSON.parse(Buffer.from(p.rawBodyBase64, 'base64'))))
  }
  let rows = [all.find(p => p.job_ad_id === 4642037), all[0], all.at(-1)]
  if (edgeID) rows = [all.find(p => p.job_ad_id === edgeID)]
  if (synthetic) rows = Array.from({ length: synthetic }, (_, i) => ({ ...rows[0],
    id: `${5000000 + i}-132510993`, job_ad_id: 5000000 + i,
    url: rows[0].url.replace('4642037', String(5000000 + i)),
  }))
  const calls = []
  return { calls, async transport(url, request) {
    calls.push({ url, method: request.method, body: request.body ?? null })
    let body, contentType = 'application/json'
    if (url === HOME || url === CORPORATE) {
      body = Buffer.from(fixture.requests.find(p => p.url === url).rawBodyBase64, 'base64')
      contentType = 'text/html'
    } else if (new URL(url).pathname.endsWith('/job-ads')) {
      assert.equal(request.method, 'POST')
      assert.equal(request.body, '{"filters":{}}')
      const page = Number(new URL(url).searchParams.get('page'))
      body = Buffer.from(JSON.stringify({ count: rows.length, items: rows.slice((page - 1) * 100, page * 100), filters: {}, viewport: null }))
    } else {
      assert.equal(request.method, 'GET')
      const id = Number(new URL(url).pathname.split('/').at(-1)), row = rows.find(p => p.job_ad_id === id)
      assert.ok(row, url)
      let detail = structuredClone(synthetic ? details.find(p => p.job_ad_id === 4642037) : details.find(p => p.job_ad_id === id))
      detail.id = row.id; detail.job_ad_id = id; detail.url = row.url
      detail.jsonld.identifier.value = row.id
      body = Buffer.from(JSON.stringify(detail))
    }
    return mutate({ url, status: 200, headers: { 'content-type': contentType }, body, bodyComplete: true }, calls)
  } }
}
const jsonMutation = (packet, action) => {
  const data = JSON.parse(packet.body)
  action(data)
  return { ...packet, body: Buffer.from(JSON.stringify(data)) }
}

test('Decathlon sentinel is replaced by full native API descriptions and explicit India locations', async () => {
  const m = mock(), jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 3)
  const job = jobs.find(j => j.jobId === '4642037-132510993')
  assert.equal(job.nativeJobAdID, '4642037')
  assert.equal(job.nativeAddressID, '132510993')
  assert.equal(job.country, 'India'); assert.equal(job.city, 'Bengaluru')
  assert.ok(job.sourceDescription.includes('About the Role'))
  assert.ok(job.sourceDescription.includes('What You’ll Do'))
  assert.ok(job.sourceDescription.includes('Portfolio Required'))
  assert.equal(job.nativeVisibleDescriptionHTML, null)
  assert.equal(job.nativeDescriptionOrigin, 'official public vacancy API: description and profile; rendered HTML not asserted')
  assert.equal(job.nativePublicationPrecision, 'day')
  assert.equal(job.nativeDatePosted, '2026-10-12')
  assert.equal(job.applyUrl, 'https://joinus.decathlon.in/en/annonce/4642037-digital-product-designer-562157-bengaluru')
  assert.equal(job.applicationLinkSource, 'public-role-page-fallback')
  assert.ok(jobs.every(j => j.source === 'decathlon' && !j.lifecycleCleanupAllowed && !j.applicationVisited))
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 3)
  assert.equal(jobs[0].nativeCollectionEvidence.listingPaginationComplete, true)
  assert.equal(jobs[0].nativeCollectionEvidence.closingInventoryMatches, true)
  assert.ok(m.calls.every(r => r.url === CORPORATE || r.url === HOME || r.url.startsWith(BASE)))
})

test('all 101 synthetic roles cross the native 100-row pagination boundary', async () => {
  const m = mock({ synthetic: 101 }), jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 101)
  assert.equal(new Set(jobs.map(j => j.jobId)).size, 101)
  assert.equal(jobs[0].nativeCollectionEvidence.pagesFetched, 2)
  assert.deepEqual(m.calls.filter(r => r.method === 'POST').map(r => new URL(r.url).searchParams.get('page')), ['1', '2', '1'])
})

test('republished_at does not replace the older native JobPosting date', async () => {
  const jobs = await run({ transport: mock().transport, now })
  const old = jobs.find(j => j.jobId === '4412645-42252169')
  assert.ok(old)
  assert.equal(old.postingDate, '2026-05-27')
  assert.equal(old.nativeRepublishedAt, '2026-10-23 05:02:02')
  const analysis = analyzePublishableJobs(jobs, { now: new Date(now()) })
  assert.equal(analysis.eligibleJobs.length, 1)
  assert.equal(analysis.filterCounts.old, 2)
})

test('description, identity, country, future dates and upstream errors retain other valid jobs', async () => {
  for (const kind of ['description', 'profile', 'country', 'organization', 'address', 'id', 'URL', 'future', 'schema-description', 'HTTP']) {
    const m = mock({ mutate: p => !p.url.startsWith(BASE + '/4642037?') ? p
      : kind === 'HTTP' ? { ...p, status: 503 } : jsonMutation(p, data => {
        if (kind === 'description') { data.description = ''; data.profile = ''; data.jsonld.description = '' }
        if (kind === 'profile') delete data.profile
        if (kind === 'country') data.address.country = 'France'
        if (kind === 'organization') data.jsonld.hiringOrganization.name = 'Other Employer'
        if (kind === 'address') data.address.id = 123
        if (kind === 'id') data.jsonld.identifier.value = '4642037-999'
        if (kind === 'URL') data.url = '9999-other-company'
        if (kind === 'future') data.jsonld.datePosted = '2099-01-01'
        if (kind === 'schema-description') data.jsonld.description += '<p>Conflicting description.</p>'
      }) })
    const jobs = await run({ transport: m.transport, now })
    assert.equal(jobs.length, 2, kind)
    assert.equal(jobs[0].nativeCollectionEvidence.failures.length, 1, kind)
    assert.equal(jobs[0].nativeCollectionEvidence.unknownRawFailures.length, 1, kind)
    assert.equal(jobs[0].lifecycleCleanupAllowed, false)
  }
})

test('verified public native publication variant, country-only address and single-field content survive extraction', async () => {
  for (const id of [4649087, 4603193, 4371291, 4283603]) {
    const m = mock({ edgeID: id }), jobs = await run({ transport: m.transport, now })
    assert.equal(jobs.length, 1, String(id))
    const job = jobs[0]
    assert.ok(job.sourceDescription.length >= 100)
    assert.equal(job.nativeCollectionEvidence.failures.length, 0)
    assert.equal(job.country, 'India')
    if (id === 4649087) assert.equal(job.nativeFacts.nativeAPIRecord.publish_type, 3)
    if (id === 4603193) { assert.equal(job.city, null); assert.equal(job.location, 'India') }
    if (id === 4371291) assert.equal(job.nativeFacts.nativeAPIRecord.profile, '')
    if (id === 4283603) assert.ok(job.nativeFacts.nativeAPIRecord.description.length < 120)
  }
})

test('official binding and listing failures cannot produce a verified empty inventory', async () => {
  for (const target of [CORPORATE, HOME, BASE]) {
    const m = mock({ mutate: p => p.url === target || target === BASE && new URL(p.url).pathname.endsWith('/job-ads')
      ? { ...p, status: 503 } : p })
    await assert.rejects(run({ transport: m.transport, now }), error => {
      assert.equal(error.nativeEvidence.verifiedZeroInventory, false)
      assert.equal(error.nativeEvidence.cleanupAllowed, false)
      return true
    })
  }
})

test('truncation, duplicate IDs and changed closing totals preserve partial inventory evidence', async () => {
  for (const kind of ['truncated', 'duplicate', 'closing']) {
    const m = mock({ mutate: (packet, calls) => !new URL(packet.url).pathname.endsWith('/job-ads') ? packet
      : jsonMutation(packet, p => {
        if (kind === 'truncated') p.items.pop()
        if (kind === 'duplicate') p.items[2] = p.items[1]
        if (kind === 'closing' && calls.filter(c => c.url === packet.url).length === 2) p.count++
      }) })
    if (kind === 'truncated') await assert.rejects(run({ transport: m.transport, now }))
    else {
      const jobs = await run({ transport: m.transport, now })
      assert.equal(jobs.length, kind === 'duplicate' ? 2 : 3)
      assert.equal(jobs[0].lifecycleCleanupAllowed, false)
      assert.ok(jobs[0].nativeCollectionEvidence.failures.length > 0)
    }
  }
})

test('explicit scoped zero retains evidence and never authorizes cleanup', async () => {
  const m = mock({ mutate: p => !new URL(p.url).pathname.endsWith('/job-ads') ? p
    : jsonMutation(p, data => { data.count = 0; data.items = [] }) })
  const jobs = await run({ transport: m.transport, now })
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 0)
  assert.equal(readInventoryEvidence(jobs).status, 'coverage-gap')
  assert.equal(jobs[Symbol.for('jobverify.native-html-evidence')].verifiedZeroInventory, false)
})

test('default bounded HTTP transport sends POST only for the read-only listing resource', async () => {
  const m = mock(), physical = []
  const jobs = await run({ now, fetchImpl: async (url, request) => {
    physical.push({ url, ...request })
    const packet = await m.transport(url, request)
    return { url, status: packet.status, headers: new Headers(packet.headers),
      body: new ReadableStream({ start(controller) { controller.enqueue(packet.body); controller.close() } }) }
  } })
  assert.equal(jobs.length, 3)
  assert.equal(physical.filter(request => request.method === 'POST').length, 2)
  assert.ok(physical.every(request => request.credentials === 'omit' && request.redirect === 'manual'))
  assert.ok(physical.filter(request => request.method === 'POST').every(request =>
    request.body === '{"filters":{}}' && request.headers['Content-Type'] === 'application/json'))
  const responses = jobs[0].nativeCollectionEvidence.retainedResponses
  assert.ok(responses.filter(p => new URL(p.url).pathname.endsWith('/job-ads')).every(p =>
    p.provenance.nativeReadRequest.method === 'POST' && p.provenance.nativeReadRequest.body === '{"filters":{}}'))
})

test('public API configuration rejects applications, account actions, other tenants and unlisted details', async () => {
  const { createSourceConfig } = await import('./parser.js'), config = createSourceConfig({ now })
  for (const url of [HOME + '/auth', 'https://joinus.decathlon.in/en/apply',
    BASE + '?domainName=other.example&limit=100&page=1&locale=en_GB',
    BASE + '?domainName=joinus.decathlon.in&limit=100&page=1&locale=en_GB&hash=secret',
    BASE + '/4642037?domainName=joinus.decathlon.in&locale=en_GB&addressId=132510993&external=0&withJsonld=1&preview=0',
    BASE.replace('/job-ads', '/confirm-email-subscription'),
  ]) assert.throws(() => config.readRequest(url))
})

test('complete short employer descriptions retain native text and remain subject to the unchanged age rule', async () => {
  for (const id of [4075589, 3900321]) {
    const jobs = await run({ transport: mock({ edgeID: id }).transport, now })
    assert.equal(jobs.length, 1)
    const job = jobs[0]
    assert.equal(job.nativeFacts.nativeAPIRecord.profile, '')
    assert.equal(job.sourceDescription, job.nativeFacts.nativeAPIRecord.description + '\n')
    assert.equal(job.nativeCollectionEvidence.failures.length, 0)
    const analysis = analyzePublishableJobs(jobs, { now: new Date(now()) })
    assert.equal(analysis.eligibleJobs.length, 0)
    assert.equal(analysis.filterCounts.old, 1)
  }
})
