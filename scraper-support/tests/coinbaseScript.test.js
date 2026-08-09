import assert from 'node:assert/strict'
import test from 'node:test'

const loadCoinbaseModule = async () => {
  try {
    return await import('../../scraper/coinbase/script.js')
  } catch {
    assert.fail('Expected Coinbase scraper module at ../../scraper/coinbase/script.js')
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
          <p>Bengaluru, Karnataka, India</p>
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
      <p>Bengaluru, Karnataka, India</p>
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

const currentDetailHtml = `
<!doctype html>
<html lang="en-in">
  <head>
    <title>Capacity Planning Lead, Hybrid - Bangalore, India - Coinbase</title>
  </head>
  <body>
    <main>
      <a href="/careers/positions"><span>Back to jobs</span></a>
      <h1>Capacity Planning Lead</h1>
      <div>
        <span>Hybrid - Bangalore, India</span>
        <span>Job ID#: P77108</span>
      </div>
      <a href="https://job-boards.greenhouse.io/embed/job_app?token=8013889&amp;for=coinbase" rel="noopener noreferrer" target="_blank">
        <span><span>Apply now</span></span>
      </a>
      <div>
        <p>Build staffing models and translate operational data into workforce plans.</p>
      </div>
      <p>Position ID: P77113</p>
    </main>
  </body>
</html>
`

const currentCareersShellHtml = `
<!doctype html>
<html lang="en-in">
  <head>
    <title>Positions - Careers - Coinbase</title>
  </head>
  <body>
    <main>
      <h1>Open positions</h1>
      <div data-testid="positions-department">
        <h2><button>Machine Learning</button></h2>
        <div>
          <div>
            <a href="/careers/positions/8070386">
              <span><p>Associate, Financial Services Partnerships</p></span>
            </a>
            <p>Hybrid - Bangalore, India</p>
          </div>
          <div>
            <a href="/careers/positions/7994498">
              <span><p>Engineering Manager - Customer Experience AI</p></span>
            </a>
            <p>Remote - India</p>
          </div>
          <div>
            <a href="/careers/positions/7000001">
              <span><p>Compliance Manager</p></span>
            </a>
            <p>London, United Kingdom</p>
          </div>
        </div>
      </div>
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
      location: 'Bengaluru, Karnataka, India',
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
    location: 'Bengaluru, Karnataka, India',
    city: 'Bangalore',
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
    remoteStatus: 'On-site',
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

test('Coinbase extracts the current first-party detail layout with span-based location and embedded Greenhouse apply flow', async () => {
  const coinbase = await loadCoinbaseModule()

  const jobs = await coinbase.createCoinbaseScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      if (url === coinbase.CAREERS_URL) return currentCareersShellHtml
      if (url === 'https://www.coinbase.com/careers/positions/8070386') return currentDetailHtml
      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Capacity Planning Lead',
    company: 'Coinbase',
    location: 'Hybrid - Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    link: 'https://www.coinbase.com/careers/positions/8070386',
    applyUrl: 'https://www.coinbase.com/careers/positions/8070386',
    sourceUrl: 'https://www.coinbase.com/careers/positions/8070386',
    source: 'coinbase',
    jobId: 8070386,
    requisitionId: 'P77108',
    department: null,
    employmentType: null,
    experienceRequired: null,
    jobDescription: jobs[0].jobDescription,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    remoteStatus: 'Hybrid',
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.match(jobs[0].jobDescription, /Build staffing models/i)
})

test('Coinbase falls back to browser-backed pages when direct requests return 403', async () => {
  const coinbase = await loadCoinbaseModule()
  const browserUrls = []

  const jobs = await coinbase.createCoinbaseScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      throw new Error(`HTTP 403 for ${url}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)

      if (url === coinbase.CAREERS_URL) return officialCareersHtml
      if (url === 'https://www.coinbase.com/careers/positions/7739592') return firstDetailHtml
      if (url === 'https://www.coinbase.com/careers/positions/7654321') return secondDetailHtml

      throw new Error(`Unexpected browser page URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(browserUrls, [
    coinbase.CAREERS_URL,
    'https://www.coinbase.com/careers/positions/7739592',
    'https://www.coinbase.com/careers/positions/7654321',
  ])
})

test('Coinbase extracts India roles from the current first-party card layout with sibling location labels', async () => {
  const coinbase = await loadCoinbaseModule()

  assert.equal(coinbase.hasOfficialCareersSignal(currentCareersShellHtml), true)
  assert.deepEqual(coinbase.extractIndiaJobCardsFromCareersPage(currentCareersShellHtml), [
    {
      title: 'Associate, Financial Services Partnerships',
      location: 'Hybrid - Bangalore, India',
      department: null,
      sourceUrl: 'https://www.coinbase.com/careers/positions/8070386',
      jobId: 8070386,
    },
  ])
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
            'https://www.coinbase.com/careers/positions/7654321?utm_source=careers',
            'https://job-boards.greenhouse.io/coinbase/jobs/7654321',
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
