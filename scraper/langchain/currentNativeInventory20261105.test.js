import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import test from 'node:test'
import { run } from './script.js'
import { createLangchainNativeScraper } from './nativeInventory.js'
import { getScraperCatalog, createCatalogScraper } from '../../scraper-support/providers/index.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { readSourceObservationEvidence } from '../../scraper-support/utils/sourceObservationEvidence.js'
import { extractionRawJobMetrics } from '../../scraper-support/utils/extractionRawJobMetrics.js'

const fixture = new URL('./test-data/native-inventory-20261105/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixture)))
const receipts = manifest.records.map(row => {
  const bytes = gunzipSync(readFileSync(new URL(row.bodyFile, fixture)))
  assert.equal(bytes.length, row.bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256)
  return { ...row, body: bytes.toString('utf8') }
})
const API = 'https://api.ashbyhq.com/posting-api/job-board/langchain'
const BOARD = 'https://jobs.ashbyhq.com/langchain'
const CAREERS = 'https://www.langchain.com/careers'
const OBSERVATIONS = Symbol.for('jobverify.verified-recruitment-observations')
const provider = getScraperCatalog().find(row => row.source === 'langchain')
function replay(transform = row => row) {
  const calls = []
  const fetchDocument = async (url, options = {}) => {
    options.signal?.throwIfAborted()
    const receipt = receipts.find(row => row.requestedUrl === url)
    assert.ok(receipt, 'No genuine body for ' + url)
    calls.push(url)
    return transform({ ...receipt, url: receipt.finalUrl }, calls.length)
  }
  return { calls, options: { fetchDocument, acquisitionMode: 'captured-response-replay',
    fetchPage: async (url, options) => { const row = await fetchDocument(url, options); return { ...row, html: row.body } },
    fetchJson: async (url, options) => JSON.parse((await fetchDocument(url, options)).body),
  } }
}

// Deliberately synthetic mutations below are behavioral checks; none is an
// observed current role, country, failure, or source response.
function mutateNative(change) {
  return replay(row => {
    if (row.requestedUrl === API) {
      const payload = JSON.parse(row.body)
      change(payload.jobs[0], payload)
      return { ...row, body: JSON.stringify(payload), sha256: undefined, bytes: undefined }
    }
    if (row.requestedUrl === BOARD) {
      const match = row.body.match(/^([\s\S]*?window\.__appData = )(\{[^\n]+\})(;[\s\S]*)$/)
      assert.ok(match)
      const data = JSON.parse(match[2]), payload = JSON.parse(receipts[2].body)
      change(payload.jobs[0], payload)
      const native = payload.jobs[0], brief = data.jobBoard.jobPostings.find(item => item.id === native.id)
      if (brief) Object.assign(brief, { title: native.title, locationName: native.location,
        secondaryLocations: native.secondaryLocations.map((location, index) => ({ locationId: 'synthetic-' + index, locationName: location.location, __typename: 'JobPostingSecondaryLocation' })) })
      return { ...row, body: match[1] + JSON.stringify(data) + match[3], sha256: undefined, bytes: undefined }
    }
    return row
  })
}

// Catches the former two-read recovery path, which discarded every foreign
// model before detail health and never checked the native board or closing view.
for (const [boundary, invoke] of [['factory', options => createLangchainNativeScraper().run(options)], ['exported', run], ['registered', options => createCatalogScraper(provider).run(options)]]) {
  test(`genuine current ${boundary} route retains 101 full native roles before India projection and closing checks`, async () => {
    const context = replay()
    const jobs = await invoke(context.options)
    assert.deepEqual(context.calls, [CAREERS, BOARD, API, API, BOARD, CAREERS])
    const audit = jobs[OBSERVATIONS]?.nativeInventoryAudit
    assert.ok(audit, 'Full native audit survives the public boundary')
    assert.equal(audit.configuredBoardInventoryComplete, true)
    assert.equal(audit.allRoleDetailHealth.complete, true)
    assert.equal(audit.allRoleDetailHealth.inspectedJobs, 101)
    assert.equal(audit.fullNativeModels.length, 101)
    assert.equal(audit.countryRelations.inspected, 149)
    assert.equal(audit.countryRelations.unresolved, 0)
    assert.equal(audit.configuredBoardIndiaCount, 0)
    assert.equal(audit.sourceScopeComplete, false)
    assert.equal(audit.companyGlobalTotal, null)
    assert.equal(audit.companyIndiaTotal, null)
    assert.equal(jobs.length, 0)
    const evidence = readInventoryEvidence(jobs)
    assert.equal(evidence.listingComplete, false)
    assert.equal(evidence.status, 'discovery-only')
    assert.equal(extractionRawJobMetrics(provider, jobs, evidence).rawJobs, 101)
    assert.equal(readSourceObservationEvidence(jobs, 'langchain').observedVacancyCount, 101)
    const role = audit.fullNativeModels.find(row => row.id === '74e5f9f4-e44a-4594-ba26-abdf71bf287d')
    assert.equal(role.nativeSourceRecord.descriptionHtml, JSON.parse(receipts[2].body).jobs[0].descriptionHtml)
    assert.equal(role.nativeSourceRecord.descriptionPlain, JSON.parse(receipts[2].body).jobs[0].descriptionPlain)
    assert.equal(role.nativePublication.raw, '2025-02-10T19:22:00.810+00:00')
    assert.equal(role.nativePublication.precision, 'millisecond')
    assert.equal(role.firstEverPublication, null)
    assert.equal(role.legalEmployer, null)
    assert.equal(role.requisitionId, null)
    const unknownWorkplace = audit.fullNativeModels.find(row => row.id === 'e86a5b13-75e7-4b4e-bc18-3c81b58d1543')
    assert.equal(unknownWorkplace.nativeSourceRecord.workplaceType, null)
    assert.equal(unknownWorkplace.nativeSourceRecord.isRemote, null)
    assert.equal(audit.applicationsVisited, false)
  })
}

test('synthetic missing foreign role description cannot hide behind a zero India projection', async () => {
  const context = mutateNative(role => { role.descriptionHtml = ''; role.descriptionPlain = '' })
  await assert.rejects(run(context.options), /description/i)
})

test('synthetic secondary typed India country is projected with native criteria and unknown requisition', async () => {
  const context = mutateNative(role => {
    role.secondaryLocations = [{ location: 'Bengaluru', address: { postalAddress: { addressCountry: 'IN', addressLocality: 'Bengaluru' } } }]
  })
  const jobs = await run(context.options)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].requisitionId, null)
  assert.equal(jobs[0].sourceDescription, JSON.parse(receipts[2].body).jobs[0].descriptionHtml)
  assert.equal(jobs[0].nativeDescriptionPlain, JSON.parse(receipts[2].body).jobs[0].descriptionPlain)
  assert.equal(jobs[0].sourceScopeComplete, false)
  assert.equal(jobs[0].lifecycleCleanupAllowed, false)
})

test('synthetic city and Remote labels cannot resolve an unknown typed country to India', async () => {
  const context = mutateNative(role => {
    role.location = 'Bengaluru / Remote'; role.address = { postalAddress: { addressCountry: 'Unresolved' } }; role.secondaryLocations = []
  })
  const jobs = await run(context.options)
  const audit = jobs[OBSERVATIONS].nativeInventoryAudit
  assert.equal(jobs.length, 0)
  assert.equal(audit.countryRelations.unresolved, 1)
  assert.equal(audit.configuredBoardIndiaCount, null)
  assert.equal(audit.configuredBoardInventoryComplete, false)
})

test('synthetic closing description change prevents a complete configured inventory', async () => {
  const context = replay((row, call) => {
    if (row.requestedUrl !== API || call !== 4) return row
    const payload = JSON.parse(row.body); payload.jobs[0].descriptionPlain += '\nChanged during this source attempt.'
    return { ...row, body: JSON.stringify(payload), sha256: undefined, bytes: undefined }
  })
  await assert.rejects(run(context.options), /closing|changed/i)
})

test('synthetic final-delivery cancellation preserves the caller opaque reason exactly', async () => {
  const controller = new AbortController(), reason = { caller: 'opaque cancellation' }
  const context = replay((row, call) => { if (call === 6) controller.abort(reason); return row })
  await assert.rejects(run({ ...context.options, signal: controller.signal }), error => error === reason)
})

test('synthetic transport ignoring cancellation remains bounded by the source deadline', async () => {
  await assert.rejects(run({ sourceTimeoutMs: 20, fetchDocument: () => new Promise(() => {}) }), /timeout|deadline/i)
})

for (const [name, change, expected] of [
  ['foreign native application authority', role => { role.applyUrl = 'https://jobs.ashbyhq.com/other/' + role.id + '/application' }, /identity/],
  ['unknown API version', (_role, payload) => { payload.apiVersion = '2' }, /schema|envelope/],
  ['pagination envelope', (_role, payload) => { payload.hasMore = true }, /schema|envelope/],
  ['unlisted posting', role => { role.isListed = false }, /listed|state/],
  ['invalid date rollover', role => { role.publishedAt = '2026-02-30T00:00:00.000+00:00' }, /calendar|time/],
  ['contradictory written India country', role => { role.location = 'India' }, /country/],
]) {
  test(`synthetic ${name} cannot qualify a native inventory`, async () => {
    await assert.rejects(run(mutateNative(change).options), expected)
  })
}

test('synthetic changed native employer binding is rejected before any API read', async () => {
  const context = replay(row => row.requestedUrl === BOARD ? { ...row, body: row.body.replace('"name":"LangChain"', '"name":"Other employer"') } : row)
  await assert.rejects(run(context.options), /employer|binding/)
  assert.deepEqual(context.calls, [CAREERS, BOARD])
})

test('synthetic changed frontend loader requires static review before any API read', async () => {
  const context = replay(row => row.requestedUrl === BOARD ? { ...row, body: row.body.replace('const ENTRY_KEY = "index.html";', 'const ENTRY_KEY = "new.html";') } : row)
  await assert.rejects(run(context.options), /loader|review/)
  assert.deepEqual(context.calls, [CAREERS, BOARD])
})

test('synthetic pre-aborted caller never begins a public request', async () => {
  const controller = new AbortController(), reason = { caller: 'before source read' }
  controller.abort(reason)
  const context = replay()
  await assert.rejects(run({ ...context.options, signal: controller.signal }), error => error === reason)
  assert.deepEqual(context.calls, [])
})

test('synthetic oversized body fails its byte budget before being parsed', async () => {
  await assert.rejects(run({ fetchDocument: async url => ({ status: 200, url, body: 'x'.repeat(8000001) }) }), /byte limit/)
})

test('synthetic row schema drift cannot silently introduce an unreviewed applicant country', async () => {
  const context = mutateNative(role => { role.applicantLocationRequirements = { addressCountry: 'India' } })
  await assert.rejects(run(context.options), /schema|unreviewed/i)
})

test('synthetic workplace contradiction remains unqualified', async () => {
  const context = mutateNative(role => { role.isRemote = true })
  await assert.rejects(run(context.options), /workplace|remote|employment/i)
})

test('synthetic fractional publication precision is retained without inventing milliseconds', async () => {
  const context = mutateNative(role => { role.publishedAt = '2025-02-10T19:22:00.81+00:00' })
  const jobs = await run(context.options)
  const role = jobs[OBSERVATIONS].nativeInventoryAudit.fullNativeModels.find(row => row.id === '74e5f9f4-e44a-4594-ba26-abdf71bf287d')
  assert.equal(role.nativePublication.precision, 'centisecond')
  assert.equal(role.nativePublication.fractionalDigits, 2)
})
