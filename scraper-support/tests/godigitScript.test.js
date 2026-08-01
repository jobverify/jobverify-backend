import assert from 'node:assert/strict'
import test from 'node:test'

const loadGoDigitModule = async () => {
  try {
    return await import('../../scraper/godigit/script.js')
  } catch {
    assert.fail('Expected Go Digit scraper module at ../../scraper/scraper/godigit/script.js')
  }
}

test('createGoDigitScraper targets the Go Digit Darwinbox host and company id', async () => {
  const { createGoDigitScraper } = await loadGoDigitModule()
  const scraper = createGoDigitScraper()

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://godigit.darwinbox.in/ms/candidatev2/a651fdd75445d1/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://godigit.darwinbox.in/ms/candidateapi/job/alljobs?companyId=a651fdd75445d1',
  )
  assert.equal(
    scraper.buildJobDetailUrl('a1234567890abc'),
    'https://godigit.darwinbox.in/ms/candidatev2/a651fdd75445d1/careers/jobDetails/a1234567890abc',
  )
})

test('run decorates Go Digit jobs with its configured company and source', async () => {
  const { createGoDigitScraper } = await loadGoDigitModule()
  const scraper = createGoDigitScraper()

  const jobs = await scraper.run({
    fetchListingPage: async () => ({
      status: 'success',
      data: [
        {
          id: 'a1234567890abc',
          title: 'Financial Analyst',
          department_name: 'Financial Reporting',
          locations: 'Bengaluru, Karnataka, India',
          country: 'India',
          emp_type_name: 'FULL_TIME',
          experience: '2 - 4 Years',
          posted_on: '07-Jul-2026',
          jd: '<p>Prepare financial reporting and analysis.</p>',
        },
      ],
      job_counts: 1,
    }),
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Go Digit General Insurance')
  assert.equal(jobs[0].source, 'godigit')
  assert.equal(
    jobs[0].applyUrl,
    'https://godigit.darwinbox.in/ms/candidatev2/a651fdd75445d1/careers/jobDetails/a1234567890abc',
  )
})
