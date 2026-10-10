import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import * as source from './script.js'
const careerHtml = await fs.readFile(new URL('../../scraper-support/tests/fixtures/happiestminds-current/current-careers.html', import.meta.url), 'utf8')
const listing = JSON.parse(await fs.readFile(new URL('./fixtures/current-zwayam-listing.json', import.meta.url)))
const nativeDetail = JSON.parse(await fs.readFile(new URL('./fixtures/current-zwayam-detail.json', import.meta.url)))
const company = JSON.parse(await fs.readFile(new URL('./fixtures/current-zwayam-company.json', import.meta.url)))
const raw = listing.data.data[0]._source
const clone = value => structuredClone(value)
const page = (rows, total = rows.length, size = 10, offset = 0) => ({ data: { data: rows.map(_source => ({ _source })), totalCount: total, hasMoreData: offset + rows.length < total, facetedSearchConfig: { paginationHowMuch: String(size) } } })
const authority = async url => ({ status: 200, url, html: careerHtml })
const listingApi = 'https://public.zwayam.com/jobs/search'
const companyApi = 'https://public.zwayam.com/data-service/v2/company/15974/careersite-configurations'
test('default Happiest adapter follows the currently published employer-bound Zwayam board and retains partial coverage', async () => {
 const original = globalThis.fetch
 const requests = []
 globalThis.fetch = async (url, options = {}) => {
  requests.push({ url, options })
  if (url === companyApi) return new Response(JSON.stringify(company))
  if (url === listingApi) {
   assert.equal(options.method, 'POST')
   assert.equal(options.body.get('companyId'), 'MTU5NzQ=')
   assert.equal(options.body.get('domain'), 'jobs.happiestminds.com')
   return new Response(JSON.stringify(page([raw])))
  }
  assert.equal(url, 'https://public.zwayam.com/jobs-service/v1/jobs/careersite')
  assert.equal(JSON.parse(options.body).companyId, '15974')
  assert.equal(JSON.parse(options.body).jobId, raw.id)
  return new Response(JSON.stringify(nativeDetail))
 }
 try {
  const jobs = await source.run({ fetchPage: authority })
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Happiest Minds')
  assert.equal(jobs[0].country, 'India')
  assert.equal(new URL(jobs[0].applyUrl).searchParams.get('id'), String(raw.id))
  assert.equal(jobs[0].jobId, String(raw.jobCode))
  assert.ok(jobs[0].jobDescription.includes('Data Governance'))
  assert.equal(jobs[0].sourceListingComplete, false)
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.status, 'coverage-gap')
  assert.equal(evidence.listingComplete, false)
  assert.equal(evidence.indiaFacetCount, null)
  assert.match(evidence.reason, /Darwinbox/)
  assert.equal(requests.length, 4)
 } finally { globalThis.fetch = original }
})

const record = (index = 0) => ({ ...clone(raw), id: raw.id + index, jobCode: raw.jobCode + index, newJobCode: String(raw.jobCode + index), jobUrl: raw.jobUrl + '-' + index, jobTitle: raw.jobTitle + ' ' + index, location: 'Bengaluru, Karnataka, India', locAgg: 'Bengaluru, Karnataka, India', mediumDescriptionWithoutHtml: 'Publisher full description. ' + 'Responsibilities and requirements. '.repeat(10), metaDescription: 'Publisher full description. ' + 'Responsibilities and requirements. '.repeat(10) })
const detail = r => ({ ...clone(nativeDetail), id: r.id, jobCode: r.jobCode, jobUrl: r.jobUrl, jobTitle: r.jobTitle, location: r.location, longDescription: '<p>' + r.mediumDescriptionWithoutHtml + '</p>', jobConfigurationData: { ...clone(nativeDetail.jobConfigurationData), 'Job Description': '<p>' + r.mediumDescriptionWithoutHtml + '</p>' } })
const run = (options = {}) => source.run({ fetchPage: authority, now: () => '2026-10-09T00:00:00.000Z', ...options, ...(options.fetchJson ? { fetchJson: (url, init) => url === companyApi ? Promise.resolve(clone(company)) : options.fetchJson(url, init) } : {}) })

test('current published company ID and response page size enumerate beyond the old five-page cap', async () => {
  const rows = Array.from({ length: 13 }, (_, i) => record(i)), offsets = []
  const jobs = await run({ fetchJson: async (url, options) => {
    if (url === source.LISTING_API_URL) {
      assert.equal(options.form.companyId, 'MTU5NzQ=')
      const offset = JSON.parse(options.form.filterCri).paginationStartNo; offsets.push(offset)
      return page(rows.slice(offset, offset + 2), rows.length, 2, offset)
    }
    assert.equal(options.json.companyId, String(raw.companyId))
    return detail(rows.find(r => r.jobUrl === options.json.jobUrl))
  } })
  assert.deepEqual(offsets, [0, 2, 4, 6, 8, 10, 12, 0]); assert.equal(jobs.length, 13)
  assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
})

test('malformed publisher error JSON cannot become a verified empty inventory', async () => {
  await assert.rejects(run({ fetchJson: async () => ({ message: 'Internal Server Error' }) }), /inventory|payload|response/i)
})

test('missing details retain only substantive native full descriptions and mark every output incomplete', async () => {
  const a = record(0), b = record(1); b.mediumDescriptionWithoutHtml = 'JD'; b.metaDescription = 'JD'
  const jobs = await run({ fetchJson: async url => { if (url === source.LISTING_API_URL) return page([a, b]); throw new Error('HTTP 403 for detail') } })
  assert.equal(jobs.length, 1); assert.equal(jobs[0].jobDescription, a.mediumDescriptionWithoutHtml.trim())
  assert.equal(jobs[0].sourceListingComplete, false); assert.equal(jobs[0].publicExperienceChecked, false)
  assert.equal(readInventoryEvidence(jobs)?.status, 'coverage-gap'); assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
})

test('configured maxPages and maxJobs always retain partial inventory evidence', async () => {
  const rows = [record(0), record(1), record(2)]
  for (const limits of [{ maxPages: 1 }, { maxJobs: 1 }]) {
    const jobs = await run({ ...limits, fetchJson: async (url, options) => { if (url === source.LISTING_API_URL) { const offset = JSON.parse(options.form.filterCri).paginationStartNo; return page(rows.slice(offset, offset + 2), 3, 2, offset) } return detail(rows.find(r => r.jobUrl === options.json.jobUrl)) } })
    assert.equal(readInventoryEvidence(jobs)?.listingComplete, false); assert.ok(jobs.every(job => job.sourceListingComplete === false))
  }
})

for (const [name, mutate] of [
  ['wrong employer', r => { r.companyId = 99999 }],
  ['wrong portal', r => { r.careerSiteUrl = 'other-employer.example' }],
  ['unknown country', r => { r.jobLocationRecord[0].country = 'Remote' }],
  ['pseudo country', r => { r.jobLocationRecord[0].country = 'ZZ' }],
  ['contradictory country', r => { r.jobLocationRecord[0].country = 'United States' }],
  ['nonpublic status', r => { r.status = 0 }],
]) test(name + ' fails closed before accepting source rows', async () => {
  const r = record(); mutate(r)
  await assert.rejects(run({ fetchJson: async (url, options) => url === source.LISTING_API_URL ? page([r]) : detail(r) }), /inventory|country|employer|portal|status/i)
})

for (const [name, mutate] of [
  ['detail company mismatch', d => { d.companyId = 99999 }],
  ['detail code mismatch', d => { d.jobCode = 99999 }],
  ['detail title mismatch', d => { d.jobTitle = 'Unrelated role' }],
  ['detail slug mismatch', d => { d.jobUrl = 'unrelated-slug' }],
  ['detail nonpublic status', d => { d.status = 0 }],
  ['detail foreign location', d => { d.location = 'New York, United States' }],
]) test(name + ' cannot silently fall back to a listing preview', async () => {
  const r = record(), d = detail(r); mutate(d)
  await assert.rejects(run({ fetchJson: async url => url === source.LISTING_API_URL ? page([r]) : d }), /inventory|detail|identity|location|status/i)
})

test('short pages, changing totals, and duplicate identities cannot certify complete inventory', async () => {
  for (const kind of ['short', 'drift', 'duplicate']) {
    let calls = 0; const a = record(0), b = record(1), c = record(2)
    await assert.rejects(run({ fetchJson: async (url, options) => {
      if (url !== source.LISTING_API_URL) return detail([a, b, c].find(r => r.jobUrl === options.json.jobUrl))
      calls += 1
      if (kind === 'short') return page([a], 3, 2)
      if (calls === 1) return page([a, b], 3, 2)
      if (kind === 'drift') return page([c], 4, 2, 2)
      return page([{ ...a, jobTitle: 'Conflicting duplicate' }], 3, 2, 2)
    } }), /inventory|count|page|duplicate/i)
  }
})

test('explicit zero is accepted only with the complete count and paging contract', async () => {
  const jobs = await run({ fetchJson: async () => page([], 0) })
  assert.equal(jobs.length, 0); assert.equal(readInventoryEvidence(jobs)?.status, 'coverage-gap')
})

test('empty count metadata and missing page flags cannot authorize a verified zero', async () => {
  for (const mutate of [p => { p.data.totalCount = '' }, p => { delete p.data.hasMoreData }]) {
    const payload = page([], 0); mutate(payload)
    await assert.rejects(run({ fetchJson: async () => payload }), /inventory|count|paging/i)
  }
})
test('private visibility and ellipsized previews cannot provide full-description fallback', async () => {
  const a = record(0), b = record(1); a.jobVisibility = 'Private'; b.mediumDescriptionWithoutHtml += '...'; b.metaDescription = b.mediumDescriptionWithoutHtml
  const jobs = await run({ fetchJson: async url => { if (url === source.LISTING_API_URL) return page([a,b]); throw new Error('HTTP 403 for detail') } })
  assert.equal(jobs.length, 0); assert.equal(readInventoryEvidence(jobs)?.status, 'coverage-gap')
})

for (const [name, mutate] of [
  ['explicit country', d => { d.country = 'United States' }],
  ['structured country', d => { d.jobLocationRecord = [{ country: 'United States', formattedLocation: 'Noida, India' }] }],
]) test('native detail ' + name + ' contradicting India fails closed', async () => {
  const r = record(), d = detail(r); mutate(d)
  await assert.rejects(run({ fetchJson: async url => url === source.LISTING_API_URL ? page([r]) : d }), /inventory|country/i)
})
test('verified India rows explicitly expose country to the shared runner', async () => {
  const r = record(); const jobs = await run({ fetchJson: async url => url === source.LISTING_API_URL ? page([r]) : detail(r) })
  assert.equal(jobs[0].country, 'India')
})
test('a counted source must recheck its first-page identity and status after details', async () => {
  for (const mutation of [r => { r.jobTitle = 'Changed title' }, r => { r.status = 0 }, r => { r.jobLocationRecord[0].country = 'United States' }]) {
    const r = record(); let listings = 0
    await assert.rejects(run({ fetchJson: async url => { if (url !== source.LISTING_API_URL) return detail(r); listings += 1; const value = clone(r); if (listings > 1) mutation(value); return page([value]) } }), /inventory|snapshot|status|country/i)
    assert.equal(listings, 2)
  }
})
test('caller cancellation during details propagates instead of becoming fallback coverage', async () => {
  const controller = new AbortController(), r = record()
  await assert.rejects(run({ signal: controller.signal, fetchJson: async (url, options) => {
    assert.equal(options.signal, controller.signal)
    if (url === source.LISTING_API_URL) return page([r])
    controller.abort(new Error('cancelled by caller')); throw new DOMException('aborted', 'AbortError')
  } }), /cancelled by caller/)
})
test('native transport has a bounded timeout even when a server never responds', async () => {
  const original = globalThis.fetch; let requestSignal
  const keepAlive = setTimeout(() => {}, 1000)
  try {
    globalThis.fetch = async (_url, options) => { requestSignal = options.signal; if (!requestSignal) throw new Error('missing request signal'); return new Promise((_resolve, reject) => { options.signal?.addEventListener('abort', () => reject(options.signal.reason), { once: true }) }) }
    await assert.rejects(run({ requestTimeoutMs: 5 }), /timeout|timed out/i)
    assert.equal(requestSignal.aborted, true)
  } finally { globalThis.fetch = original; clearTimeout(keepAlive) }
})
test('native literal JD placeholders do not become complete jobs', async () => {
  const r = record(), d = detail(r); d.jobConfigurationData['Job Description'] = 'JD'; d.longDescription = 'JD'
  const jobs = await run({ fetchJson: async url => url === source.LISTING_API_URL ? page([r]) : d })
  assert.equal(jobs.length, 0); assert.equal(readInventoryEvidence(jobs)?.status, 'coverage-gap')
})

test('native transport never serializes an abort signal as an HTTP header', async () => {
  const original = globalThis.fetch, r = record(), requests = []
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(Object.hasOwn(init.headers, 'signal'), false)
      assert.ok(init.signal instanceof AbortSignal)
      requests.push({ url, init })
      return new Response(JSON.stringify(url === companyApi ? company : url === source.LISTING_API_URL ? page([r]) : detail(r)), { headers: { 'Content-Type': 'application/json' } })
    }
    const jobs = await run(); assert.equal(jobs.length, 1); assert.equal(requests.length, 4)
  } finally { globalThis.fetch = original }
})
for (const stage of ['listing', 'detail']) for (const inverse of [false, true]) test(stage + ' direct and structured India/foreign contradiction ' + inverse + ' fails closed', async () => {
  const r = record(), d = detail(r), target = stage === 'listing' ? r : d
  target.country = inverse ? 'India' : 'US'; target.jobLocationRecord = [{ country: inverse ? 'United States' : 'India', formattedLocation: 'Bengaluru, India' }]
  await assert.rejects(run({ fetchJson: async url => url === source.LISTING_API_URL ? page([r]) : d }), /inventory|country/i)
})

test('Happiest native application route uses the publisher row ID while preserving the stable job code', () => {
  const job = source.transformHappiestZwayamJob(raw, nativeDetail)
  assert.notEqual(String(raw.id), String(raw.jobCode))
  assert.equal(new URL(job.applyUrl).searchParams.get('id'), String(raw.id))
  assert.equal(job.jobId, String(raw.jobCode))
})
test('Happiest incomplete listing-only jobs also preserve the publisher application row ID', async () => {
  const r = record()
  const jobs = await run({ fetchJson: async url => { if (url === source.LISTING_API_URL) return page([r]); throw new Error('HTTP 403 for detail') } })
  assert.equal(new URL(jobs[0].applyUrl).searchParams.get('id'), String(r.id))
  assert.equal(jobs[0].jobId, String(r.jobCode)); assert.equal(jobs[0].sourceListingComplete, false)
})


test('final access failure retains only an already-incomplete nonempty fresh full-listing subset', async () => {
  for (const failure of [new Error('HTTP 403 for snapshot'), new Error('HTTP 429 for snapshot'), new Error('HTTP 503 for snapshot'), new DOMException('snapshot timed out', 'TimeoutError')]) {
    const r = record(); let listings = 0
    const jobs = await run({ fetchJson: async url => {
      if (url !== source.LISTING_API_URL) throw new Error('HTTP 403 for detail')
      if (++listings === 1) return page([r]); throw failure
    } })
    assert.equal(jobs.length, 1); assert.equal(jobs[0].country, 'India'); assert.equal(jobs[0].sourceListingComplete, false)
    const evidence = readInventoryEvidence(jobs)
    assert.equal(evidence.status, 'coverage-gap'); assert.equal(evidence.listingComplete, false); assert.equal(evidence.indiaFacetCount, null)
    assert.match(evidence.reason, /final-snapshot-unavailable/)
  }
})

test('final unavailable snapshot cannot certify complete or empty or excluded inventory', async () => {
  for (const kind of ['complete', 'empty', 'excluded']) {
    const r = record(); if (kind === 'excluded') { r.mediumDescriptionWithoutHtml = 'JD'; r.metaDescription = 'JD' }
    let listings = 0
    await assert.rejects(run({ fetchJson: async url => {
      if (url !== source.LISTING_API_URL) { if (kind === 'complete') return detail(r); throw new Error('HTTP 403 for detail') }
      if (++listings === 1) return page(kind === 'empty' ? [] : [r]); throw new Error('HTTP 403 for snapshot')
    } }), /HTTP 403/)
  }
})

test('partial descriptions never hide an actual malformed or changed final snapshot', async () => {
  for (const kind of ['malformed', 'title', 'country', 'status']) {
    const r = record(); let listings = 0
    await assert.rejects(run({ fetchJson: async url => {
      if (url !== source.LISTING_API_URL) throw new Error('HTTP 403 for detail')
      if (++listings === 1) return page([r])
      if (kind === 'malformed') return { message: 'HTTP 403 for snapshot' }
      const changed = clone(r)
      if (kind === 'title') changed.jobTitle = 'Changed title'
      if (kind === 'country') changed.jobLocationRecord[0].country = 'United States'
      if (kind === 'status') changed.status = 0
      return page([changed])
    } }), /inventory|snapshot|country|status/)
  }
})

test('partial final snapshot cancellation and unexpected transport failure remain fatal', async () => {
  for (const kind of ['cancel', 'unexpected']) {
    const r = record(), controller = new AbortController(); let listings = 0
    await assert.rejects(run({ signal: controller.signal, fetchJson: async url => {
      if (url !== source.LISTING_API_URL) throw new Error('HTTP 403 for detail')
      if (++listings === 1) return page([r])
      if (kind === 'cancel') { controller.abort(new Error('cancel snapshot')); throw new Error('HTTP 403 for snapshot') }
      throw new Error('unexpected programming failure')
    } }), kind === 'cancel' ? /cancel snapshot/ : /unexpected programming failure/)
  }
})

test('configured factory page or job caps cannot bypass final snapshot unavailability', async () => {
  for (const limits of [{ maxPages: 1 }, { maxJobs: 1 }]) {
    const rows = [record(0), record(1), record(2)]; let listings = 0
    await assert.rejects(source.createHappiestMindsScraper(limits).run({ fetchPage: authority, fetchJson: async url => {
      if (url === companyApi) return clone(company)
      if (url !== source.LISTING_API_URL) throw new Error('HTTP 403 for detail')
      if (++listings === 1) return page(rows.slice(0,2), limits.maxPages ? 3 : 2, 2)
      throw new Error('HTTP 403 for snapshot')
    } }), /HTTP 403/)
  }
})
test('native HTTP200 malformed JSON at the final snapshot remains fatal', async () => {
  const original = globalThis.fetch, r = record(); let listings = 0
  try {
    globalThis.fetch = async url => {
      if (url === companyApi) return new Response(JSON.stringify(company))
      if (url !== source.LISTING_API_URL) return new Response('denied', { status: 403 })
      if (++listings === 1) return new Response(JSON.stringify(page([r])))
      return new Response('HTTP 403 for snapshot but this is malformed HTTP200 JSON')
    }
    await assert.rejects(run(), SyntaxError)
  } finally { globalThis.fetch = original }
})

test('a genuine HTTP200 malformed native detail body is never treated as access denial', async () => {
  const original = globalThis.fetch, r = record()
  try {
    globalThis.fetch = async url => new Response(url === companyApi ? JSON.stringify(company) : url === source.LISTING_API_URL ? JSON.stringify(page([r])) : 'HTTP 403 malformed native detail response', { status: 200 })
    await assert.rejects(run(), SyntaxError)
  } finally { globalThis.fetch = original }
})


for (const [label, change] of [
 ['company', c => { c.reponseObject.company.id = 99999 }],
 ['brand', c => { c.reponseObject.company.companyName = 'Other employer' }],
 ['domain', c => { c.reponseObject.company.domainName = 'other-employer.example' }],
 ['careers URL', c => { c.reponseObject.company.careerSiteUrl = 'other-employer.example' }],
 ['website', c => { c.reponseObject.company.website = 'https://other-employer.example' }],
 ['status', c => { c.responseStatus = 'ERROR' }],
]) test('current publisher tenant ' + label + ' must agree with the official employer handoff', async () => {
 const payload = clone(company); change(payload); let listings = 0
 await assert.rejects(source.run({ fetchPage: authority, fetchJson: async url => { assert.equal(url, companyApi); if (url === listingApi) listings++; return payload } }), /tenant|employer|identity/)
 assert.equal(listings, 0)
})
test('every returned Zwayam job remains incomplete even when native board details and snapshot match', async () => {
 const r = record()
 const jobs = await run({fetchJson: async url => url === listingApi ? page([r]) : detail(r)})
 assert.equal(jobs[0].sourceListingComplete, false)
 assert.equal(readInventoryEvidence(jobs).listingComplete, false)
 assert.equal(readInventoryEvidence(jobs).indiaFacetCount, null)
 assert.match(readInventoryEvidence(jobs).reason, /Darwinbox.*uncovered/)
})
test('known foreign publisher locations including Hong Kong are excluded without becoming India', async () => {
 const r = record(0), foreign = record(1)
 foreign.jobLocationRecord = [{ country: 'Hong Kong', location: 'Hong Kong', formattedLocation: 'Hong Kong' }]
 foreign.location = foreign.locAgg = 'Hong Kong'
 const jobs = await run({ fetchJson: async url => url === listingApi ? page([r, foreign]) : detail(r) })
 assert.equal(jobs.length, 1); assert.equal(jobs[0].country, 'India')
})
test('conflicting configured and native long descriptions fail instead of falling back', async () => {
 const r = record(), d = detail(r); d.longDescription = '<p>Different job duties.</p>'
 await assert.rejects(run({ fetchJson: async url => url === listingApi ? page([r]) : d }), /description.*conflict/)
})
test('short native descriptions are excluded as an incomplete board subset', async () => {
 const r = record(), d = detail(r); d.longDescription = d.jobConfigurationData['Job Description'] = '<p>Engineer</p>'
 const jobs = await run({ fetchJson: async url => url === listingApi ? page([r]) : d })
 assert.equal(jobs.length, 0); assert.equal(readInventoryEvidence(jobs).status, 'coverage-gap')
})

for (const [label, limits, expectedCount, expectedOffsets] of [
 ['job', { maxJobs: 1 }, 1, [0, 2, 0]],
 ['page', { maxPages: 1 }, 2, [0, 0]],
]) test('exported run enforces the caller ' + label + ' cap in actual rows and page requests', async () => {
 const rows = [record(0), record(1), record(2)], offsets = [], detailIds = []
 const jobs = await run({ ...limits, fetchJson: async (url, options) => {
  if (url === listingApi) {
   const offset = JSON.parse(options.form.filterCri).paginationStartNo; offsets.push(offset)
   return page(rows.slice(offset, offset + 2), rows.length, 2, offset)
  }
  detailIds.push(options.json.jobId)
  return detail(rows.find(row => row.id === options.json.jobId))
 } })
 assert.equal(jobs.length, expectedCount)
 assert.deepEqual(offsets, expectedOffsets)
 assert.deepEqual(detailIds.sort((a,b)=>a-b), rows.slice(0,expectedCount).map(row=>row.id))
 assert.ok(jobs.every(job=>job.sourceListingComplete===false))
})
for (const limits of [{ maxJobs: 1 }, { maxPages: 1 }]) test('exported run capped listing cannot admit an unavailable final snapshot ' + JSON.stringify(limits), async () => {
 const rows = [record(0), record(1), record(2)]; let snapshots = 0
 await assert.rejects(run({ ...limits, fetchJson: async (url, options) => {
  if (url !== listingApi) throw new Error('HTTP 403 for detail')
  const offset = JSON.parse(options.form.filterCri).paginationStartNo
  if (offset === 0 && ++snapshots === 2) throw new Error('HTTP 403 for snapshot')
  return page(rows.slice(offset, offset + 2), rows.length, 2, offset)
 } }), /HTTP 403 for snapshot/)
})

for (const variant of ['literal', 'numeric-alias']) test('duplicate native application row IDs across publisher pages fail before detail fallback: ' + variant, async () => {
 const rows = [record(0), record(1), record(2)]
 rows[2].id = variant === 'literal' ? rows[0].id : '0' + rows[0].id
 assert.equal(Number(rows[2].id), Number(rows[0].id))
 assert.notEqual(rows[2].jobCode, rows[0].jobCode)
 assert.notEqual(rows[2].jobUrl, rows[0].jobUrl)
 let detailRequests = 0
 await assert.rejects(run({fetchJson: async (url, options) => {
  if (url !== listingApi) { detailRequests++; throw new Error('HTTP 403 for detail') }
  const offset = JSON.parse(options.form.filterCri).paginationStartNo
  return page(rows.slice(offset, offset + 2), rows.length, 2, offset)
 }}), /duplicate.*native.*identity/i)
 assert.equal(detailRequests, 0)
})
