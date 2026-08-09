import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const officialCompanyPageHtml = `
  <html lang="en">
    <head>
      <title>Bajaj Finance - About Us</title>
    </head>
    <body>
      <nav>
        <a href="https://bflcareers.peoplestrong.com/">Careers</a>
      </nav>
      <main>
        <h1>Bajaj Finance</h1>
        <p>
          We are one of India's leading and most diversified financial services companies, serving
          115.40 million customers.
        </p>
        <p>
          A subsidiary of Bajaj Finserv Ltd., Bajaj Finance is a deposit-taking
          Non-Banking Financial Company.
        </p>
      </main>
    </body>
  </html>
`

const portalShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Candidate Portal</title>
  </head>
  <body class="candidate-portal">
    <app-root data-testid="src-index-app-root-page-1"></app-root>
    <script src="main-ABCD1234.js" type="module"></script>
  </body>
</html>
`

const samplePayload = {
  totalRecords: 1,
  response: [
    {
      organizationUnitComplete: 'Bajaj Finance Limited>Technology>Engineering',
      jobPostedDate: '2026-07-15',
      locationHierarchyComplete: 'India>Maharashtra>Pune>Pune',
      jobDetailUrl: 'https://bflcareers.peoplestrong.com/job/detail/JR00000001',
      designation: 'Software Engineer',
      requisitionId: 1800001,
      jobTitle: 'Software Engineer',
      jobCode: 'JR00000001',
      organizationUnit: 'Engineering',
      jobClosureDate: '2026-08-15',
      locationHierarchy: 'Pune',
      expRange: '3-5 years',
      skills: {
        mustTohave: ['Node.js'],
        goodtohave: ['AWS'],
      },
      employmentTenureType: 'Full Time',
    },
  ],
  messageCode: {
    code: 200,
    messages: 'success',
  },
  campusHiring: 0,
  solrSearch: false,
}

const loadBajajFinanceModule = async () => {
  try {
    return await import('../../scraper/bajajfinance/script.js')
  } catch {
    assert.fail('Expected Bajaj Finance scraper module at ../../scraper/bajajfinance/script.js')
  }
}

const replacePeopleStrongHandoff = (html, replacement) =>
  html.replace(/https:\/\/bflcareers\.peoplestrong\.com\//g, replacement)

test('Bajaj Finance scraper keeps the verified PeopleStrong handoff explicit and pinned to the live public API contract', async () => {
  const bajajFinance = await loadBajajFinanceModule()

  assert.equal(bajajFinance.COMPANY, 'Bajaj Finance')
  assert.equal(bajajFinance.SOURCE, 'bajajfinance')
  assert.equal(
    bajajFinance.COMPANY_PAGE_URL,
    'https://www.aboutbajajfinserv.com/finance-about-us',
  )
  assert.equal(bajajFinance.PORTAL_ORIGIN, 'https://bflcareers.peoplestrong.com')
  assert.equal(bajajFinance.JOB_LISTINGS_URL, 'https://bflcareers.peoplestrong.com/')
  assert.equal(bajajFinance.DEFAULT_PAGE_SIZE, 99)
  assert.equal(
    bajajFinance.buildApiUrl(),
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=99',
  )
  assert.equal(
    bajajFinance.buildApiUrl({ offset: 20, limit: 10 }),
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=20&limit=10',
  )
  assert.equal(
    bajajFinance.buildJobDetailUrl('JR/0001'),
    'https://bflcareers.peoplestrong.com/job/detail/JR%2F0001',
  )
  assert.equal(
    bajajFinance.extractPeopleStrongHandoffUrl(officialCompanyPageHtml),
    'https://bflcareers.peoplestrong.com/',
  )
  assert.equal(bajajFinance.hasOfficialBajajFinancePageSignal(officialCompanyPageHtml), true)
  assert.equal(bajajFinance.hasPublicPortalShell(portalShellHtml), true)
  assert.equal(bajajFinance.buildPublicHeaders().Origin, 'https://bflcareers.peoplestrong.com')
  assert.equal(bajajFinance.buildPublicHeaders().Referer, 'https://bflcareers.peoplestrong.com/')
})

test('extractSearchResults maps public Bajaj Finance PeopleStrong listing fields', async () => {
  const bajajFinance = await loadBajajFinanceModule()
  const jobs = bajajFinance.extractSearchResults(samplePayload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Software Engineer',
    company: 'Bajaj Finance',
    department: 'Engineering',
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    jobId: 'JR00000001',
    requisitionId: '1800001',
    sourceUrl: 'https://bflcareers.peoplestrong.com/job/detail/JR00000001',
    applyUrl: 'https://bflcareers.peoplestrong.com/job/detail/JR00000001',
    employmentType: 'Full Time',
    experienceRequired: '3-5 years',
    publicExperienceChecked: true,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Node.js', 'AWS'],
    postingDate: '2026-07-15',
    closingDate: '2026-08-15',
    jobDescription: null,
  })
})

test('run verifies the known Bajaj Finance handoff before replaying the public PeopleStrong API', async () => {
  const bajajFinance = await loadBajajFinanceModule()
  const pageRequests = []
  const apiRequests = []

  const jobs = await bajajFinance.createBajajFinanceScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === bajajFinance.COMPANY_PAGE_URL) {
        return { status: 200, url, html: officialCompanyPageHtml }
      }

      if (url === bajajFinance.JOB_LISTINGS_URL) {
        return { status: 200, url, html: portalShellHtml }
      }

      throw new Error(`Unexpected Bajaj Finance page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      apiRequests.push({ url, options })
      return samplePayload
    },
  })

  assert.deepEqual(pageRequests, [
    bajajFinance.COMPANY_PAGE_URL,
    bajajFinance.JOB_LISTINGS_URL,
  ])
  assert.equal(apiRequests.length, 1)
  assert.equal(apiRequests[0].url, bajajFinance.buildApiUrl())
  assert.equal(apiRequests[0].options.method, 'POST')
  assert.equal(apiRequests[0].options.body, JSON.stringify(bajajFinance.DEFAULT_SEARCH_BODY))
  assert.equal(apiRequests[0].options.headers.Origin, 'https://bflcareers.peoplestrong.com')
  assert.deepEqual(jobs, [
    {
      title: 'Software Engineer',
      company: 'Bajaj Finance',
      department: 'Engineering',
      location: 'Pune, Maharashtra, India',
      city: 'Pune',
      country: 'India',
      jobId: 'JR00000001',
      requisitionId: '1800001',
      sourceUrl: 'https://bflcareers.peoplestrong.com/job/detail/JR00000001',
      applyUrl: 'https://bflcareers.peoplestrong.com/job/detail/JR00000001',
      employmentType: 'Full Time',
      experienceRequired: '3-5 years',
      publicExperienceChecked: true,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Node.js', 'AWS'],
      postingDate: '2026-07-15',
      closingDate: '2026-08-15',
      jobDescription: null,
      source: 'bajajfinance',
      link: 'https://bflcareers.peoplestrong.com/job/detail/JR00000001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Bajaj Finance default public fetches are bounded by AbortSignals', async () => {
  const bajajFinance = await loadBajajFinanceModule()
  const originalFetch = globalThis.fetch
  const fetchCalls = []

  globalThis.fetch = async (url, options = {}) => {
    fetchCalls.push({ url, options })

    if (url === bajajFinance.COMPANY_PAGE_URL) {
      return {
        ok: true,
        status: 200,
        url,
        text: async () => officialCompanyPageHtml,
      }
    }

    if (url === bajajFinance.JOB_LISTINGS_URL) {
      return {
        ok: true,
        status: 200,
        url,
        text: async () => portalShellHtml,
      }
    }

    if (url === bajajFinance.buildApiUrl()) {
      return {
        ok: true,
        status: 200,
        headers: {
          get: () => 'application/json',
        },
        text: async () => JSON.stringify(samplePayload),
        json: async () => samplePayload,
      }
    }

    throw new Error(`Unexpected Bajaj Finance URL: ${url}`)
  }

  try {
    const jobs = await bajajFinance.createBajajFinanceScraper({
      now: () => FIXED_SCRAPED_AT,
    }).run()

    assert.equal(jobs.length, 1)
    assert.deepEqual(
      fetchCalls.map((call) => call.url),
      [
        bajajFinance.COMPANY_PAGE_URL,
        bajajFinance.JOB_LISTINGS_URL,
        bajajFinance.buildApiUrl(),
      ],
    )
    assert.equal(fetchCalls.every((call) => call.options.signal instanceof AbortSignal), true)
    assert.equal(fetchCalls.every((call) => call.options.signal.aborted === false), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Bajaj Finance scraper fails closed when the verified handoff or public portal shell drifts', async () => {
  const bajajFinance = await loadBajajFinanceModule()

  await assert.rejects(
    bajajFinance.createBajajFinanceScraper().run({
      fetchPage: async (url) => {
        if (url === bajajFinance.COMPANY_PAGE_URL) {
          return {
            status: 200,
            url,
            html: replacePeopleStrongHandoff(
              officialCompanyPageHtml,
              'https://example.com/jobs/',
            ),
          }
        }

        throw new Error(`Unexpected Bajaj Finance page URL: ${url}`)
      },
    }),
    /known PeopleStrong handoff|official Bajaj Finance page/i,
  )

  await assert.rejects(
    bajajFinance.createBajajFinanceScraper().run({
      fetchPage: async (url) => {
        if (url === bajajFinance.COMPANY_PAGE_URL) {
          return { status: 200, url, html: officialCompanyPageHtml }
        }

        if (url === bajajFinance.JOB_LISTINGS_URL) {
          return { status: 200, url, html: '<html><head><title>Placeholder</title></head><body>broken</body></html>' }
        }

        throw new Error(`Unexpected Bajaj Finance page URL: ${url}`)
      },
    }),
    /public PeopleStrong portal/i,
  )
})
