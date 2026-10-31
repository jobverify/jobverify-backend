import assert from 'node:assert/strict'
import test from 'node:test'
import { createCatalogScraper, getScraperCatalog } from '../providers/index.js'
import { readInventoryEvidence, isFreshCompleteInventoryEvidence } from '../utils/inventoryEvidence.js'
import { createPrefectScraper } from '../../scraper/prefect/script.js'
import { createAshbyApiScraper } from '../utils/ashbyApi.js'

const catalog = getScraperCatalog()
const sources = ['zapier', 'sisense', 'cartesia', 'certifyos', 'ema', 'prefect']
const prefectPage = '<h1>We are Prefect</h1><p>Defining automation for the context era</p><h2>Join the team defining the future of workflow automation</h2><a href="https://jobs.ashbyhq.com/prefect">Careers</a>'
const row = (board, id = 'native-role', location = 'Bengaluru, India', country = 'India') => ({
  id, title: 'Software Engineer', isListed: true, location,
  address: { postalAddress: { addressCountry: country, addressLocality: country === 'India' ? 'Bengaluru' : 'Boston' } },
  jobUrl: `https://jobs.ashbyhq.com/${board}/${id}`,
  applyUrl: `https://jobs.ashbyhq.com/${board}/${id}/application`,
  descriptionHtml: '<p>Build employer production services.</p>',
  descriptionPlain: 'Build employer production services.',
})

for (const source of sources) {
  // Zapier now has independent current-corporate/public-role source tests.
  // Retain these original synthetic payloads as unchanged shared API controls.
  const adapter = () => source === 'zapier' ? createAshbyApiScraper({ source, companyName: 'Zapier',
    ashbyJobBoardUrl: 'https://api.ashbyhq.com/posting-api/job-board/zapier' }) : createCatalogScraper(catalog.find(p => p.source === source))
  const label = source === 'zapier' ? 'zapier shared API compatibility' : source
  const run = (payload, options = {}) => adapter().run({
    fetchText: async () => prefectPage,
    fetchJson: async url => {
      assert.equal(url, `https://api.ashbyhq.com/posting-api/job-board/${source}`)
      return structuredClone(payload)
    }, ...options,
  })

  test(`${label} retains complete native Ashby inventory through its adapter decoration`, async () => {
    const jobs = await run({ apiVersion: '1', jobs: [row(source), row(source, 'foreign-role', 'Boston, United States', 'US')] })
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].jobId, 'native-role')
    assert.equal(jobs[0].source, source)
    assert.equal(readInventoryEvidence(jobs)?.reportedTotal, 2)
    assert.equal(readInventoryEvidence(jobs)?.indiaFacetCount, 1)
    assert.equal(isFreshCompleteInventoryEvidence(readInventoryEvidence(jobs)), true)
  })

  test(`${label} checked foreign-only and globally empty Ashby feeds remain distinct`, async () => {
    for (const [records, status] of [[[], 'verified-empty'], [[row(source, 'foreign-role', 'Boston, United States', 'US')], 'complete-inventory']]) {
      const jobs = await run({ apiVersion: '1', jobs: records })
      assert.equal(jobs.length, 0)
      assert.equal(readInventoryEvidence(jobs)?.status, status)
      assert.equal(isFreshCompleteInventoryEvidence(readInventoryEvidence(jobs)), true)
    }
  })

  test(`${label} includes a proven secondary India location without relabeling the foreign primary`, async () => {
    const record = row(source, 'secondary-role', 'Boston, United States', 'US')
    record.secondaryLocations = [{ location: 'Kochi, India', address: { addressCountry: 'India', addressLocality: 'Kochi' } }]
    const jobs = await run({ apiVersion: '1', jobs: [record] })
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].location, 'Kochi, India')
    assert.equal(jobs[0].country, 'India')
    assert.equal(isFreshCompleteInventoryEvidence(readInventoryEvidence(jobs)), true)
  })

  test(`${label} unknown native location and missing descriptions cannot authorize cleanup`, async () => {
    for (const record of [row(source, 'unlocated', 'Remote', ''),
      { ...row(source), descriptionHtml: '', descriptionPlain: '' }]) {
      const jobs = await run({ apiVersion: '1', jobs: [record] })
      assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
      assert.ok(jobs.every(job => job.sourceListingComplete === false))
    }
  })

  test(`${label} native errors, unsupported schemas and foreign employer roles fail before persistence`, async () => {
    for (const payload of [{ apiVersion: '1', jobs: [], error: 'denied' }, {},
      { apiVersion: '2', jobs: [] }, { apiVersion: '1', jobs: [row('other-employer')] },
      { apiVersion: '1', jobs: [row(source), row(source)] }]) {
      await assert.rejects(run(payload), /inventory|identity|schema|board|listing|payload/i)
    }
  })

  test(`${label} cancellation before a native fetch is propagated`, async () => {
    const reason = new Error('source cancelled')
    await assert.rejects(run({ apiVersion: '1', jobs: [] }, { signal: AbortSignal.abort(reason),
      fetchJson: async () => assert.fail('fetch after cancellation'),
    }), error => error === reason)
  })
}

test('Ashby preserves native plain content when the HTML variant contains only empty markup', async () => {
  const jobs = await createAshbyApiScraper({ source: 'zapier', companyName: 'Zapier',
    ashbyJobBoardUrl: 'https://api.ashbyhq.com/posting-api/job-board/zapier' }).run({
    fetchJson: async () => ({ apiVersion: '1', jobs: [{ ...row('zapier'),
      descriptionHtml: '<p>&nbsp;</p>', descriptionPlain: 'Actual native employer responsibilities.',
    }] }),
  })
  assert.equal(jobs[0].jobDescription, 'Actual native employer responsibilities.')
  assert.equal(readInventoryEvidence(jobs).listingComplete, true)
})

test('Prefect job limits retain fetched counts while preventing complete-inventory cleanup', async () => {
  for (const maxJobs of [0, 1]) {
    const jobs = await createPrefectScraper({ maxJobs }).run({ fetchText: async () => prefectPage,
      fetchJson: async () => ({ apiVersion: '1', jobs: [row('prefect', 'one'), row('prefect', 'two')] }),
    })
    assert.equal(jobs.length, maxJobs)
    assert.equal(readInventoryEvidence(jobs)?.reportedTotal, 2)
    assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
    assert.ok(jobs.every(job => job.sourceListingComplete === false))
  }
})

test('Prefect script-only board references cannot establish current employer delegation', async () => {
  const page = prefectPage.replace('<a href="https://jobs.ashbyhq.com/prefect">Careers</a>',
    '<a href="/careers">Careers</a><script>const board="https://jobs.ashbyhq.com/prefect"</script>')
  const careers = '<title>Careers at Prefect - Open Roles</title><h1>Join the team defining the future of workflow automation</h1><p>We\'re remote first and have carefully created a supportive, high-performance culture.</p><h2>Open roles</h2><link rel="stylesheet" href="https://www.prefect.io/ashby-job-board.css">'
  const jobs = await createPrefectScraper().run({
    fetchText: async url => url.endsWith('/company') ? page : careers,
    fetchJson: async () => ({ apiVersion: '1', jobs: [] }),
  })
  assert.equal(readInventoryEvidence(jobs)?.listingComplete, false)
  assert.match(readInventoryEvidence(jobs)?.reason || '', /scope|binding|delegation/i)
})

test('Prefect retains employer experience and work arrangement when validating the native feed', async () => {
  const jobs = await createPrefectScraper().run({ fetchText: async () => prefectPage,
    fetchJson: async () => ({ apiVersion: '1', jobs: [{ ...row('prefect'), workplaceType: 'Hybrid',
      descriptionHtml: '<p>Minimum 5 years of software engineering experience.</p>',
      descriptionPlain: 'Minimum 5 years of software engineering experience.',
    }] }),
  })
  assert.equal(jobs[0].experienceRequired, '5+ years')
  assert.equal(jobs[0].remoteStatus, 'Hybrid')
})

test('the effective Sisense provider describes the Ashby endpoint actually used by its scraper', () => {
  const provider = catalog.find(p => p.source === 'sisense')
  assert.equal(provider.atsPlatform, 'ashby-job-board-api')
  assert.equal(provider.paginationStrategy, 'single-ashby-job-board-feed')
})

test('Prefect advertised native role identities cannot coexist with authoritative empty inventory', async () => {
  const jobs = await createPrefectScraper().run({ fetchText: async () => prefectPage.replace('/prefect"', '/prefect/role-1"'),
    fetchJson: async () => ({ apiVersion: '1', jobs: [] }),
  })
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
})

test('Sisense retains experience extracted from the native employer description', async () => {
  const jobs = await createCatalogScraper(catalog.find(p => p.source === 'sisense')).run({
    fetchJson: async () => ({ apiVersion: '1', jobs: [{ ...row('sisense'),
      descriptionHtml: '<p>Minimum 5 years of software engineering experience.</p>',
    }] }),
  })
  assert.equal(jobs[0].experienceRequired, '5+ years')
})

test('Sisense forwards caller cancellation to the actual native fetch', async t => {
  const controller = new AbortController(), reason = new Error('cancel native Sisense fetch')
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    controller.abort(reason)
    assert.equal(options.signal.aborted, true)
    return Response.json({ apiVersion: '1', jobs: [] })
  })
  await assert.rejects(createCatalogScraper(catalog.find(p => p.source === 'sisense')).run({ signal: controller.signal }), error => error === reason)
})

test('shared Ashby API compatibility retains the actual unresolved-native-scope diagnostic', async () => {
  const jobs = await createAshbyApiScraper({ source: 'zapier', companyName: 'Zapier',
    ashbyJobBoardUrl: 'https://api.ashbyhq.com/posting-api/job-board/zapier' }).run({
    fetchJson: async () => ({ apiVersion: '1', jobs: [row('zapier'), row('zapier', 'unknown', 'Worldwide', '')] }),
  })
  assert.equal(jobs.length, 1)
  assert.equal(readInventoryEvidence(jobs).listingComplete, false)
  assert.match(readInventoryEvidence(jobs).reason, /native-location-scope-unresolved/)
})
