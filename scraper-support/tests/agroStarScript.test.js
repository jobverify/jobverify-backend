import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-14T00:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <title>Join Us | Build Your Career at AgroStar &amp; Transform Indian Agriculture</title>
      <link rel="canonical" href="https://corporate.agrostar.in/join-us">
    </head>
    <body>
      <h1>Build an institution that feeds the nation, and saves the planet.</h1>
      <h2>The AgroStar Code</h2>
      <h2>We're always looking for great talent</h2>
      <p>If you're ready to make an impact, we'd love to meet you!</p>
      <a href="https://agrostar.darwinbox.in/ms/candidatev2/main/careers/allJobs">View Open Positions</a>
      <h3>Cluster Manager - Saharanpur</h3>
      <a href="https://agrostar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69f8bd0c30c48?from=all">Apply Now</a>
      <h3>Senior Manager - Crop Protection</h3>
      <a href="https://agrostar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a681afb8c613ff?from=all">Apply Now</a>
    </body>
  </html>
`

const currentOfficialCareersHtml = `
  <html>
    <head>
      <title>Join Us | Build Your Career at AgroStar &amp; Transform Indian Agriculture</title>
      <link rel="canonical" href="https://corporate.agrostar.in/join-us">
    </head>
    <body>
      <h1>Build an institution that feeds the nation, and saves the planet.</h1>
      <h2>The perks of being an AgStar</h2>
      <p>If you're ready to make an impact, we'd love to meet you!</p>
      <a href="https://agrostar.darwinbox.in/ms/candidatev2/main/careers/allJobs">View Open Positions</a>
      <a href="https://agrostar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69f8bd0c30c48?from=all">Cluster Manager - Saharanpur</a>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'a69f8bd0c30c48',
      title: 'Cluster Manager - Saharanpur',
      department_name: 'Sales',
      locations: 'Saharanpur, Uttar Pradesh, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '8 - 10 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Lead the Saharanpur cluster growth plan.</p>',
    },
    {
      id: 'agro-us-001',
      title: 'US Role',
      department_name: 'Sales',
      locations: 'Chicago, Illinois, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '8 - 10 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/agrostar/script.js')
  } catch {
    assert.fail('Expected AgroStar scraper module at ../../scraper/agrostar/script.js')
  }
}

test('AgroStar scraper keeps the verified official Darwinbox handoff explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createAgroStarScraper,
    extractOfficialDarwinboxUrl,
    hasOfficialAgroStarCareersSignals,
  } = await loadModule()

  assert.equal(COMPANY_NAME, 'AgroStar')
  assert.equal(SOURCE, 'agrostar')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://agrostar.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://corporate.agrostar.in/join-us')
  assert.equal(
    OFFICIAL_CAREERS_HANDOFF_URL,
    'https://agrostar.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(PUBLIC_PORTAL_URL, OFFICIAL_CAREERS_HANDOFF_URL)
  assert.equal(extractOfficialDarwinboxUrl(officialCareersHtml), OFFICIAL_CAREERS_HANDOFF_URL)
  assert.equal(hasOfficialAgroStarCareersSignals(officialCareersHtml), true)
  assert.equal(hasOfficialAgroStarCareersSignals(currentOfficialCareersHtml), true)
  assert.equal(
    hasOfficialAgroStarCareersSignals(
      officialCareersHtml.replace(OFFICIAL_CAREERS_HANDOFF_URL, 'https://example.com/jobs'),
    ),
    false,
  )

  const scraper = createAgroStarScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml.replace(
        OFFICIAL_CAREERS_HANDOFF_URL,
        'https://example.com/jobs',
      ),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page no longer matches the verified public surface/i,
  )
})

test('run maps AgroStar Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
  const { createAgroStarScraper } = await loadModule()
  const scraper = createAgroStarScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedPages = []

  const jobs = await scraper.run({
    fetchText: async () => officialCareersHtml,
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      return listingPayload
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs, [
    {
      title: 'Cluster Manager - Saharanpur',
      company: 'AgroStar',
      department: 'Sales',
      location: 'Saharanpur, Uttar Pradesh, India',
      city: 'Saharanpur',
      jobId: 'a69f8bd0c30c48',
      requisitionId: null,
      sourceUrl: 'https://agrostar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69f8bd0c30c48',
      applyUrl: 'https://agrostar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69f8bd0c30c48',
      employmentType: 'Full Time',
      experienceRequired: '8 - 10 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '14-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Lead the Saharanpur cluster growth plan.</p>',
      publicExperienceChecked: false,
      source: 'agrostar',
      link: 'https://agrostar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69f8bd0c30c48',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('run uses the native Darwinbox API when no listing page fetcher is injected', async () => {
  const { createAgroStarScraper } = await loadModule()
  const requests = []
  const scraper = createAgroStarScraper({
    now: () => FIXED_SCRAPED_AT,
    fetchImpl: async (url, options) => {
      requests.push({ url, options })
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => listingPayload,
      }
    },
  })

  const jobs = await scraper.run({
    maxPages: 1,
    fetchText: async () => officialCareersHtml,
  })

  assert.equal(jobs.length, 1)
  assert.equal(requests.length, 1)
  assert.equal(
    requests[0].url,
    'https://agrostar.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(requests[0].options.method, 'POST')
})
