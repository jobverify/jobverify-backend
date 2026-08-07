import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-04T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at PrimeSoft | Shape the Future of Work with AI &amp; IT</title>
    <link rel="canonical" href="https://primesoft.net/careers/" />
  </head>
  <body>
    <main>
      <h1>Careers at PrimeSoft</h1>
      <section>
        <h2>Canada</h2>
        <a href="https://primesoft.net/jobs/sr-software-engineering/">Software Test Engineering Manager</a>
      </section>
      <section>
        <h2>India</h2>
        <h5><span>For all India open positions click the link below</span></h5>
        <a href="https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs">View India Openings</a>
        <p>jobs@primesoft.net (India)</p>
      </section>
    </main>
  </body>
</html>
`

const loadPrimesoftEnterpriseModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Primesoft Enterprise scraper module at ./script.js')
  }
}

test('Primesoft Enterprise pins the live first-party careers page and official Darwinbox handoff', async () => {
  const primesoft = await loadPrimesoftEnterpriseModule()

  assert.equal(primesoft.SOURCE, 'primesoftenterprise')
  assert.equal(primesoft.COMPANY_NAME, 'Primesoft Enterprise')
  assert.equal(primesoft.COMPANY, 'Primesoft Enterprise')
  assert.equal(primesoft.VERIFIED_ON, '2026-08-04')
  assert.equal(primesoft.OFFICIAL_SITE_URL, 'https://primesoft.net/')
  assert.equal(primesoft.OFFICIAL_CAREERS_URL, 'https://primesoft.net/careers/')
  assert.equal(primesoft.DARWINBOX_ORIGIN, 'https://primesoft.darwinbox.in')
  assert.equal(
    primesoft.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    primesoft.PUBLIC_PORTAL_URL,
    'https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(primesoft.hasOfficialPrimesoftCareersSignals(careersHtml), true)
  assert.equal(
    primesoft.extractOfficialDarwinboxUrl(careersHtml),
    'https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
})

test('Primesoft Enterprise validates the first-party careers page before delegating to Darwinbox', async () => {
  const primesoft = await loadPrimesoftEnterpriseModule()
  const requestedUrls = []
  const runCalls = []
  const delegatedJobs = [
    {
      title: 'QA Engineer.',
      company: 'Primesoft Enterprise',
      location: 'Malad Mindspace, Mumbai, Maharashtra , India',
      source: 'primesoftenterprise',
      link: 'https://primesoft.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a6333033cc4e',
    },
  ]

  const scraper = primesoft.createPrimesoftEnterpriseScraper({
    maxJobs: 1,
    now: () => FIXED_SCRAPED_AT,
    darwinboxScraper: {
      run: async (options) => {
        runCalls.push(options)
        return delegatedJobs
      },
    },
  })

  const jobs = await scraper.run({
    maxPages: 2,
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [primesoft.OFFICIAL_CAREERS_URL])
  assert.deepEqual(runCalls, [{ maxPages: 2, maxJobs: 1, fetchListingPage: undefined }])
  assert.deepEqual(jobs, [
    {
      ...delegatedJobs[0],
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Primesoft Enterprise fails closed when the first-party careers page or Darwinbox handoff changes', async () => {
  const primesoft = await loadPrimesoftEnterpriseModule()

  await assert.rejects(
    primesoft.createPrimesoftEnterpriseScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified Primesoft Enterprise careers page/i,
  )

  await assert.rejects(
    primesoft.createPrimesoftEnterpriseScraper().run({
      fetchText: async () => careersHtml.replace(
        'https://primesoft.darwinbox.in/ms/candidatev2/main/careers/allJobs',
        'https://example.com/jobs',
      ),
    }),
    /official Darwinbox handoff/i,
  )
})
