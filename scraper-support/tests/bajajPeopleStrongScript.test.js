import assert from 'node:assert/strict'
import test from 'node:test'

const bajajFinservCompanyHtml = `
<!doctype html>
<html>
  <head>
    <title>Bajaj Finserv About Us</title>
  </head>
  <body>
    <p>Bajaj Finserv serves crores of people, enabling them to meet their life's goals through simple financial solutions.</p>
    <p>Bajaj Finserv is focused on continuous innovation through smart use of technology, data and analytics to drive seamless, simplified and personalized experiences for its customers.</p>
    <a href="https://bflcareers.peoplestrong.com/home">Careers</a>
  </body>
</html>
`

const bajajFinanceCompanyHtml = `
<!doctype html>
<html>
  <head>
    <title>Bajaj Finance - About Us</title>
  </head>
  <body>
    <p>115.40 million customers, digitally via our App & Web, and at 4,052 locations and 241,000 active distribution points across the country.</p>
    <p>A subsidiary of Bajaj Finserv Ltd., Bajaj Finance is a deposit-taking Non-Banking Financial Company (NBFC-D) registered with the Reserve Bank of India (RBI) and classified as an NBFC-Investment and Credit Company (NBFC).</p>
    <a href="https://bflcareers.peoplestrong.com/">Careers</a>
  </body>
</html>
`

const portalShellHtml = `
<!doctype html>
<html>
  <head>
    <title>Candidate Portal</title>
    <script src="main-ABC123.js"></script>
  </head>
  <body>
    <app-root data-testid="src-index-app-root-page-1"></app-root>
    <div>candidate-portal</div>
  </body>
</html>
`

const bajajFinancePayload = {
  totalRecords: 1,
  response: [
    {
      jobTitle: 'Deputy Manager - Business Loans - Indirect',
      organizationUnit: 'Business Loans - Indirect',
      organizationUnitComplete: 'Bajaj Finance Limited>SME>Business Loans - Indirect>Unsecured - East>Sales',
      locationHierarchyComplete: 'India>JHARKHAND>North>Gumla>Gumla>Tier 4',
      jobCode: 'JR00227003',
      employmentType: 'Full Time',
      expRange: '4 to 7 years',
      skills: [],
      jobDescription: 'Drive indirect business loan growth.',
      jobPostedDate: '2026-07-25',
    },
  ],
}

const loadFinservModule = async () => {
  try {
    return await import('../../scraper/bajajfinserv/script.js')
  } catch {
    assert.fail('Expected Bajaj Finserv scraper module at ../../scraper/bajajfinserv/script.js')
  }
}

const loadFinanceModule = async () => {
  try {
    return await import('../../scraper/bajajfinance/script.js')
  } catch {
    assert.fail('Expected Bajaj Finance scraper module at ../../scraper/bajajfinance/script.js')
  }
}

test('Bajaj Finserv accepts the current about-us page and returns empty when the shared PeopleStrong feed only exposes Bajaj Finance jobs', async () => {
  const finserv = await loadFinservModule()

  assert.equal(finserv.DEFAULT_PAGE_SIZE, 99)
  assert.equal(finserv.hasOfficialBajajFinservPageSignal(bajajFinservCompanyHtml), true)

  const requestedApiUrls = []
  const jobs = await finserv.createBajajFinservScraper({
    now: () => '2026-07-25T20:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      if (url === finserv.COMPANY_PAGE_URL) {
        return { status: 200, url: 'https://www.aboutbajajfinserv.com/about-us', html: bajajFinservCompanyHtml }
      }

      if (url === finserv.JOB_LISTINGS_URL) {
        return { status: 200, url, html: portalShellHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedApiUrls.push(url)
      return bajajFinancePayload
    },
  })

  assert.deepEqual(requestedApiUrls, [
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=99',
  ])
  assert.deepEqual(jobs, [])
})

test('Bajaj Finance uses the current finance about-us page, the 99-record PeopleStrong page size, and filters the shared portal to Bajaj Finance jobs', async () => {
  const finance = await loadFinanceModule()

  assert.equal(finance.DEFAULT_PAGE_SIZE, 99)
  assert.equal(finance.hasOfficialBajajFinancePageSignal(bajajFinanceCompanyHtml), true)

  const requestedApiUrls = []
  const jobs = await finance.createBajajFinanceScraper({
    now: () => '2026-07-25T20:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      if (url === finance.COMPANY_PAGE_URL) {
        return { status: 200, url, html: bajajFinanceCompanyHtml }
      }

      if (url === finance.JOB_LISTINGS_URL) {
        return { status: 200, url, html: portalShellHtml }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedApiUrls.push(url)
      return bajajFinancePayload
    },
  })

  assert.deepEqual(requestedApiUrls, [
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=99',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Bajaj Finance')
  assert.equal(jobs[0].jobId, 'JR00227003')
  assert.equal(jobs[0].source, 'bajajfinance')
})
