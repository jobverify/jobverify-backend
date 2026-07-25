import assert from 'node:assert/strict'
import test from 'node:test'

const loadSigtupleModule = async () => {
  try {
    return await import('../sigtuple/script.js')
  } catch {
    assert.fail('Expected Sigtuple scraper module at ../sigtuple/script.js')
  }
}

const emptyJobsMarkdown = `# Sigtuple - Current Openings

0 current openings

Powered by Workable
`

const jobsMarkdownWithIndiaRole = `# Sigtuple - Current Openings

1 current opening

- [Software Engineer, Platform](https://apply.workable.com/sigtuple/j/3F4D5E6C7B8A9/) - Bengaluru, Karnataka, India

Powered by Workable
`

const jobsMarkdownWithMixedLocations = `# Sigtuple - Current Openings

2 current openings

- [Software Engineer, Platform](https://apply.workable.com/sigtuple/j/3F4D5E6C7B8A9/) - Bengaluru, Karnataka, India
- [Clinical Data Analyst](https://apply.workable.com/sigtuple/j/8A7B6C5D4E3F2/) - London, United Kingdom

Powered by Workable
`

test('createSigtupleScraper reads the verified Workable markdown feed and handles the current empty board', async () => {
  const sigtuple = await loadSigtupleModule()
  const requestedUrls = []
  const scrapedAt = new Date('2026-07-10T04:30:00.000Z')

  assert.equal(sigtuple.BOARD_URL, 'https://apply.workable.com/sigtuple/')
  assert.equal(sigtuple.JOBS_FEED_URL, 'https://apply.workable.com/sigtuple/jobs.md')
  assert.deepEqual(sigtuple.extractJobsFromMarkdown(emptyJobsMarkdown), [])

  const scraper = sigtuple.createSigtupleScraper({
    now: () => scrapedAt,
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return emptyJobsMarkdown
    },
  })

  assert.deepEqual(requestedUrls, [sigtuple.JOBS_FEED_URL])
  assert.deepEqual(jobs, [])
})

test('extractJobsFromMarkdown and run preserve a future Sigtuple Workable row in scraper output shape', async () => {
  const sigtuple = await loadSigtupleModule()
  const scrapedAt = new Date('2026-07-10T04:45:00.000Z')

  assert.deepEqual(sigtuple.extractJobsFromMarkdown(jobsMarkdownWithIndiaRole), [{
    title: 'Software Engineer, Platform',
    company: 'Sigtuple',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    jobId: '3F4D5E6C7B8A9',
    requisitionId: '3F4D5E6C7B8A9',
    sourceUrl: 'https://apply.workable.com/sigtuple/j/3F4D5E6C7B8A9/',
    applyUrl: 'https://apply.workable.com/sigtuple/j/3F4D5E6C7B8A9/',
    department: null,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  }])

  const jobs = await sigtuple.createSigtupleScraper({
    now: () => scrapedAt,
  }).run({
    fetchText: async () => jobsMarkdownWithIndiaRole,
  })

  assert.deepEqual(jobs, [{
    title: 'Software Engineer, Platform',
    company: 'Sigtuple',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    jobId: '3F4D5E6C7B8A9',
    requisitionId: '3F4D5E6C7B8A9',
    sourceUrl: 'https://apply.workable.com/sigtuple/j/3F4D5E6C7B8A9/',
    applyUrl: 'https://apply.workable.com/sigtuple/j/3F4D5E6C7B8A9/',
    department: null,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    source: 'sigtuple',
    link: 'https://apply.workable.com/sigtuple/j/3F4D5E6C7B8A9/',
    scrapedAt: '2026-07-10T04:45:00.000Z',
  }])
})

test('extractJobsFromMarkdown ignores future non-India Workable rows for Sigtuple', async () => {
  const sigtuple = await loadSigtupleModule()

  assert.deepEqual(
    sigtuple.extractJobsFromMarkdown(jobsMarkdownWithMixedLocations).map((job) => job.title),
    ['Software Engineer, Platform'],
  )
})
