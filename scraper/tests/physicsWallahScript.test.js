import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-10T00:00:00.000Z'

const loadPhysicsWallahModule = async () => {
  try {
    return await import('../physicswallah/script.js')
  } catch {
    assert.fail('Expected PhysicsWallah scraper module at ../physicswallah/script.js')
  }
}

test('PhysicsWallah scraper keeps the verified Darwinbox routes explicit and decorates India jobs through the shared Darwinbox runner', async () => {
  const {
    COMPANY_NAME,
    SOURCE,
    COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    createPhysicsWallahScraper,
  } = await loadPhysicsWallahModule()

  assert.equal(COMPANY_NAME, 'PhysicsWallah')
  assert.equal(SOURCE, 'physicswallah')
  assert.equal(COMPANY_ID, 'a62d7a6e288992')
  assert.equal(DARWINBOX_ORIGIN, 'https://pwhr.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.pw.live/')
  assert.equal(
    PUBLIC_PORTAL_URL,
    'https://pwhr.darwinbox.in/ms/candidatev2/a62d7a6e288992/careers/home',
  )

  const scraper = createPhysicsWallahScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://pwhr.darwinbox.in/ms/candidatev2/a62d7a6e288992/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://pwhr.darwinbox.in/ms/candidateapi/job/alljobs?companyId=a62d7a6e288992',
  )
  assert.equal(
    scraper.buildJobDetailUrl('pw-001'),
    'https://pwhr.darwinbox.in/ms/candidatev2/a62d7a6e288992/careers/jobDetails/pw-001',
  )

  const requestedPages = []
  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'pw-001',
            title: 'Software Development Engineer',
            department_name: 'Engineering',
            locations: 'Noida, Uttar Pradesh, India',
            country: 'India',
            emp_type_name: 'Full Time',
            experience: '2 - 4 Years',
            posted_on: '10-Jul-2026',
            jd: '<p>Build learner-facing platform capabilities.</p>',
          },
          {
            id: 'pw-ae-001',
            title: 'Business Development Associate - Dubai',
            department_name: 'Sales',
            locations: 'Dubai, United Arab Emirates',
            country: 'United Arab Emirates',
            emp_type_name: 'Full Time',
            experience: '1 - 3 Years',
            posted_on: '10-Jul-2026',
            jd: '<p>Support regional growth initiatives.</p>',
          },
        ],
        job_counts: 2,
      }
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs, [
    {
      title: 'Software Development Engineer',
      company: 'PhysicsWallah',
      department: 'Engineering',
      location: 'Noida, Uttar Pradesh, India',
      city: 'Noida',
      jobId: 'pw-001',
      requisitionId: null,
      sourceUrl: 'https://pwhr.darwinbox.in/ms/candidatev2/a62d7a6e288992/careers/jobDetails/pw-001',
      applyUrl: 'https://pwhr.darwinbox.in/ms/candidatev2/a62d7a6e288992/careers/jobDetails/pw-001',
      employmentType: 'Full Time',
      experienceRequired: '2 - 4 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '10-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Build learner-facing platform capabilities.</p>',
      source: 'physicswallah',
      link: 'https://pwhr.darwinbox.in/ms/candidatev2/a62d7a6e288992/careers/jobDetails/pw-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
