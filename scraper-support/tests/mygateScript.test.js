import assert from 'node:assert/strict'
import test from 'node:test'

const loadMyGateModule = async () => {
  try {
    return await import('../../scraper/mygate/script.js')
  } catch {
    assert.fail('Expected MyGate scraper module at ../../scraper/mygate/script.js')
  }
}

test('createMyGateScraper keeps the official careers handoff and public Darwinbox routes explicit', async () => {
  const {
    COMPANY_ID,
    COMPANY_NAME,
    DARWINBOX_ORIGIN,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createMyGateScraper,
  } = await loadMyGateModule()

  assert.equal(COMPANY_NAME, 'MyGate')
  assert.equal(SOURCE, 'mygate')
  assert.equal(COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://mygate.darwinbox.in')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://mygate.com/careers/')
  assert.equal(
    OFFICIAL_CAREERS_HANDOFF_URL,
    'https://mygate.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fothers___apply%3D1',
  )
  assert.equal(
    PUBLIC_PORTAL_URL,
    'https://mygate.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )

  const scraper = createMyGateScraper()

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://mygate.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://mygate.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    scraper.buildJobDetailUrl('mygate-001'),
    'https://mygate.darwinbox.in/ms/candidatev2/main/careers/jobDetails/mygate-001',
  )
})

test('run keeps MyGate jobs on hosted Darwinbox routes and filters to India jobs', async () => {
  const { createMyGateScraper } = await loadMyGateModule()
  const scraper = createMyGateScraper()
  const requestedPages = []

  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'mygate-001',
            title: 'Senior Backend Engineer',
            department_name: 'Engineering',
            locations: 'Bengaluru, Karnataka, India',
            country: 'India',
            emp_type_name: 'Full Time',
            experience: '4 - 7 Years',
            posted_on: '10-Jul-2026',
            jd: '<p>Build platform services for urban communities.</p>',
          },
          {
            id: 'mygate-us-001',
            title: 'Business Operations Manager',
            department_name: 'Operations',
            locations: 'Austin, Texas, United States',
            country: 'United States',
            emp_type_name: 'Full Time',
            experience: '6 - 8 Years',
            posted_on: '10-Jul-2026',
            jd: '<p>Scale business operations in North America.</p>',
          },
        ],
        job_counts: 2,
      }
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'MyGate')
  assert.equal(jobs[0].source, 'mygate')
  assert.equal(jobs[0].city, 'Bengaluru')
  assert.equal(
    jobs[0].applyUrl,
    'https://mygate.darwinbox.in/ms/candidatev2/main/careers/jobDetails/mygate-001',
  )
  assert.equal(
    jobs[0].link,
    'https://mygate.darwinbox.in/ms/candidatev2/main/careers/jobDetails/mygate-001',
  )
  assert.ok(jobs[0].scrapedAt)
})
