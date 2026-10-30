import assert from 'node:assert/strict'
import test from 'node:test'
import { getScraperCatalog, createCatalogScraper } from '../providers/index.js'
import { isFreshCompleteInventoryEvidence, readInventoryEvidence } from '../utils/inventoryEvidence.js'
import { createDataikuScraper } from '../../scraper/dataiku/script.js'

const catalog = getScraperCatalog()
const careersHtml = {
  sigmacomputing: '<title>Careers and Open Positions | Sigma</title><h1>Careers at Sigma</h1><button>View open positions</button><a href="https://job-boards.greenhouse.io/sigmacomputing/jobs/1">Roles</a>',
  buildkite: '<title>Work at Buildkite | Remote-first careers | Buildkite</title><h1>Work at Buildkite</h1><h2>Open roles</h2><p>Join our talent community</p><a href="https://job-boards.greenhouse.io/buildkite-talent-community">Talent community</a>',
}
const record = (board, id, location = 'Bengaluru, India') => ({
  id, internal_job_id: id + 100, title: 'Software Engineer', location: { name: location },
  absolute_url: `https://job-boards.greenhouse.io/${board}/jobs/${id}`,
  content: '<p>Build employer production services.</p>',
})

for (const source of ['tripadvisor', 'dataiku', 'sigmacomputing', 'buildkite']) {
  // Dataiku's registered adapter now requires real HTTP response metadata and
  // opening/closing employer proof. Its separate registered fixture suite
  // covers that path; these synthetic payload cases retain coverage of the
  // exported payload mapper and shared source-evidence validation.
  const provider = catalog.find(p => p.source === source)
  const scraper = source === 'dataiku' ? createDataikuScraper() : createCatalogScraper(provider)
  const run = payload => scraper.run({
    fetchJson: async () => structuredClone(payload), fetchText: async () => careersHtml[source],
  })

  test(`${source} retains current inventory evidence through ${source === 'dataiku' ? 'shared native mapping' : 'registered source decoration'}`, async () => {
    const jobs = await run({ jobs: [record(source, 1)], meta: { total: 1 } })
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].source, source)
    assert.equal(isFreshCompleteInventoryEvidence(readInventoryEvidence(jobs)), true)
    assert.equal(readInventoryEvidence(jobs).reportedTotal, 1)
  })

  test(`${source} validates complete zero-India inventory instead of returning an unexplained empty array`, async () => {
    const jobs = await run({ jobs: [record(source, 1, 'Boston, United States')], meta: { total: 1 } })
    assert.equal(jobs.length, 0)
    assert.equal(readInventoryEvidence(jobs)?.status, 'complete-inventory')
    assert.equal(readInventoryEvidence(jobs)?.indiaFacetCount, 0)
  })

  test(`${source} explicit empty native inventory has fresh verified-empty evidence`, async () => {
    const jobs = await run({ jobs: [], meta: { total: 0 } })
    // Sigma's official fixture still advertises role 1, which contradicts an empty feed.
    assert.equal(readInventoryEvidence(jobs)?.status, source === 'sigmacomputing' ? 'discovery-only' : 'verified-empty')
    assert.equal(isFreshCompleteInventoryEvidence(readInventoryEvidence(jobs)), source !== 'sigmacomputing')
  })

  test(`${source} missing or truncated totals and missing descriptions remain incomplete`, async () => {
    for (const payload of [{ jobs: [] }, { jobs: [record(source, 1)], meta: { total: 2 } },
      { jobs: [{ ...record(source, 1), content: '' }], meta: { total: 1 } }]) {
      const jobs = await run(payload)
      assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
      assert.ok(jobs.every(job => job.sourceListingComplete === false))
    }
  })

  test(`${source} upstream errors and invalid listing envelopes never become verified empty`, async () => {
    for (const payload of [{ error: 'denied', jobs: [], meta: { total: 0 } }, {}, { jobs: null }]) {
      await assert.rejects(run(payload), /inventory|listing|payload/i)
    }
  })

  test(`${source} foreign employer and mismatched role URLs are rejected`, async () => {
    for (const [absolute_url, expectedError] of [
      ['https://job-boards.greenhouse.io/other/jobs/1', /foreign native posting account|identity|board|URL|detail route/i],
      [`https://job-boards.greenhouse.io/${source}/jobs/999`, /identity|board|URL|detail route/i],
    ]) {
      await assert.rejects(run({ jobs: [{ ...record(source, 1), absolute_url }], meta: { total: 1 } }), expectedError)
    }
  })

  test(`${source} accepts employer-hosted Greenhouse URLs only with the matching native gh_jid`, async () => {
    const official = new URL(catalog.find(p => p.source === source).companyCareerPage)
    const absolute_url = `${official.origin}/careers/detail/?gh_jid=1`
    const jobs = await run({ jobs: [{ ...record(source, 1), absolute_url }], meta: { total: 1 } })
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].applyUrl, absolute_url)
    assert.equal(readInventoryEvidence(jobs).listingComplete, true)
    for (const badUrl of [`${official.origin}/careers/detail/?gh_jid=999`,
      `${official.origin}/careers/detail/?gh_jid=1&gh_jid=999`,
      'https://unrelated.example/careers/detail/?gh_jid=1']) {
      await assert.rejects(run({ jobs: [{ ...record(source, 1), absolute_url: badUrl }], meta: { total: 1 } }), /identity|board|URL|detail route/i)
    }
  })

  test(`${source} duplicate native IDs cannot establish complete inventory`, async () => {
    const jobs = await run({ jobs: [record(source, 1), record(source, 1)], meta: { total: 2 } })
    assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
  })

  test(`${source} unresolved remote locations cannot establish zero India inventory`, async () => {
    const jobs = await run({ jobs: [record(source, 1, 'Remote')], meta: { total: 1 } })
    assert.equal(jobs.length, 0)
    assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
    assert.equal(readInventoryEvidence(jobs)?.indiaFacetCount, null)
  })

  test(`${source} maps an India role from native posting locations when the primary field is a work mode`, async () => {
    const jobs = await run({ jobs: [{ ...record(source, 1, 'Hybrid'),
      metadata: [{ name: 'Job Posting Location', value: ['Bengaluru, India'] }],
      offices: [{ name: 'Remote India', location: null }],
    }], meta: { total: 1 } })
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].location, 'Bengaluru, India')
    assert.equal(readInventoryEvidence(jobs).listingComplete, true)
    assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 1)
  })

  test(`${source} retains metadata-only India geography without an office fallback`, async () => {
    for (const name of ['Location', 'Job Posting Location', 'Country']) {
      const jobs = await run({ jobs: [{ ...record(source, 1, 'Hybrid'),
        metadata: [{ name, value: name === 'Country' ? 'India' : ['Bengaluru, India'] }],
      }], meta: { total: 1 } })
      assert.equal(jobs.length, 1, name)
      assert.match(jobs[0].location, /India/, name)
      assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 1, name)
    }
  })

  test(`${source} geographical metadata cannot disappear into a complete foreign-only zero`, async () => {
    const jobs = await run({ jobs: [{ ...record(source, 1, 'Boston, United States'),
      metadata: [{ name: 'Location', value: 'Bengaluru, India' }],
    }], meta: { total: 1 } })
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].location, 'Bengaluru, India')
  })

  test(`${source} a single native country contradicting geographic location fails closed`, async () => {
    await assert.rejects(run({ jobs: [{ ...record(source, 1, 'Boston, United States'),
      metadata: [{ name: 'Country', value: 'India' }],
    }], meta: { total: 1 } }), /contradictory country\/location/i)
  })

  test(`${source} unhandled geographic metadata cannot become authoritative zero India inventory`, async () => {
    const jobs = await run({ jobs: [{ ...record(source, 1, 'Boston, United States'),
      metadata: [{ name: 'Work Region', value: 'India' }],
    }], meta: { total: 1 } })
    assert.equal(readInventoryEvidence(jobs).listingComplete, false)
    assert.equal(readInventoryEvidence(jobs).indiaFacetCount, null)
  })
}

test('Sigma advertised native role identities must reconcile before empty inventory can authorize cleanup', async () => {
  const jobs = await createCatalogScraper(catalog.find(p => p.source === 'sigmacomputing')).run({
    fetchText: async () => careersHtml.sigmacomputing,
    fetchJson: async () => ({ jobs: [], meta: { total: 0 } }),
  })
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.match(readInventoryEvidence(jobs).reason, /role.*reconcil|reconcil.*role/i)
})

test('Tripadvisor does not treat Indiana or Indianapolis as India', async () => {
  const provider = catalog.find(p => p.source === 'tripadvisor')
  const jobs = await createCatalogScraper(provider).run({ fetchJson: async () => ({
    jobs: [record('tripadvisor', 1, 'Indiana, United States'),
      { ...record('tripadvisor', 2, 'Indianapolis, United States'), metadata: [{ name: 'Country', value: 'United States' }] }],
    meta: { total: 2 },
  }) })
  assert.equal(jobs.length, 0)
  assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 0)
  assert.equal(readInventoryEvidence(jobs).listingComplete, true)
})
