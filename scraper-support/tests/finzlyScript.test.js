import assert from 'node:assert/strict'
import test from 'node:test'

const loadFinzlyModule = async () => {
  try {
    return await import('../../scraper/finzly/script.js')
  } catch {
    assert.fail('Expected Finzly scraper module at ../../scraper/finzly/script.js')
  }
}

const emptyJobsMarkdown = `# Finzly - Current Openings

0 current openings

Powered by Workable
`

const jobsMarkdownWithIndiaRole = `# Finzly - Current Openings

1 current opening

- [Senior Platform Engineer](https://apply.workable.com/finzly/j/ABC123/) - Bengaluru, Karnataka, India

Powered by Workable
`

test('extractJobsFromMarkdown parses Workable jobs.md content and understands an empty Finzly board', async () => {
  const finzly = await loadFinzlyModule()

  assert.equal(finzly.BOARD_URL, 'https://apply.workable.com/finzly/')
  assert.equal(finzly.JOBS_FEED_URL, 'https://apply.workable.com/finzly/jobs.md')
  assert.deepEqual(finzly.extractJobsFromMarkdown(emptyJobsMarkdown), [])
})

test('run returns no jobs for the current empty Finzly board and keeps India jobs when Workable feed entries appear', async () => {
  const finzly = await loadFinzlyModule()
  const requestedUrls = []
  const scrapedAt = new Date('2026-07-09T13:45:00.000Z')

  const scraper = finzly.createFinzlyScraper({
    now: () => scrapedAt,
  })

  const noJobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return emptyJobsMarkdown
    },
  })

  assert.deepEqual(requestedUrls, [finzly.JOBS_FEED_URL])
  assert.deepEqual(noJobs, [])

  const jobs = await scraper.run({
    fetchText: async () => jobsMarkdownWithIndiaRole,
  })

  assert.deepEqual(jobs, [{
    title: 'Senior Platform Engineer',
    company: 'Finzly',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    jobId: 'ABC123',
    requisitionId: 'ABC123',
    sourceUrl: 'https://apply.workable.com/finzly/j/ABC123/',
    applyUrl: 'https://apply.workable.com/finzly/j/ABC123/',
    department: null,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    source: 'finzly',
    link: 'https://apply.workable.com/finzly/j/ABC123/',
    scrapedAt: '2026-07-09T13:45:00.000Z',
  }])
})
