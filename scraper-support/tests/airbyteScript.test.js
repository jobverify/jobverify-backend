import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-25T00:00:00.000Z'

const CAREERS_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Airbyte Careers | Build the Future of AI with Us</title>
    <meta
      name="description"
      content="Join Airbyte and help build the dream team. Explore open roles in engineering, product, GTM, and operations across global teams."
    />
  </head>
  <body>
    <main>
      <h1>Careers at Airbyte</h1>
      <p>We are developing the data and action layer for AI agents.</p>
      <h2>Find your role</h2>
      <a href="#open-roles">View open roles</a>
    </main>
  </body>
</html>
`

const ASHBY_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Airbyte Jobs</title>
  </head>
  <body>
    <main>
      <h1>Airbyte Jobs</h1>
      <a href="https://jobs.ashbyhq.com/airbyte/efe55756-f28b-4030-b9a0-539f6c8ed8ff">
        Engineering Manager, Platform
      </a>
      <a href="https://jobs.ashbyhq.com/airbyte/b59bbc91-fb77-4a08-9c47-0fca7f755942">
        Senior AI Platform Engineer
      </a>
    </main>
  </body>
</html>
`

const ASHBY_PAYLOAD = {
  jobs: [
    {
      id: 'b59bbc91-fb77-4a08-9c47-0fca7f755942',
      title: 'Senior AI Platform Engineer',
      department: 'Engineering',
      team: 'Engineering',
      employmentType: 'FullTime',
      location: 'San Francisco',
      secondaryLocations: [],
      publishedAt: '2026-07-21T23:11:11.740+00:00',
      isListed: true,
      isRemote: false,
      workplaceType: 'Onsite',
      address: {
        postalAddress: {
          addressLocality: 'San Francisco',
          addressRegion: 'California',
          addressCountry: 'United States',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/airbyte/b59bbc91-fb77-4a08-9c47-0fca7f755942',
      applyUrl: 'https://jobs.ashbyhq.com/airbyte/b59bbc91-fb77-4a08-9c47-0fca7f755942/application',
      descriptionPlain: 'Build the Airbyte AI platform from San Francisco.',
    },
    {
      id: 'efe55756-f28b-4030-b9a0-539f6c8ed8ff',
      title: 'Engineering Manager, Platform',
      department: 'Engineering',
      team: 'Platform',
      employmentType: 'FullTime',
      location: 'San Francisco',
      secondaryLocations: [],
      publishedAt: '2026-06-30T22:04:30.307+00:00',
      isListed: true,
      isRemote: false,
      workplaceType: 'Onsite',
      address: {
        postalAddress: {
          addressLocality: 'San Francisco',
          addressRegion: 'California',
          addressCountry: 'United States',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/airbyte/efe55756-f28b-4030-b9a0-539f6c8ed8ff',
      applyUrl: 'https://jobs.ashbyhq.com/airbyte/efe55756-f28b-4030-b9a0-539f6c8ed8ff/application',
      descriptionPlain: 'Lead the Airbyte platform engineering team in San Francisco.',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/airbyte/script.js')
  } catch {
    assert.fail('Expected Airbyte scraper module at ../../scraper/airbyte/script.js')
  }
}

test('Airbyte pins the verified first-party careers page, public Ashby board, and public Ashby API', async () => {
  const airbyte = await loadModule()

  assert.equal(airbyte.SOURCE, 'airbyte')
  assert.equal(airbyte.COMPANY, 'Airbyte')
  assert.equal(airbyte.CAREERS_PAGE_URL, 'https://airbyte.com/company/careers')
  assert.equal(airbyte.ASHBY_PUBLIC_BOARD_URL, 'https://jobs.ashbyhq.com/airbyte')
  assert.equal(
    airbyte.ASHBY_JOB_BOARD_URL,
    'https://api.ashbyhq.com/posting-api/job-board/airbyte',
  )
  assert.equal(airbyte.hasVerifiedFirstPartyCareersSignal(CAREERS_HTML), true)
  assert.equal(airbyte.hasVerifiedAshbyBoardShellSignal(ASHBY_BOARD_HTML), true)
  assert.equal(
    airbyte.buildAshbyJobBoardUrl('https://jobs.ashbyhq.com/airbyte'),
    'https://api.ashbyhq.com/posting-api/job-board/airbyte',
  )
})

test('Airbyte extracts no jobs when the verified public Ashby payload has no India listings', async () => {
  const airbyte = await loadModule()

  assert.deepEqual(airbyte.extractAshbyJobs(ASHBY_PAYLOAD), [])
})

test('Airbyte run validates the verified first-party surfaces and returns an authoritative empty India result', async () => {
  const airbyte = await loadModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await airbyte.createAirbyteScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)

      if (url === airbyte.CAREERS_PAGE_URL) return CAREERS_HTML
      if (url === airbyte.ASHBY_PUBLIC_BOARD_URL) return ASHBY_BOARD_HTML

      throw new Error(`Unexpected Airbyte text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      return ASHBY_PAYLOAD
    },
  })

  assert.deepEqual(requestedTexts, [
    airbyte.CAREERS_PAGE_URL,
    airbyte.ASHBY_PUBLIC_BOARD_URL,
  ])
  assert.deepEqual(requestedJson, [airbyte.ASHBY_JOB_BOARD_URL])
  assert.deepEqual(jobs, [])
})

test('Airbyte fails closed when the verified careers page, Ashby board shell, or Ashby payload drift', async () => {
  const airbyte = await loadModule()

  await assert.rejects(
    airbyte.createAirbyteScraper().run({
      fetchText: async (url) => {
        if (url === airbyte.CAREERS_PAGE_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        if (url === airbyte.ASHBY_PUBLIC_BOARD_URL) return ASHBY_BOARD_HTML
        throw new Error(`Unexpected Airbyte text URL: ${url}`)
      },
      fetchJson: async () => ASHBY_PAYLOAD,
    }),
    /verified airbyte first-party careers page/i,
  )

  await assert.rejects(
    airbyte.createAirbyteScraper().run({
      fetchText: async (url) => {
        if (url === airbyte.CAREERS_PAGE_URL) return CAREERS_HTML
        if (url === airbyte.ASHBY_PUBLIC_BOARD_URL) {
          return ASHBY_BOARD_HTML.replaceAll('Engineering Manager, Platform', 'Unexpected Role')
        }
        throw new Error(`Unexpected Airbyte text URL: ${url}`)
      },
      fetchJson: async () => ASHBY_PAYLOAD,
    }),
    /verified airbyte ashby board shell/i,
  )

  await assert.rejects(
    airbyte.createAirbyteScraper().run({
      fetchText: async (url) => {
        if (url === airbyte.CAREERS_PAGE_URL) return CAREERS_HTML
        if (url === airbyte.ASHBY_PUBLIC_BOARD_URL) return ASHBY_BOARD_HTML
        throw new Error(`Unexpected Airbyte text URL: ${url}`)
      },
      fetchJson: async () => ({ postings: [] }),
    }),
    /verified airbyte ashby payload/i,
  )
})
