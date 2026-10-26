import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import nodeTest from 'node:test'
import { gunzipSync } from 'node:zlib'

import { runWorkdayScraper } from '../myworkday/engine.js'
import { resolveZeroJobOutcome } from '../runner.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const test = (name, run) => nodeTest(name, { concurrency: false }, run)
const capture = JSON.parse(gunzipSync(fs.readFileSync(new URL(
  './fixtures/workdayCountryInventoryProof/capture.json.gz', import.meta.url,
))))
const capturedResponse = name => {
  const receipt = capture.responses[name]
  assert.ok(receipt, `Missing captured response ${name}`)
  const body = Buffer.from(receipt.bodyBase64, 'base64')
  assert.equal(createHash('sha256').update(body).digest('hex'), receipt.sha256)
  return { ...receipt, body }
}
const capturedJson = name => JSON.parse(capturedResponse(name).body)
const sources = {
  csg: {
    company: 'CSG', boardUrl: 'https://csgi.wd5.myworkdayjobs.com/CSGCareers',
    detailUrlBase: 'https://csgi.wd5.myworkdayjobs.com/en-US/CSGCareers',
    corporateUrl: 'https://www.csgi.com/careers',
  },
  temenos: {
    company: 'Temenos', boardUrl: 'https://temenos.wd103.myworkdayjobs.com/en-US/Temenoscareers',
    detailUrlBase: 'https://temenos.wd103.myworkdayjobs.com/en-US/Temenoscareers',
    corporateUrl: 'https://www.temenos.com/about-us/careers/',
  },
}
const asResponse = ({ url, body, status = 200, contentType = 'application/json' }) => {
  const response = new Response(body, { status, headers: { 'content-type': contentType } })
  Object.defineProperty(response, 'url', { value: url })
  return response
}

// Exercise the real engine and zero-outcome consumer; only external HTTP is replaced.
// Each run reads a real local config, so no shared companies metadata is mocked.
const exercise = async (t, { source = 'csg', change = () => {}, options = {} } = {}) => {
  const spec = sources[source]
  const initialReceipt = capturedResponse(`${source}-initial`)
  const state = {
    initial: capturedJson(`${source}-initial`),
    closing: capturedJson(`${source}-closing`),
    closingResponse: {},
    corporate: capturedResponse(`${source}-corporate`),
    details: new Map(),
  }
  for (const name of Object.keys(capture.responses)) {
    if (!name.startsWith(source + '-') || !/^(?:csg-\d+|temenos-JR\d+)$/.test(name)) continue
    const receipt = capturedResponse(name)
    state.details.set(receipt.url, JSON.parse(receipt.body))
  }
  change(state)
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workday-country-proof-'))
  t.after(() => {
    const target = fs.realpathSync(directory)
    assert.equal(path.dirname(target), fs.realpathSync(os.tmpdir()))
    assert.ok(path.basename(target).startsWith('workday-country-proof-'))
    fs.rmSync(target, { recursive: true })
  })
  fs.writeFileSync(path.join(directory, 'config.json'), JSON.stringify({
    listingStrategy: 'jobs-api', jobsApiUrl: initialReceipt.url,
    detailUrlBase: spec.detailUrlBase, locationCountry: null, searchText: '',
    // Proof mode must inspect unresolved offices even if an old city filter remains.
    locationPattern: 'india|bengaluru|bangalore|hyderabad|pune|mumbai|gurgaon|gurugram|noida|chennai',
    inventoryScope: 'complete-board-country-proof', officialCareersUrl: spec.corporateUrl,
  }))
  const calls = []
  let listingCalls = 0
  const fetchMock = t.mock.method(globalThis, 'fetch', async (input, init = {}) => {
    const url = String(input)
    const method = init.method || 'GET'
    calls.push({ url, method, ...(init.body ? { body: JSON.parse(init.body) } : {}) })
    if (url === spec.corporateUrl && method === 'GET') return asResponse(state.corporate)
    if (url === initialReceipt.url && method === 'POST') {
      const request = JSON.parse(init.body)
      assert.deepEqual(request.appliedFacets, {}, 'A complete-board proof cannot implicitly select India')
      assert.equal(request.searchText, '', 'Keyword absence is not a country inventory')
      assert.equal(request.offset, 0)
      assert.equal(request.limit, 20)
      listingCalls++
      assert.ok(listingCalls <= 2, 'Only the initial and closing complete snapshots are expected')
      return asResponse({ url, body: JSON.stringify(listingCalls === 1 ? state.initial : state.closing),
        ...(listingCalls === 2 ? state.closingResponse : {}),
      })
    }
    if (method === 'GET' && state.details.has(url)) {
      return asResponse({ url, body: JSON.stringify(state.details.get(url)) })
    }
    if (source === 'temenos' && url === capturedResponse('temenos-JR2335-html').url) {
      return asResponse(capturedResponse('temenos-JR2335-html'))
    }
    if (method === 'GET' && (url === spec.boardUrl || url === spec.detailUrlBase)) {
      return asResponse({ url, contentType: 'text/html', body: '<html><body>Workday careers</body></html>' })
    }
    throw new Error(`Unexpected HTTP request; live network is forbidden: ${method} ${url}`)
  })
  let jobs, error
  try {
    jobs = await runWorkdayScraper({
      company: spec.company, source, baseUrl: spec.boardUrl, scraperDir: directory,
      requestTimeoutMs: 1000, retryBaseDelayMs: 0,
      requestScheduler: { acquire: async () => () => {}, recordRateLimit: () => {} },
      ...options,
    })
  } catch (failure) {
    error = failure
  } finally {
    fetchMock.mock.restore()
  }
  return { jobs, error, calls, evidence: readInventoryEvidence(jobs) }
}

const assertNoCertifiedZero = result => {
  assert.ok(result.error || result.evidence?.status === 'unverified',
    'An incomplete proof must fail or carry explicitly unverified evidence')
  assert.notEqual(result.evidence?.status, 'complete-inventory')
  assert.notEqual(result.evidence?.status, 'verified-empty')
  assert.notEqual(resolveZeroJobOutcome({ provider: {} }, result.jobs || [], []), 'fetched-zero')
}

test('CSG requires a fresh corporate binding and unchanged complete inventory before fetched-zero', async t => {
  const result = await exercise(t)
  assert.ifError(result.error)
  assert.equal(result.calls.filter(call => call.url === sources.csg.corporateUrl).length, 1,
    'This invocation must fetch the current corporate careers handoff')
  assert.deepEqual(result.jobs, [])
  assert.equal(result.evidence?.status, 'complete-inventory')
  assert.equal(result.evidence?.surface, 'https://csgi.wd5.myworkdayjobs.com/wday/cxs/csgi/CSGCareers/jobs')
  assert.equal(result.evidence?.reportedTotal, 15)
  assert.equal(result.evidence?.indiaFacetCount, 0)
  assert.equal(result.evidence?.listingComplete, true)
  assert.equal(result.calls.filter(call => call.method === 'POST').length, 2,
    'The closing snapshot must reconcile the complete board')
  assert.equal(resolveZeroJobOutcome({ provider: {} }, result.jobs, []), 'fetched-zero')
  for (const change of [
    state => { state.closing.total = 16 },
    state => { state.closing.jobPostings.pop() },
    state => { state.closing.jobPostings[0].externalPath = '/job/Other/Unseen-Role_R999' },
  ]) assertNoCertifiedZero(await exercise(t, { change }))
})

test('CSG cannot replace current active corporate evidence with a static flag or earlier binding', async t => {
  const earlier = await exercise(t)
  assert.ifError(earlier.error)
  for (const change of [
    state => { state.corporate.body = '<html><a href="https://csgi.wd5.myworkdayjobs.com/RetiredCareers">Jobs</a></html>' },
    state => { state.corporate.body = '<html><script>window.board="https://csgi.wd5.myworkdayjobs.com/CSGCareers"</script></html>' },
    state => { state.corporate.body = '<html><a aria-disabled="true" href="https://csgi.wd5.myworkdayjobs.com/CSGCareers">Jobs</a></html>' },
    state => { state.corporate.url = 'https://unrelated.example/careers' },
    state => { state.corporate.status = 503 },
    state => { state.corporate.contentType = 'application/json' },
  ]) {
    // Challenge the old flag explicitly; it must not authorize this invocation.
    const result = await exercise(t, { change, options: { boardIdentityVerified: true } })
    assertNoCertifiedZero(result)
    assert.ok(result.calls.some(call => call.url === sources.csg.corporateUrl),
      'Every invocation must obtain its own current corporate response')
  }
})

test('CSG resolves an unfamiliar native India office instead of dropping it with a city regex', async t => {
  const result = await exercise(t, { change: state => {
    const posting = {
      title: 'Software Engineer at Campus 42', externalPath: '/job/Campus_42/Software-Engineer_R90001',
      locationsText: 'Campus_42', postedOn: 'Posted Today', bulletFields: ['R90001'],
    }
    for (const inventory of [state.initial, state.closing]) {
      inventory.total = 16
      inventory.jobPostings.push(structuredClone(posting))
    }
    const detail = structuredClone(state.details.values().next().value)
    Object.assign(detail.jobPostingInfo, {
      title: posting.title, jobReqId: 'R90001', jobPostingId: 'Software-Engineer_R90001',
      externalUrl: 'https://csgi.wd5.myworkdayjobs.com/CSGCareers' + posting.externalPath,
      location: 'Campus_42', additionalLocations: [],
      country: { descriptor: 'India', id: 'c4f78be1a8f14da0ab49ce1162348a5e' },
      jobRequisitionLocation: { descriptor: 'Campus_42',
        country: { descriptor: 'India', id: 'c4f78be1a8f14da0ab49ce1162348a5e', alpha2Code: 'IN' } },
      jobDescription: '<p>Develop reliable software and maintain production services for this India office.</p>',
    })
    state.details.set('https://csgi.wd5.myworkdayjobs.com/wday/cxs/csgi/CSGCareers' + posting.externalPath, detail)
  } })
  assert.ifError(result.error)
  assert.equal(result.jobs?.length, 1)
  assert.equal(result.jobs[0].title, 'Software Engineer at Campus 42')
  assert.equal(result.jobs[0].requisitionId, 'R90001')
  assert.equal(result.jobs[0].location, 'Campus_42, India')
  assert.match(result.jobs[0].sourceDescription, /maintain production services/)
  assert.equal(result.evidence?.reportedTotal, 16)
  assert.equal(result.evidence?.indiaFacetCount, 1)
  assert.equal(resolveZeroJobOutcome({ provider: {} }, result.jobs, result.jobs), null)
})

test('CSG country exclusion requires native requisition title and board identity in proof mode', async t => {
  for (const mutate of [
    info => { delete info.jobReqId },
    info => { delete info.title },
    info => { delete info.jobPostingSiteId },
    info => { info.jobReqId = 'R999' },
    info => { info.title = 'Unrelated role' },
    info => { info.jobPostingSiteId = 'AnotherSite' },
    info => { info.externalUrl = 'https://another.wd5.myworkdayjobs.com/CSGCareers/job/Other/Other_32265' },
  ]) {
    const result = await exercise(t, { change: state => {
      mutate(state.details.get('https://csgi.wd5.myworkdayjobs.com/wday/cxs/csgi/CSGCareers/job/Brazil-Remote/Software-Development-Engineer_32265').jobPostingInfo)
    } })
    assertNoCertifiedZero(result)
  }
})

test('Temenos cannot exclude an untyped secondary location using Cairo-only native SEO geography', async t => {
  const html = capturedResponse('temenos-JR2335-html').body.toString('utf8')
  const seo = JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)[1])
  assert.equal(seo.identifier.value, 'JR2335')
  assert.equal(seo.jobLocation.address.addressLocality, 'Cairo')
  assert.equal(seo.jobLocation.address.addressCountry, 'Egypt')
  const result = await exercise(t, { source: 'temenos' })
  assert.equal(result.error?.name, 'WorkdayIncompleteScopeError')
  assert.match(result.error.cause?.message || '', /Johannesburg|do not establish India or foreign scope/)
  assertNoCertifiedZero(result)
  assert.equal(result.calls.filter(call => call.url === sources.temenos.corporateUrl).length, 1,
    'The incomplete result must still check the current corporate board binding')
})

for (const [label, response] of [
  ['redirected off-board', { url: 'https://unrelated.example/jobs' }],
  ['served as plain text', { contentType: 'text/plain' }],
]) test(`CSG cannot certify a closing complete snapshot ${label}`, async t => {
  const result = await exercise(t, { change: state => { state.closingResponse = response } })
  assert.equal(result.calls.filter(call => call.method === 'POST').length, 2)
  assertNoCertifiedZero(result)
})

for (const empty of [false, true]) test(`CSG requires ${empty ? 'nonempty' : 'present'} native country identities for a grouped role`, async t => {
  const result = await exercise(t, { change: state => {
    const info = state.details.get('https://csgi.wd5.myworkdayjobs.com/wday/cxs/csgi/CSGCareers/job/Brazil-Remote/Software-Development-Engineer_32265').jobPostingInfo
    if (empty) {
      info.country = {}
      info.jobRequisitionLocation.country = { id: 'opaque-country-id-without-a-name-or-code' }
    } else {
      delete info.country
      delete info.jobRequisitionLocation.country
    }
  } })
  assertNoCertifiedZero(result)
})

// Mutate the captured native receipt without changing its title, requisition,
// posting site, or canonical URL. Only the public office/country fields change.
const addProofIndiaOffice = (state, { listingLocation = 'Campus_42', country = true } = {}) => {
  const posting = {
    title: 'Software Engineer at Campus 42', externalPath: '/job/Campus_42/Software-Engineer_R90001',
    locationsText: listingLocation, postedOn: 'Posted Today', bulletFields: ['R90001'],
  }
  for (const inventory of [state.initial, state.closing]) {
    inventory.total++
    inventory.jobPostings.push(structuredClone(posting))
  }
  const detail = structuredClone(state.details.values().next().value)
  Object.assign(detail.jobPostingInfo, {
    title: posting.title, jobReqId: 'R90001', jobPostingId: 'Software-Engineer_R90001',
    externalUrl: 'https://csgi.wd5.myworkdayjobs.com/CSGCareers' + posting.externalPath,
    location: 'Campus_42', additionalLocations: [],
    country: { descriptor: 'India', id: 'c4f78be1a8f14da0ab49ce1162348a5e' },
    jobRequisitionLocation: { descriptor: 'Campus_42',
      country: { descriptor: 'India', id: 'c4f78be1a8f14da0ab49ce1162348a5e', alpha2Code: 'IN' } },
    jobDescription: '<p>Develop reliable software and maintain production services for this India office.</p>',
  })
  if (!country) {
    delete detail.jobPostingInfo.country
    delete detail.jobPostingInfo.jobRequisitionLocation.country
  }
  state.details.set('https://csgi.wd5.myworkdayjobs.com/wday/cxs/csgi/CSGCareers' + posting.externalPath, detail)
}

test('CSG cannot invent a country for an opaque native office without country evidence', async t => {
  const result = await exercise(t, { change: state => addProofIndiaOffice(state, { country: false }) })
  assert.equal(result.error?.name, 'WorkdayIncompleteScopeError')
  assertNoCertifiedZero(result)
})

test('CSG resolves conflicting explicit listing country codes through native India details', async t => {
  const result = await exercise(t, { change: state => addProofIndiaOffice(state, { listingLocation: 'US.Campus42, IN' }) })
  assert.ifError(result.error)
  assert.equal(result.jobs?.length, 1)
  assert.equal(result.jobs[0].requisitionId, 'R90001')
  assert.equal(result.jobs[0].location, 'Campus_42, India')
  assert.equal(result.evidence?.indiaFacetCount, 1)
  assert.equal(resolveZeroJobOutcome({ provider: {} }, result.jobs, result.jobs), null)
})

const corporateAnchor = '<a href="https://csgi.wd5.myworkdayjobs.com/CSGCareers">Jobs</a>'
for (const [label, markup] of [
  ['xmp raw text', '<xmp>' + corporateAnchor + '</xmp>'],
  ['iframe fallback', '<iframe>' + corporateAnchor + '</iframe>'],
  ['object fallback', '<object>' + corporateAnchor + '</object>'],
  ['noembed fallback', '<noembed>' + corporateAnchor + '</noembed>'],
  ['plaintext raw text', '<plaintext>' + corporateAnchor],
  ['comment-obscured hidden style', '<div style="display:/**/none">' + corporateAnchor + '</div>'],
]) test(`CSG corporate ${label} anchors cannot bind the current Workday board`, async t => {
  const result = await exercise(t, { change: state => {
    state.corporate.body = '<html><body>' + markup + '</body></html>'
  } })
  assertNoCertifiedZero(result)
})
