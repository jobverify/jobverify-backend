import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Work with Porter - Career - Tech Enabled Logistics Company</title>
    <link rel="canonical" href="https://porter.in/careers" />
  </head>
  <body>
    <section>
      <h1>JOIN PORTER</h1>
      <h3>At Porter, we create impactful journeys. Join us</h3>
      <a href="https://porter.darwinbox.in/ms/candidate/careers" target="_blank">SEE OPEN POSITIONS</a>
      <h2>CURRENT OPENINGS</h2>
    </section>
  </body>
</html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'porter-001',
      title: 'Senior Product Analyst',
      department_name: 'Product',
      locations: 'Bengaluru, Karnataka, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '3 - 5 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>Own analytics for logistics product bets.</p>',
    },
    {
      id: 'porter-tr-001',
      title: 'Turkey Expansion Lead',
      department_name: 'Expansion',
      locations: 'Istanbul, Turkey',
      country: 'Turkey',
      emp_type_name: 'Full Time',
      experience: '5 - 8 Years',
      posted_on: '16-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadPorterModule = async () => {
  try {
    return await import('../../scraper/porter/script.js')
  } catch {
    assert.fail('Expected Porter scraper module at ../../scraper/porter/script.js')
  }
}

test('Porter pins the verified official careers handoff before Darwinbox scraping begins', async () => {
  const porter = await loadPorterModule()

  assert.equal(porter.SOURCE, 'porter')
  assert.equal(porter.COMPANY_NAME, 'Porter')
  assert.equal(porter.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(porter.DARWINBOX_ORIGIN, 'https://porter.darwinbox.in')
  assert.equal(porter.OFFICIAL_CAREERS_URL, 'https://porter.in/careers')
  assert.equal(
    porter.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://porter.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    porter.PUBLIC_PORTAL_URL,
    'https://porter.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    porter.extractOfficialDarwinboxUrl(officialCareersHtml),
    porter.OFFICIAL_CAREERS_HANDOFF_URL,
  )
  assert.equal(porter.hasOfficialPorterCareersSignals(officialCareersHtml), true)
  assert.equal(
    porter.hasOfficialPorterCareersSignals(
      officialCareersHtml.replace(
        'https://porter.darwinbox.in/ms/candidate/careers',
        'https://example.com/jobs',
      ),
    ),
    false,
  )
})

test('Porter run validates the official careers page before mapping India Darwinbox jobs', async () => {
  const { createPorterScraper } = await loadPorterModule()
  const requestedPages = []
  const scraper = createPorterScraper({
    now: () => FIXED_SCRAPED_AT,
  })

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
      title: 'Senior Product Analyst',
      company: 'Porter',
      department: 'Product',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      jobId: 'porter-001',
      requisitionId: null,
      sourceUrl: 'https://porter.darwinbox.in/ms/candidatev2/main/careers/jobDetails/porter-001',
      applyUrl: 'https://porter.darwinbox.in/ms/candidatev2/main/careers/jobDetails/porter-001',
      employmentType: 'Full Time',
      experienceRequired: '3 - 5 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Own analytics for logistics product bets.</p>',
      source: 'porter',
      link: 'https://porter.darwinbox.in/ms/candidatev2/main/careers/jobDetails/porter-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Porter fails closed when the verified official careers handoff drifts', async () => {
  const { createPorterScraper } = await loadPorterModule()
  const scraper = createPorterScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => officialCareersHtml.replace(
        'https://porter.darwinbox.in/ms/candidate/careers',
        'https://example.com/jobs',
      ),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official careers page/i,
  )
})
