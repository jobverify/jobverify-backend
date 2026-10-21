import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../myworkday/engine.js'
import { WorkdayRequestScheduler } from '../myworkday/requestScheduler.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const exercise = async (t, { count = 192, mode = 'complete', grouped = false, ...overrides } = {}) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-10-21T00:00:00Z') })
  const startedAt = Date.now()
  const api = 'https://health-fixture.wd930.myworkdayjobs.com/wday/cxs/health-fixture/External'
  const roles = Array.from({ length: count }, (_, index) => ({
    title: 'Engineer ' + index, externalPath: '/job/Bangalore/Engineer_R' + index,
    locationsText: grouped ? '2 Locations' : 'Bangalore, India',
  }))
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url, init = {}) => {
    if (init.method === 'POST') {
      const { offset, limit } = JSON.parse(init.body)
      return Response.json({ total: roles.length, jobPostings: roles.slice(offset, offset + limit) })
    }
    if (!String(url).includes('/job/')) return new Response('<html>Workday careers</html>')
    requests.push(String(url))
    if (mode === 'upstream') return new Response('Request blocked', { status: 403 })
    if (!String(url).includes('/wday/cxs/')) return new Response('<html>No description</html>')
    const role = roles.find(role => String(url) === api + role.externalPath)
    assert.ok(role, 'Only fetch the enumerated native role')
    return Response.json({ jobPostingInfo: {
      title: role.title, jobReqId: role.externalPath.split('_').at(-1),
      location: 'Bangalore, India', country: { descriptor: 'India' },
      jobRequisitionLocation: { descriptor: 'Bangalore, India', country: { descriptor: 'India', alpha2Code: 'IN' } },
      additionalLocations: grouped ? ['London, United Kingdom'] : [],
      jobDescription: mode === 'missing-content' ? '' : '<p>Build reliable engineering systems.</p>',
    } })
  })
  let completion
  const run = runWorkdayScraper({
    source: 'health-fixture', company: 'Workday health fixture',
    baseUrl: 'https://health-fixture.wd930.myworkdayjobs.com/External',
    scraperDir: fileURLToPath(new URL('../myworkday', import.meta.url)),
    requestScheduler: new WorkdayRequestScheduler(),
    retryBaseDelayMs: 0, ...overrides,
  }).then(jobs => { completion = { jobs } }, error => { completion = { error } })
  for (let step = 0; !completion && step < 2000; step += 1) {
    await setImmediate()
    t.mock.timers.tick(250)
  }
  assert.ok(completion, 'The finite budget must settle rather than leave background work alive')
  await run
  if (completion.error) throw completion.error
  return { jobs: completion.jobs, requests, elapsedMs: Date.now() - startedAt }
}

test('implicit Workday detail budget accounts for the current paced workload instead of dropping a large inventory tail', async t => {
  const { jobs, requests } = await exercise(t)
  assert.equal(jobs.length, 192)
  assert.equal(jobs.filter(job => job.jobDescription).length, 192)
  assert.equal(requests.length, 192)
  assert.ok(jobs.every(job => job.sourceDetailComplete === true && !job.sourceDetailFailureKind))
})

test('explicit zero detail budget remains zero and marks missing details independently of complete enumeration', async t => {
  const { jobs, requests } = await exercise(t, { count: 8, detailEnrichmentBudgetMs: 0 })
  assert.equal(requests.length, 0)
  assert.equal(jobs.length, 8)
  assert.ok(jobs.every(job => job.sourceDetailComplete === false && job.sourceDetailFailureKind === 'budget-exhausted'))
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.status, 'complete-inventory')
  assert.equal(evidence.listingComplete, true)
  assert.equal(evidence.reportedTotal, 8)
})

test('explicit short detail budget is not silently extended for a larger workload', async t => {
  const { jobs } = await exercise(t, { detailEnrichmentBudgetMs: 1000 })
  assert.ok(jobs.some(job => job.sourceDetailComplete === true))
  assert.ok(jobs.some(job => job.sourceDetailComplete === false && job.sourceDetailFailureKind === 'budget-exhausted'))
})

test('an explicit detail budget above the implicit cap is not silently reduced', async t => {
  const { jobs, requests } = await exercise(t, { count: 500, detailEnrichmentBudgetMs: 160000 })
  assert.equal(requests.length, 500)
  assert.ok(jobs.every(job => job.sourceDetailComplete === true))
})

test('local source zero budget takes precedence over an environment budget', async t => {
  const previous = process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS
  process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS = '120000'
  t.after(() => {
    if (previous === undefined) delete process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS
    else process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS = previous
  })
  const { jobs, requests } = await exercise(t, {
    count: 8, scraperDir: fileURLToPath(new URL('./fixtures/workday-zero-detail-budget', import.meta.url)),
  })
  assert.equal(requests.length, 0)
  assert.ok(jobs.every(job => job.sourceDetailFailureKind === 'budget-exhausted'))
})

test('environment zero budget remains an explicit limit when the source has no override', async t => {
  const previous = process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS
  process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS = '0'
  t.after(() => {
    if (previous === undefined) delete process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS
    else process.env.WORKDAY_DETAIL_ENRICHMENT_BUDGET_MS = previous
  })
  const { jobs, requests } = await exercise(t, { count: 8 })
  assert.equal(requests.length, 0)
  assert.ok(jobs.every(job => job.sourceDetailFailureKind === 'budget-exhausted'))
})

test('adaptive detail budget remains capped for an inventory that exceeds the finite default allowance', async t => {
  const { jobs, elapsedMs } = await exercise(t, { count: 800 })
  assert.equal(jobs.length, 800)
  assert.ok(jobs.some(job => job.sourceDetailComplete === true))
  assert.ok(jobs.some(job => job.sourceDetailComplete === false && job.sourceDetailFailureKind === 'budget-exhausted'))
  assert.ok(elapsedMs < 160000, 'Pacing allowance must not grow without a finite source-work cap')
  assert.equal(readInventoryEvidence(jobs).listingComplete, true)
})

test('upstream detail failures remain distinct from budget exhaustion, including skipped follow-on rows', async t => {
  const { jobs } = await exercise(t, { count: 8, mode: 'upstream' })
  assert.ok(jobs.every(job => !job.jobDescription && job.sourceDetailComplete === false))
  assert.ok(jobs.every(job => job.sourceDetailFailureKind === 'upstream'))
  assert.equal(readInventoryEvidence(jobs).listingComplete, true)
})

test('HTTP-successful native and HTML pages without a description report missing content', async t => {
  const { jobs } = await exercise(t, { count: 3, mode: 'missing-content' })
  assert.ok(jobs.every(job => !job.jobDescription && job.sourceDetailComplete === false))
  assert.ok(jobs.every(job => job.sourceDetailFailureKind === 'missing-content'))
})

test('required country resolution and its cached native descriptions remain outside an explicit zero optional budget', async t => {
  const { jobs, requests } = await exercise(t, { count: 3, grouped: true, detailEnrichmentBudgetMs: 0 })
  assert.equal(requests.length, 3)
  assert.ok(jobs.every(job => job.sourceDetailComplete === true && job.jobDescription))
  assert.ok(jobs.every(job => job.location === 'Bangalore, India'))
})

test('caller cancellation still stops an implicitly extended detail phase', async t => {
  const controller = new AbortController()
  const reason = new Error('caller source deadline')
  // Set the timer after exercise enables mocked timers, before its next tick.
  const pending = exercise(t, { count: 192, signal: controller.signal })
  setTimeout(() => controller.abort(reason), 10000)
  await assert.rejects(pending, error => error === reason)
})

