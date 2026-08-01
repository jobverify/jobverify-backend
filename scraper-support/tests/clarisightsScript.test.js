import assert from 'node:assert/strict'
import test from 'node:test'

const careersPageHtml = `
  <html>
    <head><title>Clarisights Careers</title></head>
    <body>
      <h1>Build with Clarisights</h1>
      <iframe src="https://jobs.ashbyhq.com/clarisights/embed"></iframe>
    </body>
  </html>
`

const ashbyPayload = {
  jobs: [
    {
      id: 'clr-1',
      isListed: true,
      title: 'Backend Engineer',
      department: 'Engineering',
      jobUrl: 'https://jobs.ashbyhq.com/clarisights/clr-1',
      applyUrl: 'https://jobs.ashbyhq.com/clarisights/clr-1/application',
      employmentType: 'FullTime',
      publishedAt: '2026-07-14T00:00:00.000Z',
      location: 'Bengaluru, India',
      address: {
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        addressCountry: 'India',
      },
      secondaryLocations: [],
      descriptionHtml: '<p>Build metrics infrastructure.</p>',
    },
    {
      id: 'clr-2',
      isListed: true,
      title: 'Account Executive',
      department: 'Revenue',
      jobUrl: 'https://jobs.ashbyhq.com/clarisights/clr-2',
      applyUrl: 'https://jobs.ashbyhq.com/clarisights/clr-2/application',
      employmentType: 'FullTime',
      publishedAt: '2026-07-14T00:00:00.000Z',
      location: 'London, United Kingdom',
      address: {
        addressLocality: 'London',
        addressRegion: 'England',
        addressCountry: 'United Kingdom',
      },
      secondaryLocations: [],
      descriptionHtml: '<p>Sell analytics products.</p>',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/clarisights/script.js')
  } catch {
    assert.fail('Expected Clarisights scraper module at ../../scraper/clarisights/script.js')
  }
}

test('Clarisights scraper pins the verified first-party careers surface and Ashby job-board API handoff', async () => {
  const clarisights = await loadModule()

  assert.equal(clarisights.CAREERS_PAGE_URL, 'https://careers.clarisights.com/')
  assert.equal(clarisights.ASHBY_JOB_BOARD_URL, 'https://api.ashbyhq.com/posting-api/job-board/clarisights')
  assert.equal(clarisights.hasOfficialCareersSignal(careersPageHtml), true)
  assert.equal(
    clarisights.extractVerifiedAshbyJobBoardUrl(careersPageHtml),
    'https://api.ashbyhq.com/posting-api/job-board/clarisights',
  )
})

test('Clarisights run validates the official careers page and returns only listed India jobs from Ashby', async () => {
  const clarisights = await loadModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await clarisights.createClarisightsScraper({
    now: () => '2026-07-14T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      return careersPageHtml
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      return ashbyPayload
    },
  })

  assert.deepEqual(requestedTexts, [clarisights.CAREERS_PAGE_URL])
  assert.deepEqual(requestedJson, [clarisights.ASHBY_JOB_BOARD_URL])
  assert.deepEqual(jobs, [
    {
      title: 'Backend Engineer',
      company: 'Clarisights',
      department: 'Engineering',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: 'clr-1',
      requisitionId: 'clr-1',
      sourceUrl: 'https://jobs.ashbyhq.com/clarisights/clr-1',
      applyUrl: 'https://jobs.ashbyhq.com/clarisights/clr-1/application',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-14T00:00:00.000Z',
      closingDate: null,
      jobDescription: '<p>Build metrics infrastructure.</p>',
      source: 'clarisights',
      link: 'https://jobs.ashbyhq.com/clarisights/clr-1/application',
      scrapedAt: '2026-07-14T00:00:00.000Z',
    },
  ])
})

test('Clarisights run fails closed when the official careers handoff changes', async () => {
  const clarisights = await loadModule()

  await assert.rejects(
    clarisights.createClarisightsScraper().run({
      fetchText: async () => '<html><body><h1>Clarisights</h1></body></html>',
      fetchJson: async () => ashbyPayload,
    }),
    /verified ashby job-board handoff/i,
  )
})
