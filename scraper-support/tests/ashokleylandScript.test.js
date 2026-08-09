import assert from 'node:assert/strict'
import test from 'node:test'

const loadAshokLeylandModule = async () => {
  try {
    return await import('../../scraper/ashokleyland/script.js')
  } catch {
    assert.fail('Expected Ashok Leyland scraper module at ../../scraper/scraper/ashokleyland/script.js')
  }
}

test('createAshokLeylandScraper targets the Ashok Leyland Darwinbox host and company id', async () => {
  const { createAshokLeylandScraper } = await loadAshokLeylandModule()
  const scraper = createAshokLeylandScraper()

  assert.equal(
    scraper.buildCareersPageUrl(),
    'https://ashokleyland.darwinbox.in/ms/candidatev2/a61cb038c35a54/careers/allJobs',
  )
  assert.equal(
    scraper.buildListingApiUrl(),
    'https://ashokleyland.darwinbox.in/ms/candidateapi/job/alljobs?companyId=a61cb038c35a54',
  )
  assert.equal(
    scraper.buildJobDetailUrl('a1234567890abc'),
    'https://ashokleyland.darwinbox.in/ms/candidatev2/a61cb038c35a54/careers/jobDetails/a1234567890abc',
  )
})

test('run keeps Ashok Leyland jobs on the hosted Darwinbox routes and decorates the shared runner fields', async () => {
  const { createAshokLeylandScraper } = await loadAshokLeylandModule()
  const scraper = createAshokLeylandScraper()
  const requestedPages = []

  const jobs = await scraper.run({
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'a1234567890abc',
            title: 'Graduate Engineer Trainee',
            department_name: 'Manufacturing',
            locations: 'Hosur, Tamil Nadu, India',
            country: 'India',
            emp_type_name: 'PERMANENT',
            experience: '0 - 1 Years',
            posted_on: '25-Jun-2026',
            jd: '<p>Support production engineering and continuous improvement initiatives.</p>',
          },
        ],
        job_counts: 1,
      }
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Ashok Leyland')
  assert.equal(jobs[0].source, 'ashokleyland')
  assert.equal(
    jobs[0].applyUrl,
    'https://ashokleyland.darwinbox.in/ms/candidatev2/a61cb038c35a54/careers/jobDetails/a1234567890abc',
  )
  assert.equal(
    jobs[0].link,
    'https://ashokleyland.darwinbox.in/ms/candidatev2/a61cb038c35a54/careers/jobDetails/a1234567890abc',
  )
})
