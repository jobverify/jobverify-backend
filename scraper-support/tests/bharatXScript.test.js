import assert from 'node:assert/strict'
import test from 'node:test'

const loadBharatXModule = async () => {
  try {
    return await import('../../scraper/bharatx/script.js')
  } catch {
    assert.fail('Expected BharatX scraper module at ../../scraper/bharatx/script.js')
  }
}

const officialCareersHtml = `
  <html>
    <head>
      <title>Careers - BharatX</title>
      <link rel="canonical" href="https://bharatx.tech/careers/">
    </head>
    <body>
      <h1>Join Us</h1>
      <h1>Build the future of credit</h1>
      <a href="https://apply.workable.com/bharatx/?lng=en">Check open roles</a>
    </body>
  </html>
`

const emptyJobsMarkdown = `# BharatX — All Open Positions

Last updated: 2026-07-13

Powered by Workable
`

const jobsMarkdownWithIndiaRole = `# BharatX — All Open Positions

- [Backend Engineer](https://apply.workable.com/bharatx/j/ABC123/) - Bengaluru, Karnataka, India

Powered by Workable
`

const jobsTableMarkdownWithIndiaRole = `# BharatX â€” All Open Positions

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|------------|----------|------|--------|--------|---------|
| [Backend Engineer](https://apply.workable.com/bharatx/j/ABC123/) | Engineering | Bengaluru, Karnataka, India | Full-time | - | 2026-07-19 | [View](https://apply.workable.com/bharatx/j/ABC123/) |

Powered by Workable
`

test('BharatX keeps the verified official careers handoff explicit and understands an empty Workable board', async () => {
  const bharatx = await loadBharatXModule()

  assert.equal(bharatx.OFFICIAL_CAREERS_URL, 'https://bharatx.tech/careers/')
  assert.equal(bharatx.BOARD_URL, 'https://apply.workable.com/bharatx/?lng=en')
  assert.equal(bharatx.JOBS_FEED_URL, 'https://apply.workable.com/bharatx/jobs.md')
  assert.equal(bharatx.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.deepEqual(bharatx.extractJobsFromMarkdown(emptyJobsMarkdown), [])
  assert.equal(bharatx.extractJobsFromMarkdown(jobsTableMarkdownWithIndiaRole).length, 1)
})

test('run returns no jobs for the current empty BharatX board and keeps India jobs when Workable feed entries appear', async () => {
  const bharatx = await loadBharatXModule()
  const requestedUrls = []
  const scrapedAt = new Date('2026-07-14T13:45:00.000Z')

  const scraper = bharatx.createBharatXScraper({
    now: () => scrapedAt,
  })

  const noJobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return url === bharatx.OFFICIAL_CAREERS_URL ? officialCareersHtml : emptyJobsMarkdown
    },
  })

  assert.deepEqual(requestedUrls, [bharatx.OFFICIAL_CAREERS_URL, bharatx.JOBS_FEED_URL])
  assert.deepEqual(noJobs, [])

  const jobs = await scraper.run({
    fetchText: async (url) => (url === bharatx.OFFICIAL_CAREERS_URL ? officialCareersHtml : jobsMarkdownWithIndiaRole),
  })

  assert.deepEqual(jobs, [{
    title: 'Backend Engineer',
    company: 'BharatX',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    jobId: 'ABC123',
    requisitionId: 'ABC123',
    sourceUrl: 'https://apply.workable.com/bharatx/j/ABC123/',
    applyUrl: 'https://apply.workable.com/bharatx/j/ABC123/',
    department: null,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    source: 'bharatx',
    link: 'https://apply.workable.com/bharatx/j/ABC123/',
    scrapedAt: '2026-07-14T13:45:00.000Z',
  }])
})

test('BharatX fails closed when the official careers page loses the verified Workable handoff', async () => {
  const bharatx = await loadBharatXModule()
  const scraper = bharatx.createBharatXScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async () => '<html><body>No handoff here</body></html>',
    }),
    /verified official careers page/i,
  )
})
