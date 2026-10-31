import { fixture, replay } from './fixtureReplay.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import * as banyansoftware from '../../../scraper/banyansoftware/script.js'
import * as doximity from '../../../scraper/doximity/script.js'
import * as elationhealth from '../../../scraper/elationhealth/script.js'
import * as eqtcorporation from '../../../scraper/eqtcorporation.workday/script.js'
import * as buildkite from '../../../scraper/buildkite/script.js'
import * as tripadvisor from '../../../scraper/tripadvisor/script.js'
import * as prophecy from '../../../scraper/prophecy/script.js'
import * as dutchie from '../../../scraper/dutchie/script.js'
import * as biofourmis from '../../../scraper/biofourmis/script.js'
import { createNativeGreenhouseScraper, NATIVE_GREENHOUSE_PROFILES } from './nativeCareers.js'
import { normalizeScrapedJob } from '../../utils/normalizeScrapedJob.js'
import { isIndiaJob } from '../../utils/indiaLocationFilter.js'
import { readInventoryEvidence } from '../../utils/inventoryEvidence.js'

globalThis.fetch = async () => { throw Error('Offline original-entity controls prohibit all network and website execution') }
// FT's reusable channel profile is tested here; its broader registered source
// has separate original-entity traversal tests in financialtimes/native.test.js.
const sources = { banyansoftware, doximity, elationhealth, eqtcorporation, buildkite, tripadvisor, prophecy, dutchie, biofourmis,
  'financialtimes-channel-only':createNativeGreenhouseScraper(NATIVE_GREENHOUSE_PROFILES.financialtimes) }

for (const [source, module] of Object.entries(sources)) test(source + ': genuine complete native post corpus is retained before prospect/country selection', async () => {
  const r = replay(), nativeSource=source==='financialtimes-channel-only'?'financialtimes':source, expected = fixture.oracle[nativeSource]
  let jobs, error
  try { jobs = await module.run(r.options) } catch (caught) { error = caught.message }
  assert.equal(r.audits.length, 1, 'Current complete published records must reach an awaited audit; legacy result/error: ' + error)
  assert.ifError(error)
  const audit = r.audits[0]
  assert.equal(audit.opening.publisherQualified, true)
  assert.equal(audit.closing.publisherQualified, true)
  assert.equal(audit.opening.qualified, true)
  assert.equal(audit.closing.qualified, true)
  assert.equal(audit.observations.length, expected.records.length)
  assert.equal(audit.opening.reportedNativePostCount, expected.records.length)
  assert.equal(audit.closing.reportedNativePostCount, expected.records.length)
  assert.equal(audit.opening.nativePostIds.length, expected.records.length)
  assert.equal(audit.closing.nativePostIds.length, expected.records.length)
  assert.deepEqual(audit.observations.map(job => job.jobId), expected.records.map(row => String(row.postId)))
  for (const row of expected.records) {
    const job = audit.observations.find(item => item.jobId === String(row.postId))
    assert.deepEqual(job.sourceNativeRecord, row.nativeOwnPostRecord)
    assert.deepEqual(job.sourceNativeListingRecord, row.nativeFeedRecord)
    assert.equal(job.sourceNativePostKind, row.postKind)
    assert.equal(job.internalJobId, row.nativeOwnPostRecord.internal_job_id)
    assert.equal(job.requisitionId, row.nativeOwnPostRecord.requisition_id)
    assert.equal(job.sourcePostingDate, row.nativeOwnPostRecord.first_published)
    assert.equal(job.sourceNativeContentText, row.nativeContentText)
    assert.equal(job.jobDescription, row.fullCriteriaText)
    assert.equal(job.sourceNativeOwnHostedPageReadThisRun, false)
    assert.equal(job.sourceCurrentNativeRoleQualified, true)
    const normalized = normalizeScrapedJob(job, { source:nativeSource, companyName: fixture.profiles[nativeSource].companyName, countryFilter: 'India' })
    assert.equal(normalized.sourceDescription, row.fullCriteriaText)
    assert.equal(normalized.postedAt.toISOString(), new Date(row.nativeOwnPostRecord.first_published).toISOString())
    assert.equal(isIndiaJob(normalized) && row.postKind === 'job', false, 'Genuine cohort has no native India job-kind posts; unresolved scope cannot infer India')
    if (!job.country) { assert.equal(job.location, null);assert.equal(job.city, null);assert.deepEqual(job.locations, []) }
    assert.equal(job.sourceScopeComplete, false);assert.equal(job.lifecycleCleanupAllowed, false)
  }
  assert.ok(jobs.every(job => job.sourceNativePostKind === 'job'))
  assert.equal(readInventoryEvidence(jobs).status, 'discovery-only')
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.equal(readInventoryEvidence(jobs).reportedTotal, null)
  assert.equal(audit.sourceScopeComplete, false)
  assert.ok(r.requests.every(url => !new URL(url).hostname.startsWith('job-boards.')), 'Blocked hosted pages are never retried')
})

test('original Response transport is read without inventing HTTP metadata or falling back to parsed JSON', async () => {
  const r = replay(), methods = []
  const fetchImpl = async (url, request) => {
    methods.push(request?.method)
    return r.options.fetchImpl(url)
  }
  const jobs = await biofourmis.run({ fetchImpl, onAudit: audit => r.audits.push(audit) })
  assert.equal(jobs.length, 0);assert.equal(r.audits.length, 1)
  assert.equal(r.audits[0].opening.publisherQualified, true);assert.equal(r.audits[0].closing.publisherQualified, true)
  assert.ok(methods.length > 0 && methods.every(method => method === 'GET'))
  assert.ok(r.audits[0].rawPages.every(page => page.transportQualified && page.bodyBase64 && page.bodySHA256))
})
