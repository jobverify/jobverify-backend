import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const officialCompanyPageHtml = `
  <html lang="en">
    <head>
      <title>Bajaj Finserv About Us</title>
    </head>
    <body>
      <nav>
        <a href="https://www.aboutbajajfinserv.com/about-us">About Us</a>
        <a href="https://bflcareers.peoplestrong.com/home">Careers</a>
      </nav>
      <main>
        <h1>Bajaj Finserv serves crores of people</h1>
        <p>
          Bajaj Finserv is focused on continuous innovation through smart use of technology, data
          and analytics to drive seamless, simplified and personalized experiences for its
          customers.
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
      organizationUnitComplete: 'Bajaj Finserv Limited>Technology>Engineering',
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

const loadBajajFinservModule = async () => {
  try {
    return await import('../../scraper/bajajfinserv/script.js')
  } catch {
    assert.fail('Expected Bajaj Finserv scraper module at ../../scraper/bajajfinserv/script.js')
  }
}

const replacePeopleStrongHandoff = (html, replacement) =>
  html.replace(/https:\/\/bflcareers\.peoplestrong\.com\/home/g, replacement)

test('Bajaj Finserv scraper keeps the verified PeopleStrong handoff explicit and pinned to the live public API contract', async () => {
  const bajajFinserv = await loadBajajFinservModule()

  assert.equal(bajajFinserv.COMPANY, 'Bajaj Finserv')
  assert.equal(bajajFinserv.SOURCE, 'bajajfinserv')
  assert.equal(
    bajajFinserv.COMPANY_PAGE_URL,
    'https://www.aboutbajajfinserv.com/about-us',
  )
  assert.equal(bajajFinserv.HOMEPAGE_URL, 'https://www.bajajfinserv.in/')
  assert.equal(bajajFinserv.PORTAL_ORIGIN, 'https://bflcareers.peoplestrong.com')
  assert.equal(
    bajajFinserv.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://bflcareers.peoplestrong.com/home',
  )
  assert.equal(bajajFinserv.JOB_LISTINGS_URL, 'https://bflcareers.peoplestrong.com/')
  assert.equal(bajajFinserv.DEFAULT_PAGE_SIZE, 99)
  assert.equal(
    bajajFinserv.buildApiUrl(),
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=99',
  )
  assert.equal(
    bajajFinserv.buildApiUrl({ offset: 20, limit: 10 }),
    'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=20&limit=10',
  )
  assert.equal(
    bajajFinserv.buildJobDetailUrl('JR/0001'),
    'https://bflcareers.peoplestrong.com/job/detail/JR%2F0001',
  )
  assert.equal(
    bajajFinserv.extractPeopleStrongHandoffUrl(officialCompanyPageHtml),
    'https://bflcareers.peoplestrong.com/home',
  )
  assert.equal(
    bajajFinserv.normalizePeopleStrongHandoffUrl(
      bajajFinserv.extractPeopleStrongHandoffUrl(officialCompanyPageHtml),
    ),
    'https://bflcareers.peoplestrong.com/',
  )
  assert.equal(bajajFinserv.hasOfficialBajajFinservPageSignal(officialCompanyPageHtml), true)
  assert.equal(bajajFinserv.hasPublicPortalShell(portalShellHtml), true)
  assert.equal(bajajFinserv.buildPublicHeaders().Origin, 'https://bflcareers.peoplestrong.com')
  assert.equal(bajajFinserv.buildPublicHeaders().Referer, 'https://bflcareers.peoplestrong.com/')
})

test('extractSearchResults maps public Bajaj Finserv PeopleStrong listing fields', async () => {
  const bajajFinserv = await loadBajajFinservModule()
  const jobs = bajajFinserv.extractSearchResults(samplePayload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Software Engineer',
    company: 'Bajaj Finserv',
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
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['Node.js', 'AWS'],
    postingDate: '2026-07-15',
    closingDate: '2026-08-15',
    jobDescription: null,
  })
})

test('run verifies the known Bajaj Finserv handoff before replaying the public PeopleStrong API', async () => {
  const bajajFinserv = await loadBajajFinservModule()
  const pageRequests = []
  const apiRequests = []

  const jobs = await bajajFinserv.createBajajFinservScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === bajajFinserv.COMPANY_PAGE_URL) {
        return { status: 200, url, html: officialCompanyPageHtml }
      }

      if (url === bajajFinserv.JOB_LISTINGS_URL) {
        return { status: 200, url, html: portalShellHtml }
      }

      throw new Error(`Unexpected Bajaj Finserv page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      apiRequests.push({ url, options })
      return samplePayload
    },
  })

  assert.deepEqual(pageRequests, [
    bajajFinserv.COMPANY_PAGE_URL,
    bajajFinserv.JOB_LISTINGS_URL,
  ])
  assert.equal(apiRequests.length, 1)
  assert.equal(apiRequests[0].url, bajajFinserv.buildApiUrl())
  assert.equal(apiRequests[0].options.method, 'POST')
  assert.equal(apiRequests[0].options.body, JSON.stringify(bajajFinserv.DEFAULT_SEARCH_BODY))
  assert.equal(apiRequests[0].options.headers.Origin, 'https://bflcareers.peoplestrong.com')
  assert.deepEqual(jobs, [
    {
      title: 'Software Engineer',
      company: 'Bajaj Finserv',
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
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Node.js', 'AWS'],
      postingDate: '2026-07-15',
      closingDate: '2026-08-15',
      jobDescription: null,
      source: 'bajajfinserv',
      link: 'https://bflcareers.peoplestrong.com/job/detail/JR00000001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Bajaj Finserv scraper fails closed when the verified handoff or public portal shell drifts', async () => {
  const bajajFinserv = await loadBajajFinservModule()

  await assert.rejects(
    bajajFinserv.createBajajFinservScraper().run({
      fetchPage: async (url) => {
        if (url === bajajFinserv.COMPANY_PAGE_URL) {
          return {
            status: 200,
            url,
            html: replacePeopleStrongHandoff(
              officialCompanyPageHtml,
              'https://example.com/jobs',
            ),
          }
        }

        throw new Error(`Unexpected Bajaj Finserv page URL: ${url}`)
      },
    }),
    /known PeopleStrong handoff|official Bajaj Finserv page/i,
  )

  await assert.rejects(
    bajajFinserv.createBajajFinservScraper().run({
      fetchPage: async (url) => {
        if (url === bajajFinserv.COMPANY_PAGE_URL) {
          return { status: 200, url, html: officialCompanyPageHtml }
        }

        if (url === bajajFinserv.JOB_LISTINGS_URL) {
          return { status: 200, url, html: '<html><head><title>Placeholder</title></head><body>broken</body></html>' }
        }

        throw new Error(`Unexpected Bajaj Finserv page URL: ${url}`)
      },
    }),
    /public PeopleStrong portal/i,
  )
})
