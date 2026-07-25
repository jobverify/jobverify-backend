import assert from 'node:assert/strict'
import test from 'node:test'

const loadTVSMotorCompanyModule = async () => {
  try {
    return await import('../tvsmotorcompany/script.js')
  } catch {
    assert.fail('Expected TVS Motor Company scraper module at ../tvsmotorcompany/script.js')
  }
}

test('createTVSMotorCompanyScraper targets the TVS Motor Company Darwinbox host and company id', async () => {
  const { createTVSMotorCompanyScraper } = await loadTVSMotorCompanyModule()
  const scraper = createTVSMotorCompanyScraper()

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://tvsmsampark.darwinbox.in/ms/candidatev2/5ffc190a05f27/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://tvsmsampark.darwinbox.in/ms/candidateapi/job/alljobs?companyId=5ffc190a05f27',
  )
  assert.equal(
    scraper.buildJobDetailUrl('tvs-001'),
    'https://tvsmsampark.darwinbox.in/ms/candidatev2/5ffc190a05f27/careers/jobDetails/tvs-001',
  )
})

test('run keeps TVS Motor Company jobs on the hosted Darwinbox routes and decorates the shared runner fields', async () => {
  const { createTVSMotorCompanyScraper } = await loadTVSMotorCompanyModule()
  const scraper = createTVSMotorCompanyScraper()
  const requestedPages = []

  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'tvs-001',
            title: 'Graduate Engineer Trainee',
            department_name: 'Manufacturing',
            locations: 'Hosur, Tamil Nadu, India',
            country: 'India',
            emp_type_name: 'Full-time',
            experience: '0 - 2 Years',
            posted_on: '09-Jul-2026',
            jd: '<p>Support plant engineering and continuous improvement initiatives.</p>',
          },
        ],
        job_counts: 1,
      }
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'TVS Motor Company')
  assert.equal(jobs[0].source, 'tvsmotorcompany')
  assert.equal(
    jobs[0].applyUrl,
    'https://tvsmsampark.darwinbox.in/ms/candidatev2/5ffc190a05f27/careers/jobDetails/tvs-001',
  )
  assert.equal(
    jobs[0].link,
    'https://tvsmsampark.darwinbox.in/ms/candidatev2/5ffc190a05f27/careers/jobDetails/tvs-001',
  )
})
