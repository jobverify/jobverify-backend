import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at FPL</title>
    <meta property="og:url" content="https://www.getonecard.app/careers/">
  </head>
  <body>
    <h1>
      <div id="_Careers">
        <span>Join Team OneCard</span>
      </div>
    </h1>
    <p>
      At OneCard, we are redefining the credit card and payments experience and want to
      be a part of the fintech revolution in India.
    </p>
    <div class="button_work_with_us">
      <a href="https://www.fplabs.tech/careers/">Work With Us</a>
    </div>
    <script>
      fetch(
        "https://ibffpublic6f2461135ffd1b6a80db296ec15abf.onrender.com/hr/jobs",
        {
          method: "get",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "hr-read-only"
          }
        }
      )
    </script>
    <a href="mailto:careers@getonecard.app" class="btn btn-main-md">Apply Now</a>
  </body>
</html>
`

const jobsPayload = {
  success: true,
  data: {
    data: [
      {
        id: 17,
        attributes: {
          title: 'Product Analyst',
          location: null,
          experience: '2-4 years',
          description: '<p>Build credit insights.</p>',
          publishedAt: '2026-07-10T11:52:00.000Z',
        },
      },
      {
        id: 18,
        attributes: {
          title: 'Senior Backend Engineer',
          location: 'Bengaluru',
          experience: null,
          description: null,
          publishedAt: '2026-07-15T08:00:00.000Z',
        },
      },
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        total: 2,
      },
    },
  },
}

const emptyJobsPayload = {
  success: true,
  data: {
    data: [],
    meta: {
      pagination: {
        page: 1,
        pageSize: 25,
        pageCount: 0,
        total: 0,
      },
    },
  },
}

const inaccessibleJobsPayload = {
  success: true,
  data: {
    data: null,
  },
}

const loadOneCardModule = async () => {
  try {
    return await import('../../scraper/onecard/script.js')
  } catch {
    assert.fail('Expected OneCard scraper module at ../../scraper/onecard/script.js')
  }
}

const replaceJobsApiKey = (html, replacement) =>
  html.replace(/hr-read-only/g, replacement)

test('OneCard scraper pins the verified official careers surface and embedded public jobs API config', async () => {
  const {
    COMPANY,
    OFFICIAL_APPLY_URL,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    OFFICIAL_JOBS_API_KEY,
    OFFICIAL_JOBS_API_URL,
    SOURCE,
    createOneCardScraper,
    extractOfficialJobsApiConfig,
    hasOfficialOneCardCareersSignals,
  } = await loadOneCardModule()

  assert.equal(COMPANY, 'OneCard')
  assert.equal(SOURCE, 'onecard')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.getonecard.app/careers/')
  assert.equal(OFFICIAL_CAREERS_HANDOFF_URL, 'https://www.fplabs.tech/careers/')
  assert.equal(
    OFFICIAL_JOBS_API_URL,
    'https://ibffpublic6f2461135ffd1b6a80db296ec15abf.onrender.com/hr/jobs',
  )
  assert.equal(OFFICIAL_JOBS_API_KEY, 'hr-read-only')
  assert.equal(OFFICIAL_APPLY_URL, 'mailto:careers@getonecard.app')
  assert.deepEqual(extractOfficialJobsApiConfig(officialCareersHtml), {
    jobsApiUrl: OFFICIAL_JOBS_API_URL,
    jobsApiKey: OFFICIAL_JOBS_API_KEY,
  })
  assert.equal(hasOfficialOneCardCareersSignals(officialCareersHtml), true)
  assert.equal(hasOfficialOneCardCareersSignals(replaceJobsApiKey(officialCareersHtml, 'wrong-key')), false)

  const scraper = createOneCardScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => replaceJobsApiKey(officialCareersHtml, 'wrong-key'),
      fetchJson: async () => emptyJobsPayload,
    }),
    /verified official careers page no longer matches the trusted public surface/i,
  )
})

test('run maps verified OneCard jobs payload into Jobify jobs and uses the official careers page as the source link', async () => {
  const { createOneCardScraper } = await loadOneCardModule()
  const scraper = createOneCardScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedUrls = []
  const requestedHeaders = []

  const jobs = await scraper.run({
    fetchText: async () => officialCareersHtml,
    fetchJson: async (url, options = {}) => {
      requestedUrls.push(url)
      requestedHeaders.push(options.headers ?? {})
      return jobsPayload
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://ibffpublic6f2461135ffd1b6a80db296ec15abf.onrender.com/hr/jobs',
  ])
  assert.equal(requestedHeaders[0]['x-api-key'], 'hr-read-only')
  assert.deepEqual(jobs, [
    {
      title: 'Product Analyst',
      company: 'OneCard',
      department: null,
      location: 'Pune',
      city: 'Pune',
      country: 'India',
      jobId: '17',
      requisitionId: '17',
      sourceUrl: 'https://www.getonecard.app/careers/',
      applyUrl: 'mailto:careers@getonecard.app',
      employmentType: null,
      experienceRequired: '2-4 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10',
      closingDate: null,
      jobDescription: 'Build credit insights.',
      source: 'onecard',
      link: 'https://www.getonecard.app/careers/',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Senior Backend Engineer',
      company: 'OneCard',
      department: null,
      location: 'Bengaluru',
      city: 'Bengaluru',
      country: 'India',
      jobId: '18',
      requisitionId: '18',
      sourceUrl: 'https://www.getonecard.app/careers/',
      applyUrl: 'mailto:careers@getonecard.app',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-15',
      closingDate: null,
      jobDescription: null,
      source: 'onecard',
      link: 'https://www.getonecard.app/careers/',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('OneCard returns [] for the verified empty-board response and fails closed on malformed API payloads', async () => {
  const { createOneCardScraper } = await loadOneCardModule()
  const scraper = createOneCardScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    fetchText: async () => officialCareersHtml,
    fetchJson: async () => emptyJobsPayload,
  })

  assert.deepEqual(jobs, [])

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml,
      fetchJson: async () => inaccessibleJobsPayload,
    }),
    /public jobs api no longer exposes the expected data array/i,
  )
})
