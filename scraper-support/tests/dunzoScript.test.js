import assert from 'node:assert/strict'
import test from 'node:test'

const workableBoardPage = {
  status: 200,
  url: 'https://apply.workable.com/dunzo/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>dunzo - Current Openings</title>
        <link rel="canonical" href="https://apply.workable.com/dunzo/" />
        <meta name="subdomain" content="dunzo" />
        <script>
          window.careers = { features: {}, dimensions: {}, config: {} };
        </script>
      </head>
      <body>
        <div id="app"></div>
      </body>
    </html>
  `,
}

const emptyJobsMarkdown = `# dunzo - All Open Positions

> Last updated: 2026-07-15

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|-----------|----------|------|--------|--------|---------|

---
Powered by [Workable](https://www.workable.com)
`

const jobsMarkdownWithIndiaAndUsRoles = `# dunzo - All Open Positions

> Last updated: 2026-07-15

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|-----------|----------|------|--------|--------|---------|
| Senior Data Scientist | Data | Bengaluru, Karnataka, India | Full-time | - | 2026-07-12 | [View](https://apply.workable.com/dunzo/jobs/view/ABC123.md) |
| Staff Backend Engineer | Engineering | Austin, Texas, United States | Full-time | - | 2026-07-10 | [View](https://apply.workable.com/dunzo/jobs/view/US999.md) |

---
Powered by [Workable](https://www.workable.com)
`

const emptyWidgetPayload = {
  name: 'dunzo',
  description: '',
  jobs: [],
}

const malformedBoardPage = {
  ...workableBoardPage,
  html: '<html><head><title>Broken</title></head><body></body></html>',
}

const malformedWidgetPayload = {
  name: 'dunzo',
  description: '',
  jobs: null,
}

const loadDunzoModule = async () => {
  try {
    return await import('../../scraper/dunzo/script.js')
  } catch {
    assert.fail('Expected Dunzo scraper module at ../../scraper/dunzo/script.js')
  }
}

test('Dunzo scraper helpers stay pinned to the verified loopback-host and empty Workable contracts', async () => {
  const dunzo = await loadDunzoModule()

  assert.equal(dunzo.SOURCE, 'dunzo')
  assert.equal(dunzo.COMPANY, 'Dunzo')
  assert.equal(dunzo.OFFICIAL_BRAND_NAME, 'dunzo')
  assert.equal(dunzo.VERIFIED_ON, '2026-07-15')
  assert.equal(dunzo.HOMEPAGE_URL, 'https://dunzo.com/')
  assert.equal(dunzo.BOARD_URL, 'https://apply.workable.com/dunzo/')
  assert.equal(dunzo.JOBS_FEED_URL, 'https://apply.workable.com/dunzo/jobs.md')
  assert.equal(dunzo.WIDGET_API_URL, 'https://apply.workable.com/api/v1/widget/accounts/dunzo')
  assert.deepEqual(dunzo.OFFICIAL_HOSTNAMES, [
    'dunzo.com',
    'www.dunzo.com',
  ])
  assert.deepEqual(dunzo.VERIFIED_FIRST_PARTY_URLS, [
    'https://dunzo.com/',
    'https://www.dunzo.com/',
    'https://dunzo.com/career',
    'https://dunzo.com/careers',
    'https://dunzo.com/jobs',
  ])
  assert.match(dunzo.VERIFIED_SURFACE_SUMMARY, /127\.0\.0\.1/i)
  assert.equal(dunzo.hasOnlyLoopbackAddresses([]), false)
  assert.equal(dunzo.hasOnlyLoopbackAddresses(['127.0.0.1']), true)
  assert.equal(dunzo.hasOnlyLoopbackAddresses(['127.0.0.1', '::1']), true)
  assert.equal(dunzo.hasOnlyLoopbackAddresses(['127.0.0.1', '104.21.1.1']), false)
  assert.equal(dunzo.hasWorkableBoardSignal(workableBoardPage), true)
  assert.equal(dunzo.hasOfficialJobsFeedSignal(emptyJobsMarkdown), true)
  assert.equal(dunzo.hasWidgetApiSignal(emptyWidgetPayload), true)
  assert.deepEqual(
    dunzo.extractJobsFromMarkdown(jobsMarkdownWithIndiaAndUsRoles),
    [
      {
        title: 'Senior Data Scientist',
        company: 'Dunzo',
        department: 'Data',
        location: 'Bengaluru, Karnataka, India',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        jobId: 'ABC123',
        requisitionId: 'ABC123',
        sourceUrl: 'https://apply.workable.com/dunzo/j/ABC123/',
        applyUrl: 'https://apply.workable.com/dunzo/j/ABC123/apply',
        employmentType: 'Full-time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: '2026-07-12',
        closingDate: null,
        jobDescription: null,
      },
    ],
  )
})

test('Dunzo run returns [] while the verified Workable board remains live and empty', async () => {
  const dunzo = await loadDunzoModule()
  const hostLookups = []
  const pageRequests = []
  const textRequests = []
  const jsonRequests = []

  const jobs = await dunzo.createDunzoScraper({
    now: () => '2026-07-15T12:00:00.000Z',
  }).run({
    resolveHosts: async (hosts) => {
      hostLookups.push([...hosts])
      return ['127.0.0.1']
    },
    fetchPage: async (url) => {
      pageRequests.push(url)
      if (url === dunzo.BOARD_URL) return workableBoardPage
      throw new Error(`Unexpected Dunzo page URL: ${url}`)
    },
    fetchText: async (url) => {
      textRequests.push(url)
      if (url === dunzo.JOBS_FEED_URL) return emptyJobsMarkdown
      throw new Error(`Unexpected Dunzo text URL: ${url}`)
    },
    fetchJson: async (url) => {
      jsonRequests.push(url)
      if (url === dunzo.WIDGET_API_URL) return emptyWidgetPayload
      throw new Error(`Unexpected Dunzo JSON URL: ${url}`)
    },
  })

  assert.deepEqual(hostLookups, [dunzo.OFFICIAL_HOSTNAMES])
  assert.deepEqual(pageRequests, [dunzo.BOARD_URL])
  assert.deepEqual(textRequests, [dunzo.JOBS_FEED_URL])
  assert.deepEqual(jsonRequests, [dunzo.WIDGET_API_URL])
  assert.deepEqual(jobs, [])
})

test('Dunzo run parses India jobs from the Workable markdown feed when openings appear', async () => {
  const dunzo = await loadDunzoModule()

  const jobs = await dunzo.createDunzoScraper({
    now: () => '2026-07-15T12:00:00.000Z',
  }).run({
    resolveHosts: async () => ['127.0.0.1'],
    fetchPage: async () => workableBoardPage,
    fetchText: async () => jobsMarkdownWithIndiaAndUsRoles,
    fetchJson: async () => ({
      name: 'dunzo',
      description: '',
      jobs: [{ shortcode: 'ABC123' }],
    }),
  })

  assert.deepEqual(jobs, [
    {
      title: 'Senior Data Scientist',
      company: 'Dunzo',
      department: 'Data',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: 'ABC123',
      requisitionId: 'ABC123',
      sourceUrl: 'https://apply.workable.com/dunzo/j/ABC123/',
      applyUrl: 'https://apply.workable.com/dunzo/j/ABC123/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-12',
      closingDate: null,
      jobDescription: null,
      source: 'dunzo',
      link: 'https://apply.workable.com/dunzo/j/ABC123/apply',
      scrapedAt: '2026-07-15T12:00:00.000Z',
    },
  ])
})

test('Dunzo fails closed when the official hosts, Workable board, feed, or widget payload drift', async () => {
  const dunzo = await loadDunzoModule()

  await assert.rejects(
    dunzo.createDunzoScraper().run({
      resolveHosts: async () => ['104.21.1.1'],
    }),
    /official hosts no longer match the verified loopback-only state/i,
  )

  await assert.rejects(
    dunzo.createDunzoScraper().run({
      resolveHosts: async () => ['127.0.0.1'],
      fetchPage: async () => malformedBoardPage,
    }),
    /verified workable board/i,
  )

  await assert.rejects(
    dunzo.createDunzoScraper().run({
      resolveHosts: async () => ['127.0.0.1'],
      fetchPage: async () => workableBoardPage,
      fetchText: async () => 'not a workable markdown feed',
    }),
    /verified workable jobs feed/i,
  )

  await assert.rejects(
    dunzo.createDunzoScraper().run({
      resolveHosts: async () => ['127.0.0.1'],
      fetchPage: async () => workableBoardPage,
      fetchText: async () => emptyJobsMarkdown,
      fetchJson: async () => malformedWidgetPayload,
    }),
    /verified workable widget payload/i,
  )
})
