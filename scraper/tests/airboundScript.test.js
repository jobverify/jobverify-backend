import assert from 'node:assert/strict'
import test from 'node:test'

const indiaJob = {
  id: 'airbound-india-role',
  title: 'Software Engineer',
  isListed: true,
  location: 'Bengaluru',
  address: {
    postalAddress: {
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      addressCountry: 'India',
    },
  },
  department: 'Engineering',
  employmentType: 'FullTime',
  publishedAt: '2026-07-09T00:00:00.000Z',
  descriptionHtml: '<p>Build robotics systems for Airbound.</p>',
  jobUrl: 'https://jobs.ashbyhq.com/airbound/airbound-india-role',
  applyUrl: 'https://jobs.ashbyhq.com/airbound/airbound-india-role/application',
}

const nonIndiaJob = {
  id: 'airbound-us-role',
  title: 'Mechanical Engineer',
  isListed: true,
  location: 'San Francisco, United States',
  address: {
    postalAddress: {
      addressLocality: 'San Francisco',
      addressCountry: 'United States',
    },
  },
  jobUrl: 'https://jobs.ashbyhq.com/airbound/airbound-us-role',
  applyUrl: 'https://jobs.ashbyhq.com/airbound/airbound-us-role/application',
}

const loadAirboundModule = async () => {
  try {
    return await import('../airbound/script.js')
  } catch {
    assert.fail('Expected Airbound scraper module at ../airbound/script.js')
  }
}

test('extractAshbyJobs keeps listed India jobs and excludes non-India jobs for Airbound', async () => {
  const airbound = await loadAirboundModule()
  const jobs = airbound.extractAshbyJobs({ jobs: [indiaJob, nonIndiaJob] })

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Software Engineer',
    company: 'Airbound',
    department: 'Engineering',
    location: 'Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    jobId: 'airbound-india-role',
    requisitionId: 'airbound-india-role',
    sourceUrl: 'https://jobs.ashbyhq.com/airbound/airbound-india-role',
    applyUrl: 'https://jobs.ashbyhq.com/airbound/airbound-india-role/application',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09T00:00:00.000Z',
    closingDate: null,
    jobDescription: '<p>Build robotics systems for Airbound.</p>',
  })
})

test('run pins the verified Airbound Ashby feed and returns runner metadata', async () => {
  const airbound = await loadAirboundModule()
  const requestedUrls = []

  const jobs = await airbound.createAirboundScraper().run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      return { jobs: [indiaJob] }
    },
  })

  assert.equal(airbound.CAREER_PAGE_URL, 'https://www.airbound.com/careers')
  assert.equal(airbound.ASHBY_JOB_BOARD_URL, 'https://api.ashbyhq.com/posting-api/job-board/airbound')
  assert.deepEqual(requestedUrls, [airbound.ASHBY_JOB_BOARD_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'airbound')
  assert.equal(jobs[0].link, 'https://jobs.ashbyhq.com/airbound/airbound-india-role/application')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
