import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers: Join our Team | Seeq</title>
  </head>
  <body>
    <h1>Work with us. Help change manufacturing for the better.</h1>
    <p>We’re a group of talented professionals who are passionate about redefining how process manufacturing organizations do business.</p>
    <a href="https://apply.workable.com/seeq/">See Openings</a>
    <h2>Company culture you’ll want to be a part of.</h2>
    <h3>Some job openings we’re hoping to close.</h3>
    <a href="https://apply.workable.com/seeq/">See Openings</a>
  </body>
</html>
`

const WORKABLE_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Seeq - Current Openings</title>
    <link rel="canonical" href="https://apply.workable.com/seeq/" />
    <meta name="subdomain" content="seeq" />
  </head>
  <body>
    <script>
      window.careers = { account: "seeq" };
    </script>
  </body>
</html>
`

const CURRENT_NON_INDIA_JOBS_MARKDOWN = `# Seeq — All Open Positions

> Last updated: 2026-07-26

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|-----------|----------|------|--------|--------|---------|
| Staff Software Engineer - Platform | Software Engineering | United States (Remote) | Full-time | USD 170,000–170,000 | 2026-06-25 | [View](https://apply.workable.com/seeq/jobs/view/FD4C7FD4F3.md) |
| Principal Customer Success Manager | Customer Success | United Kingdom (Remote) | Full-time | EUR 146,000–146,000 | 2026-04-13 | [View](https://apply.workable.com/seeq/jobs/view/DD468C75CA.md) |

Powered by [Workable](https://www.workable.com)
`

const FUTURE_INDIA_JOBS_MARKDOWN = `# Seeq — All Open Positions

> Last updated: 2026-07-26

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|-----------|----------|------|--------|--------|---------|
| Solutions Engineer | Solutions Engineering | Bengaluru, Karnataka, India | Full-time | INR 3,000,000–3,000,000 | 2026-07-25 | [View](https://apply.workable.com/seeq/jobs/view/ABC123DEF4.md) |

Powered by [Workable](https://www.workable.com)
`

const LEGACY_INDIA_JOBS_MARKDOWN = `# Seeq - Current Openings

1 current opening

- [Solutions Engineer](https://apply.workable.com/seeq/j/LEGACY1234/) - Bengaluru, Karnataka, India

Powered by [Workable](https://www.workable.com)
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/seeq/script.js')
  } catch {
    assert.fail('Expected Seeq scraper module at ../../scraper/seeq/script.js')
  }
}

test('Seeq helper exports stay pinned to the verified careers handoff, Workable board, and India-filtered feed contract', async () => {
  const seeq = await loadScriptModule()

  assert.equal(seeq.SOURCE, 'seeq')
  assert.equal(seeq.COMPANY, 'Seeq')
  assert.equal(seeq.OFFICIAL_BRAND_NAME, 'Seeq')
  assert.equal(seeq.VERIFIED_ON, '2026-07-17')
  assert.equal(seeq.HOMEPAGE_URL, 'https://www.seeq.com/')
  assert.equal(seeq.CAREERS_URL, 'https://www.seeq.com/careers/')
  assert.equal(seeq.WORKABLE_BOARD_URL, 'https://apply.workable.com/seeq/')
  assert.equal(seeq.JOBS_FEED_URL, 'https://apply.workable.com/seeq/jobs.md')
  assert.equal(seeq.hasOfficialCareersPageSignal(CAREERS_PAGE_HTML), true)
  assert.equal(seeq.hasOfficialWorkableBoardSignal(WORKABLE_BOARD_HTML), true)
  assert.equal(seeq.hasOfficialJobsFeedSignal(CURRENT_NON_INDIA_JOBS_MARKDOWN), true)
  assert.deepEqual(seeq.extractJobsFromMarkdown(CURRENT_NON_INDIA_JOBS_MARKDOWN), [])
  assert.deepEqual(seeq.extractJobsFromMarkdown(FUTURE_INDIA_JOBS_MARKDOWN), [
    {
      title: 'Solutions Engineer',
      company: 'Seeq',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: 'ABC123DEF4',
      requisitionId: 'ABC123DEF4',
      sourceUrl: 'https://apply.workable.com/seeq/j/ABC123DEF4/',
      applyUrl: 'https://apply.workable.com/seeq/j/ABC123DEF4/apply',
      department: 'Solutions Engineering',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-25',
      closingDate: null,
      jobDescription: null,
    },
  ])
  assert.deepEqual(seeq.extractJobsFromMarkdown(LEGACY_INDIA_JOBS_MARKDOWN), [
    {
      title: 'Solutions Engineer',
      company: 'Seeq',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: 'LEGACY1234',
      requisitionId: 'LEGACY1234',
      sourceUrl: 'https://apply.workable.com/seeq/j/LEGACY1234/',
      applyUrl: 'https://apply.workable.com/seeq/j/LEGACY1234/apply',
      department: null,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('Seeq run returns [] while the verified Workable board remains live but exposes no India roles', async () => {
  const seeq = await loadScriptModule()
  const requestedTextUrls = []

  const jobs = await seeq.createSeeqScraper({
    now: () => '2026-07-17T12:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === seeq.CAREERS_URL) return CAREERS_PAGE_HTML
      if (url === seeq.WORKABLE_BOARD_URL) return WORKABLE_BOARD_HTML
      if (url === seeq.JOBS_FEED_URL) return CURRENT_NON_INDIA_JOBS_MARKDOWN
      throw new Error(`Unexpected Seeq URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [
    seeq.CAREERS_URL,
    seeq.WORKABLE_BOARD_URL,
    seeq.JOBS_FEED_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Seeq fails closed when the verified first-party handoff, Workable board, or feed contract drifts', async () => {
  const seeq = await loadScriptModule()

  await assert.rejects(
    seeq.createSeeqScraper().run({
      fetchText: async (url) => {
        if (url === seeq.CAREERS_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        throw new Error(`Unexpected Seeq URL: ${url}`)
      },
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    seeq.createSeeqScraper().run({
      fetchText: async (url) => {
        if (url === seeq.CAREERS_URL) return CAREERS_PAGE_HTML
        if (url === seeq.WORKABLE_BOARD_URL) return '<html><body>Unexpected board</body></html>'
        throw new Error(`Unexpected Seeq URL: ${url}`)
      },
    }),
    /verified workable board/i,
  )

  await assert.rejects(
    seeq.createSeeqScraper().run({
      fetchText: async (url) => {
        if (url === seeq.CAREERS_URL) return CAREERS_PAGE_HTML
        if (url === seeq.WORKABLE_BOARD_URL) return WORKABLE_BOARD_HTML
        return 'unexpected feed'
      },
    }),
    /verified workable jobs feed/i,
  )
})
