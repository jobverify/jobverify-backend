import assert from 'node:assert/strict'
import test from 'node:test'

const loadHappiestMindsModule = async () => {
  try {
    return await import('../../scraper/happiestminds/script.js')
  } catch {
    assert.fail('Expected Happiest Minds scraper module at ../../scraper/scraper/happiestminds/script.js')
  }
}

test('createHappiestMindsScraper targets the Happiest Minds Darwinbox host', async () => {
  const { createHappiestMindsScraper } = await loadHappiestMindsModule()
  const scraper = createHappiestMindsScraper()

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://smileshrms.darwinbox.com/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    scraper.buildJobDetailUrl('a68875230db751'),
    'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a68875230db751',
  )
})

test('run keeps Happiest Minds jobs on the hosted Darwinbox routes and decorates the shared runner fields', async () => {
  const { createHappiestMindsScraper } = await loadHappiestMindsModule()
  const scraper = createHappiestMindsScraper()
  const requestedPages = []

  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'a68875230db751',
            title: 'Module Lead',
            department_name: 'MICROSOFT',
            locations: 'Pune, Maharashtra\r, India',
            country: 'India',
            emp_type_name: 'PERMANENT',
            experience: '5 - 7 Years',
            posted_on: '28-Jul-2025',
            jd: '<p>Back end developer with some experience in front end development</p>',
          },
        ],
        job_counts: 1,
      }
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Happiest Minds')
  assert.equal(jobs[0].source, 'happiestminds')
  assert.equal(
    jobs[0].applyUrl,
    'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a68875230db751',
  )
  assert.equal(
    jobs[0].link,
    'https://smileshrms.darwinbox.com/ms/candidatev2/main/careers/jobDetails/a68875230db751',
  )
})
