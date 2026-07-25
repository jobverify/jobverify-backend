import assert from 'node:assert/strict'
import test from 'node:test'

const loadCoinbaseModule = async () => {
  try {
    return await import('../coinbase/script.js')
  } catch {
    assert.fail('Expected Coinbase scraper module at ../coinbase/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Positions - Careers - Coinbase</title>
  </head>
  <body>
    <main>
      <h1>Open positions</h1>
      <p>Submit a general application</p>

      <section>
        <h2>Enterprise Applications</h2>
        <a href="/careers/positions/7739592">
          <h3>Senior Machine Learning Engineer (Platform)</h3>
          <p>Remote - India</p>
        </a>
        <a href="https://www.coinbase.com/careers/positions/7654321?utm_source=careers">
          <h3>Software Engineer, Backend (Consumer Product)</h3>
          <p>Hyderabad, Telangana, India</p>
        </a>
      </section>

      <section>
        <h2>Finance</h2>
        <a href="/careers/positions/7000001">
          <h3>Compliance Manager</h3>
          <p>London, United Kingdom</p>
        </a>
      </section>
    </main>
  </body>
</html>
`

const firstDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior Machine Learning Engineer (Platform) - Careers - Coinbase</title>
  </head>
  <body>
    <main>
      <a href="/careers/positions">Back to jobs</a>
      <h1>Senior Machine Learning Engineer (Platform)</h1>
      <p>Remote - India</p>
      <a href="https://job-boards.greenhouse.io/coinbase/jobs/7739592">Apply now</a>
      <section data-role="job-description">
        <p>Build ML systems that power trusted crypto experiences.</p>
        <ul>
          <li>Own production ML pipelines.</li>
        </ul>
      </section>
      <div><span>Job ID#:</span><span>P76476</span></div>
    </main>
  </body>
</html>
`

const secondDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Software Engineer, Backend (Consumer Product) - Careers - Coinbase</title>
  </head>
  <body>
    <main>
      <a href="/careers/positions">Back to jobs</a>
      <h1>Software Engineer, Backend (Consumer Product)</h1>
      <p>Hyderabad, Telangana, India</p>
      <a href="https://job-boards.greenhouse.io/coinbase/jobs/7654321">Apply now</a>
      <section data-role="job-description">
        <p>Ship backend services for retail product experiences.</p>
      </section>
      <div><span>Job ID#:</span><span>P76543</span></div>
    </main>
  </body>
</html>
`

test('Coinbase constants stay pinned to the verified first-party careers page and positions detail URLs', async () => {
  const coinbase = await loadCoinbaseModule()

  assert.equal(coinbase.SOURCE, 'coinbase')
  assert.equal(coinbase.COMPANY, 'Coinbase')
  assert.equal(coinbase.CAREERS_URL, 'https://www.coinbase.com/careers/positions')
  assert.equal(coinbase.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    coinbase.normalizeCoinbaseJobUrl('https://www.coinbase.com/careers/positions/7654321?utm_source=careers'),
    'https://www.coinbase.com/careers/positions/7654321',
  )

  assert.deepEqual(coinbase.extractIndiaJobCardsFromCareersPage(officialCareersHtml), [
    {
      title: 'Senior Machine Learning Engineer (Platform)',
      location: 'Remote - India',
      department: 'Enterprise Applications',
      sourceUrl: 'https://www.coinbase.com/careers/positions/7739592',
      jobId: 7739592,
    },
    {
      title: 'Software Engineer, Backend (Consumer Product)',
      location: 'Hyderabad, Telangana, India',
      department: 'Enterprise Applications',
      sourceUrl: 'https://www.coinbase.com/careers/positions/7654321',
      jobId: 7654321,
    },
  ])
})

test('Coinbase run keeps India roles, hydrates first-party detail pages, and preserves Coinbase detail URLs', async () => {
  const coinbase = await loadCoinbaseModule()
  const requestedPages = []

  const jobs = await coinbase.createCoinbaseScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requestedPages.push(url)

      if (url === coinbase.CAREERS_URL) return officialCareersHtml
      if (url === 'https://www.coinbase.com/careers/positions/7739592') return firstDetailHtml
      if (url === 'https://www.coinbase.com/careers/positions/7654321') return secondDetailHtml

      throw new Error(`Unexpected page URL: ${url}`)
    },
    now: () => '2026-07-14T00:00:00.000Z',
  })

  assert.deepEqual(requestedPages, [
    coinbase.CAREERS_URL,
    'https://www.coinbase.com/careers/positions/7739592',
    'https://www.coinbase.com/careers/positions/7654321',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior Machine Learning Engineer (Platform)',
    company: 'Coinbase',
    location: 'Remote - India',
    city: 'Remote',
    country: 'India',
    link: 'https://www.coinbase.com/careers/positions/7739592',
    applyUrl: 'https://www.coinbase.com/careers/positions/7739592',
    sourceUrl: 'https://www.coinbase.com/careers/positions/7739592',
    source: 'coinbase',
    jobId: 7739592,
    requisitionId: 'P76476',
    department: 'Enterprise Applications',
    employmentType: null,
    experienceRequired: null,
    jobDescription: jobs[0].jobDescription,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    remoteStatus: 'Remote',
    scrapedAt: '2026-07-14T00:00:00.000Z',
  })
  assert.match(jobs[0].jobDescription, /Build ML systems that power trusted crypto experiences/i)
  assert.match(jobs[0].jobDescription, /Own production ML pipelines/i)

  assert.deepEqual(jobs[1], {
    title: 'Software Engineer, Backend (Consumer Product)',
    company: 'Coinbase',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    country: 'India',
    link: 'https://www.coinbase.com/careers/positions/7654321',
    applyUrl: 'https://www.coinbase.com/careers/positions/7654321',
    sourceUrl: 'https://www.coinbase.com/careers/positions/7654321',
    source: 'coinbase',
    jobId: 7654321,
    requisitionId: 'P76543',
    department: 'Enterprise Applications',
    employmentType: null,
    experienceRequired: null,
    jobDescription: jobs[1].jobDescription,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    remoteStatus: 'On-site',
    scrapedAt: '2026-07-14T00:00:00.000Z',
  })
  assert.match(jobs[1].jobDescription, /Ship backend services for retail product experiences/i)
})

test('Coinbase fails closed when the verified careers surface or detail-page contract changes', async () => {
  const coinbase = await loadCoinbaseModule()

  await assert.rejects(
    coinbase.createCoinbaseScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified official coinbase careers surface/i,
  )

  await assert.rejects(
    coinbase.createCoinbaseScraper().run({
      fetchText: async (url) => {
        if (url === coinbase.CAREERS_URL) {
          return officialCareersHtml.replace(
            '/careers/positions/7739592',
            'https://job-boards.greenhouse.io/coinbase/jobs/7739592',
          )
        }

        return firstDetailHtml
      },
    }),
    /verified first-party coinbase detail urls/i,
  )

  await assert.rejects(
    coinbase.createCoinbaseScraper({ maxJobs: 1 }).run({
      fetchText: async (url) => {
        if (url === coinbase.CAREERS_URL) return officialCareersHtml
        return firstDetailHtml.replace('Job ID#:', 'Req #:')
      },
    }),
    /verified first-party coinbase job detail contract/i,
  )
})
