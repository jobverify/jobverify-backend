import assert from 'node:assert/strict'
import test from 'node:test'

const indiaCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers in India | India | McKinsey &amp; Company</title>
    <link rel="canonical" href="https://www.mckinsey.com/in/careers-in-india" />
  </head>
  <body>
    <main>
      <a href="https://www.mckinsey.com/careers/search-jobs/en">Search jobs</a>
      <h1>Careers in India</h1>
      <p>Join McKinsey India and be part of a collaborative team tackling some of the toughest challenges and driving real change.</p>
      <p>Find your ideal job</p>
    </main>
  </body>
</html>
`

const searchJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>McKinsey Job Search | Consulting and Internal Roles | Careers | McKinsey &amp; Company</title>
  </head>
  <body>
    <main>
      <input aria-label="Search Jobs" />
      <button>Load More</button>
      <a href="https://jobs.mckinsey.com/en_US/careers/login">Sign in here.</a>
    </main>
  </body>
</html>
`

const firstPagePayload = {
  numFound: 608,
  docs: [
    {
      jobID: '15275',
      title: 'Business Analyst Intern',
      interest: 'Consulting',
      cities: [
        'Abu Dhabi',
        'Bengaluru',
        'Chennai',
        'Gurugram',
        'Kolkata',
        'Mumbai',
      ],
      countries: [
        'United Arab Emirates',
        'India',
        'India',
        'India',
        'India',
        'India',
      ],
      postedToLinkedInDate: '2026-07-10',
      jobApplyURL: 'https://mckinsey.avature.net/careers/ApplicationMethods?folderId=15275',
      friendlyURL: 'businessanalystintern-15275',
      shortJobSummary:
        'Join a client service team for 8-10 weeks and help solve complex client challenges.',
    },
    {
      jobID: '109857',
      title: 'Analyst - Life Sciences, Market Access',
      interest: 'Consulting',
      cities: ['Boston'],
      countries: ['United States'],
      postedToLinkedInDate: '2026-06-25',
      jobApplyURL: 'https://mckinsey.avature.net/careers/ApplicationMethods?folderId=109857',
      friendlyURL: 'analyst-lifesciencesmarketaccess-109857',
      shortJobSummary: 'US-only role.',
    },
  ],
}

const secondPagePayload = {
  numFound: 608,
  docs: [],
}

const loadScriptModule = async () => {
  try {
    return await import('../mckinseycompany/script.js')
  } catch {
    assert.fail('Expected McKinsey & Company scraper module at ../mckinseycompany/script.js')
  }
}

test('McKinsey & Company helper contract stays pinned to the verified India careers and public jobs API surfaces', async () => {
  const mckinseyCompany = await loadScriptModule()

  assert.equal(mckinseyCompany.SOURCE, 'mckinseycompany')
  assert.equal(mckinseyCompany.COMPANY, 'McKinsey & Company')
  assert.equal(mckinseyCompany.VERIFIED_ON, '2026-07-16')
  assert.equal(mckinseyCompany.HOMEPAGE_URL, 'https://www.mckinsey.com/')
  assert.equal(
    mckinseyCompany.INDIA_CAREERS_URL,
    'https://www.mckinsey.com/in/careers-in-india',
  )
  assert.equal(
    mckinseyCompany.SEARCH_JOBS_URL,
    'https://www.mckinsey.com/careers/search-jobs/en',
  )
  assert.equal(
    mckinseyCompany.SEARCH_API_BASE_URL,
    'https://gateway.mckinsey.com/apigw-x0cceuow60/v1/api/jobs/search',
  )
  assert.equal(mckinseyCompany.buildSearchApiUrl(), `${mckinseyCompany.SEARCH_API_BASE_URL}?pageSize=20&start=1&lang=en`)
  assert.equal(
    mckinseyCompany.buildSearchApiUrl({ start: 21 }),
    `${mckinseyCompany.SEARCH_API_BASE_URL}?pageSize=20&start=21&lang=en`,
  )
  assert.equal(mckinseyCompany.hasOfficialIndiaCareersSignal(indiaCareersHtml), true)
  assert.equal(mckinseyCompany.hasPublicJobsSearchSignal(searchJobsHtml), true)
  assert.deepEqual(
    mckinseyCompany.extractIndiaCityPairs(firstPagePayload.docs[0]),
    [
      { city: 'Bengaluru', country: 'India' },
      { city: 'Chennai', country: 'India' },
      { city: 'Gurugram', country: 'India' },
      { city: 'Kolkata', country: 'India' },
      { city: 'Mumbai', country: 'India' },
    ],
  )
})

test('McKinsey & Company keeps only India-eligible jobs from the public search API and stamps a stable scrape time', async () => {
  const mckinseyCompany = await loadScriptModule()
  const requestedTexts = []
  const requestedJsonUrls = []

  const jobs = await mckinseyCompany.createMckinseyCompanyScraper({
    now: () => '2026-07-16T12:34:56.000Z',
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === mckinseyCompany.INDIA_CAREERS_URL) return indiaCareersHtml
      if (url === mckinseyCompany.SEARCH_JOBS_URL) return searchJobsHtml
      throw new Error(`Unexpected McKinsey HTML URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === mckinseyCompany.buildSearchApiUrl({ start: 1 })) return firstPagePayload
      if (url === mckinseyCompany.buildSearchApiUrl({ start: 21 })) return secondPagePayload
      throw new Error(`Unexpected McKinsey API URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTexts, [
    mckinseyCompany.INDIA_CAREERS_URL,
    mckinseyCompany.SEARCH_JOBS_URL,
  ])
  assert.deepEqual(requestedJsonUrls, [
    mckinseyCompany.buildSearchApiUrl({ start: 1 }),
    mckinseyCompany.buildSearchApiUrl({ start: 21 }),
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Business Analyst Intern',
      company: 'McKinsey & Company',
      department: 'Consulting',
      location: 'Bengaluru, India | Chennai, India | Gurugram, India | Kolkata, India | Mumbai, India',
      city: 'Multiple Locations',
      jobId: '15275',
      requisitionId: '15275',
      sourceUrl: 'https://mckinsey.avature.net/careers/ApplicationMethods?folderId=15275',
      applyUrl: 'https://mckinsey.avature.net/careers/ApplicationMethods?folderId=15275',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10',
      closingDate: null,
      jobDescription: 'Join a client service team for 8-10 weeks and help solve complex client challenges.',
      source: 'mckinseycompany',
      link: 'https://mckinsey.avature.net/careers/ApplicationMethods?folderId=15275',
      scrapedAt: '2026-07-16T12:34:56.000Z',
    },
  ])
})

test('McKinsey & Company fails closed when the verified public surfaces drift materially', async () => {
  const mckinseyCompany = await loadScriptModule()

  await assert.rejects(
    mckinseyCompany.createMckinseyCompanyScraper().run({
      fetchText: async (url) => {
        if (url === mckinseyCompany.INDIA_CAREERS_URL) {
          return '<html><head><title>Unexpected</title></head><body>Placeholder</body></html>'
        }
        return searchJobsHtml
      },
      fetchJson: async () => firstPagePayload,
    }),
    /verified india careers page no longer matches/i,
  )

  await assert.rejects(
    mckinseyCompany.createMckinseyCompanyScraper().run({
      fetchText: async (url) => {
        if (url === mckinseyCompany.INDIA_CAREERS_URL) return indiaCareersHtml
        return '<html><head><title>Unexpected</title></head><body>Placeholder</body></html>'
      },
      fetchJson: async () => firstPagePayload,
    }),
    /verified public search jobs page no longer matches/i,
  )
})
