import assert from 'node:assert/strict'
import test from 'node:test'

const loadSonataModule = async () => {
  try {
    return await import('../sonata/script.js')
  } catch {
    assert.fail('Expected Sonata scraper module at ../scraper/sonata/script.js')
  }
}

test('createSonataScraper targets the Sonata Darwinbox host', async () => {
  const { createSonataScraper } = await loadSonataModule()
  const scraper = createSonataScraper()

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://sonataone.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://sonataone.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    scraper.buildJobDetailUrl('a6a0ac761b55be'),
    'https://sonataone.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a0ac761b55be',
  )
})

test('run keeps Sonata jobs on the hosted Darwinbox routes and decorates the shared runner fields', async () => {
  const { createSonataScraper } = await loadSonataModule()
  const scraper = createSonataScraper()
  const requestedPages = []

  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'a6a0ac761b55be',
            title: 'Service Now Technical Architect',
            department_name: 'Service Now',
            locations: 'BG4, Bangalore, Karnataka, India',
            country: 'India',
            emp_type_name: 'Permanent',
            experience: '',
            posted_on: '',
            jd: '<p>ServiceNow architect role</p>',
          },
        ],
        job_counts: 1,
      }
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Sonata Software')
  assert.equal(jobs[0].source, 'sonata')
  assert.equal(jobs[0].city, 'Bangalore')
  assert.equal(
    jobs[0].applyUrl,
    'https://sonataone.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a0ac761b55be',
  )
  assert.equal(
    jobs[0].link,
    'https://sonataone.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a0ac761b55be',
  )
})
