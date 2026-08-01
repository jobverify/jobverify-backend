import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Licious Careers</title>
  </head>
  <body>
    <main>
      <h1>Join the mix</h1>
      <p>Think you are the magic ingredient?</p>
      <a href="mailto:careers@licious.com">careers@licious.com</a>
      <a href="https://licious.darwinbox.in/ms/candidate/careers">Open Roles</a>
    </main>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/licious/script.js')
  } catch {
    assert.fail('Expected Licious scraper module at ../../scraper/licious/script.js')
  }
}

test('Licious scraper pins the verified official careers handoff and Darwinbox endpoints', async () => {
  const licious = await loadScriptModule()

  assert.equal(licious.SOURCE, 'licious')
  assert.equal(licious.COMPANY, 'Licious')
  assert.equal(licious.OFFICIAL_BRAND_NAME, 'Licious')
  assert.equal(licious.VERIFIED_ON, '2026-07-16')
  assert.equal(licious.CAREERS_URL, 'https://careers.licious.com/')
  assert.equal(
    licious.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://licious.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    licious.PUBLIC_PORTAL_URL,
    'https://licious.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    licious.LISTING_API_URL,
    'https://licious.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(licious.DARWINBOX_ORIGIN, 'https://licious.darwinbox.in')
  assert.equal(licious.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(
    licious.extractOfficialDarwinboxUrl(careersHtml),
    licious.OFFICIAL_CAREERS_HANDOFF_URL,
  )
  assert.equal(licious.hasOfficialCareersSignal(careersHtml), true)
})

test('Licious returns India jobs from the verified public Darwinbox feed and preserves hosted detail URLs', async () => {
  const licious = await loadScriptModule()
  const requestedPages = []

  const jobs = await licious.createLiciousScraper({
    now: () => '2026-07-16T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      if (url === licious.CAREERS_URL) return careersHtml

      throw new Error(`Unexpected Licious URL: ${url}`)
    },
    fetchListingPage: async ({ page, pageSize, companyId }) => {
      requestedPages.push({ page, pageSize, companyId })

      return {
        status: 'success',
        data: [
          {
            id: 'a6610fb2a780ac',
            title: 'Area Sales Manager',
            department_name: 'B2B',
            locations: 'Multiple Locations',
            tool_tip_locations: [
              'Bengaluru, Karnataka, India',
              'Gurgaon, Haryana, India',
              'Hyderabad, Telangana, India',
              'Mumbai, Maharashtra, India',
            ],
            country: 'India',
            emp_type_name: 'Onroll',
            experience: '4 - 8 Years',
            posted_on: '03-Feb-2025',
            jd: '<p>Drive B2B growth across multiple India locations.</p>',
          },
          {
            id: 'licious-us-001',
            title: 'US Expansion Manager',
            department_name: 'Growth',
            locations: 'Seattle, Washington, United States',
            country: 'United States',
            emp_type_name: 'Full Time',
            experience: '8 - 12 Years',
            posted_on: '03-Feb-2025',
            jd: '<p>Ignore non-India role.</p>',
          },
        ],
        job_counts: 2,
      }
    },
  })

  assert.deepEqual(requestedPages, [{ page: 1, pageSize: 10, companyId: 'main' }])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Area Sales Manager',
    company: 'Licious',
    department: 'B2B',
    location: 'Multiple Locations',
    city: 'Multiple Locations',
    jobId: 'a6610fb2a780ac',
    requisitionId: null,
    sourceUrl: 'https://licious.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6610fb2a780ac',
    applyUrl: 'https://licious.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6610fb2a780ac',
    employmentType: 'Onroll',
    experienceRequired: '4 - 8 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '03-Feb-2025',
    closingDate: null,
    jobDescription: '<p>Drive B2B growth across multiple India locations.</p>',
    source: 'licious',
    link: 'https://licious.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6610fb2a780ac',
    scrapedAt: '2026-07-16T00:00:00.000Z',
  })
})

test('Licious fails closed when the verified official careers handoff drifts', async () => {
  const licious = await loadScriptModule()

  await assert.rejects(
    licious.createLiciousScraper().run({
      fetchText: async () => '<html><head><title>Unexpected</title></head><body>Placeholder</body></html>',
      fetchListingPage: async () => ({ status: 'success', data: [], job_counts: 0 }),
    }),
    /verified official careers page no longer matches/i,
  )
})
