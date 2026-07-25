import assert from 'node:assert/strict'
import test from 'node:test'

const loadCasagrandModule = async () => {
  try {
    return await import('../casagrand/script.js')
  } catch {
    assert.fail('Expected Casagrand scraper module at ../scraper/casagrand/script.js')
  }
}

test('createCasagrandScraper targets the Casagrand Darwinbox host and company id', async () => {
  const { createCasagrandScraper } = await loadCasagrandModule()
  const scraper = createCasagrandScraper()

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://casagrand.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://casagrand.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    scraper.buildJobDetailUrl('job-123'),
    'https://casagrand.darwinbox.in/ms/candidatev2/main/careers/jobDetails/job-123',
  )
})

test('run keeps Casagrand jobs on the hosted Darwinbox routes and decorates the shared runner fields', async () => {
  const { createCasagrandScraper } = await loadCasagrandModule()
  const scraper = createCasagrandScraper()
  const requestedPages = []

  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'job-123',
            title: 'Planning Engineer',
            department_name: 'Construction',
            locations: 'Chennai, Tamil Nadu, India',
            country: 'India',
            emp_type_name: 'FULL_TIME',
            experience: '3 - 5 Years',
            posted_on: '10-Jul-2026',
            jd: '<p>Coordinate project planning and reporting.</p>',
          },
        ],
        job_counts: 1,
      }
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Casagrand')
  assert.equal(jobs[0].source, 'casagrand')
  assert.equal(
    jobs[0].applyUrl,
    'https://casagrand.darwinbox.in/ms/candidatev2/main/careers/jobDetails/job-123',
  )
  assert.equal(
    jobs[0].link,
    'https://casagrand.darwinbox.in/ms/candidatev2/main/careers/jobDetails/job-123',
  )
})
