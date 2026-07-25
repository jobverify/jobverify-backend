import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Work With Us - Mahindra Logistics</title>
    <link rel="canonical" href="https://mahindralogistics.com/work-with-us/" />
  </head>
  <body>
    <main>
      <h1>Work With Us: Igniting Mutual Success &amp; Growth</h1>
      <p>Join Our Ignited Minds</p>
      <p>Be a part of the workforce that redefines logistics.</p>
      <a href="https://forms.office.com/r/example">Click here</a>
      <a href="https://nectar.darwinbox.in/ms/candidate/careers">Explore Opportunities</a>
      <a href="https://nectar.darwinbox.in/ms/candidate/careers">Join Us</a>
    </main>
  </body>
</html>
`

const listingPayload = {
  status: 'success',
  data: [
    {
      id: 'a649a8171e01d2',
      title: 'Mobility - Manager - Business Development',
      department_name: 'West 1',
      locations: 'Head Office, Mumbai, Maharashtra\r, India',
      country: 'India',
      emp_type_name: 'Permanent',
      experience: '5 - 9 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>Develop and execute strategic plans aligned with Mahindra Logistics offerings.</p>',
    },
    {
      id: 'mahindra-logistics-us-1',
      title: 'Regional Logistics Manager - USA',
      department_name: 'North America',
      locations: 'Dallas, Texas, United States',
      country: 'United States',
      emp_type_name: 'Permanent',
      experience: '8 - 10 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>US-only role.</p>',
    },
  ],
  job_counts: 1,
}

const loadScriptModule = async () => {
  try {
    return await import('../mahindralogistics/script.js')
  } catch {
    assert.fail('Expected Mahindra Logistics scraper module at ../mahindralogistics/script.js')
  }
}

test('Mahindra Logistics helper contract stays pinned to the verified official work-with-us handoff', async () => {
  const mahindraLogistics = await loadScriptModule()

  assert.equal(mahindraLogistics.SOURCE, 'mahindralogistics')
  assert.equal(mahindraLogistics.COMPANY_NAME, 'Mahindra Logistics')
  assert.equal(mahindraLogistics.VERIFIED_ON, '2026-07-16')
  assert.equal(
    mahindraLogistics.OFFICIAL_CAREERS_URL,
    'https://mahindralogistics.com/work-with-us/',
  )
  assert.equal(
    mahindraLogistics.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://nectar.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    mahindraLogistics.PUBLIC_PORTAL_URL,
    'https://nectar.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    mahindraLogistics.LISTING_API_URL,
    'https://nectar.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    mahindraLogistics.extractOfficialDarwinboxUrl(officialCareersHtml),
    mahindraLogistics.OFFICIAL_CAREERS_HANDOFF_URL,
  )
  assert.equal(
    mahindraLogistics.hasOfficialMahindraLogisticsCareersSignals(officialCareersHtml),
    true,
  )
  assert.equal(
    mahindraLogistics.buildCareersPageUrl(),
    'https://nectar.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    mahindraLogistics.buildListingApiUrl(),
    'https://nectar.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    mahindraLogistics.buildJobDetailUrl('a649a8171e01d2'),
    'https://nectar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a649a8171e01d2',
  )
})

test('Mahindra Logistics wrapper keeps only India jobs from the verified Darwinbox board and stamps a stable scrape time', async () => {
  const mahindraLogistics = await loadScriptModule()
  const requestedUrls = []
  const requestedPages = []

  const jobs = await mahindraLogistics.createMahindraLogisticsScraper({
    now: () => '2026-07-16T12:34:56.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === mahindraLogistics.OFFICIAL_CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected Mahindra Logistics URL: ${url}`)
    },
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      if (page === 1) return listingPayload
      throw new Error(`Unexpected Mahindra Logistics page request: ${page}`)
    },
  })

  assert.deepEqual(requestedUrls, [mahindraLogistics.OFFICIAL_CAREERS_URL])
  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Mobility - Manager - Business Development',
    company: 'Mahindra Logistics',
    department: 'West 1',
    location: 'Head Office, Mumbai, Maharashtra , India',
    city: 'Head Office',
    jobId: 'a649a8171e01d2',
    requisitionId: null,
    sourceUrl: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a649a8171e01d2',
    applyUrl: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a649a8171e01d2',
    employmentType: 'Permanent',
    experienceRequired: '5 - 9 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '16-Jul-2026',
    closingDate: null,
    jobDescription: '<p>Develop and execute strategic plans aligned with Mahindra Logistics offerings.</p>',
    source: 'mahindralogistics',
    link: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a649a8171e01d2',
    scrapedAt: '2026-07-16T12:34:56.000Z',
  })
})

test('Mahindra Logistics fails closed when the official careers page drifts away from the verified public surface', async () => {
  const mahindraLogistics = await loadScriptModule()

  await assert.rejects(
    mahindraLogistics.createMahindraLogisticsScraper().run({
      fetchText: async () => (
        '<html><head><title>Unexpected</title></head><body><p>Placeholder page</p></body></html>'
      ),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page no longer matches/i,
  )
})
