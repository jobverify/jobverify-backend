import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-25T00:00:00.000Z'

const companyHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Prefect - Company & Mission</title>
  </head>
  <body>
    <main>
      <h1>We are Prefect</h1>
      <p>Defining automation for the context era.</p>
      <section>
        <h2>Join the team defining the future of workflow automation</h2>
        <a href="https://jobs.ashbyhq.com/prefect">Careers</a>
        <a href="/careers">See Open Roles</a>
      </section>
    </main>
  </body>
</html>
`

const ashbyPayload = {
  jobs: [
    {
      id: 'platform-engineer-india',
      title: 'Platform Engineer',
      department: 'Engineering',
      team: 'Cloud',
      employmentType: 'FullTime',
      location: 'Remote',
      secondaryLocations: [
        {
          location: 'Remote India',
          address: {
            postalAddress: {
              addressCountry: 'India',
              addressLocality: 'Bengaluru',
              addressRegion: 'Karnataka',
            },
          },
        },
      ],
      publishedAt: '2026-07-24T10:00:00.000Z',
      isListed: true,
      isRemote: true,
      workplaceType: 'Remote',
      address: {
        postalAddress: {
          addressCountry: 'United States',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/prefect/platform-engineer-india',
      applyUrl: 'https://jobs.ashbyhq.com/prefect/platform-engineer-india/application',
      descriptionPlain: 'Build and operate Prefect platform infrastructure.',
    },
    {
      id: 'product-engineer-us',
      title: 'Product Engineer (Fullstack, Cloud)',
      department: 'Engineering',
      team: 'Cloud',
      employmentType: 'FullTime',
      location: 'Remote',
      secondaryLocations: [],
      publishedAt: '2026-07-24T11:00:00.000Z',
      isListed: true,
      isRemote: true,
      workplaceType: 'Remote',
      address: {
        postalAddress: {
          addressCountry: 'United States',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/prefect/product-engineer-us',
      applyUrl: 'https://jobs.ashbyhq.com/prefect/product-engineer-us/application',
      descriptionPlain: 'Build product experiences for Prefect Cloud.',
    },
    {
      id: 'ignore-me',
      title: 'Unlisted Role',
      department: 'Operations',
      employmentType: 'Contract',
      location: 'India',
      secondaryLocations: [],
      publishedAt: '2026-07-20T00:00:00.000Z',
      isListed: false,
      isRemote: false,
      workplaceType: 'OnSite',
      address: {
        postalAddress: {
          addressCountry: 'India',
        },
      },
      jobUrl: 'https://jobs.ashbyhq.com/prefect/ignore-me',
      applyUrl: 'https://jobs.ashbyhq.com/prefect/ignore-me/application',
      descriptionPlain: 'This role should be ignored.',
    },
  ],
}

const nonIndiaPayload = {
  jobs: ashbyPayload.jobs.filter((job) => job.id !== 'platform-engineer-india'),
}

const loadPrefectModule = async () => {
  try {
    return await import('../prefect/script.js')
  } catch {
    assert.fail('Expected Prefect scraper module at ../prefect/script.js')
  }
}

test('Prefect pins the verified first-party company page and Ashby endpoints', async () => {
  const prefect = await loadPrefectModule()

  assert.equal(prefect.SOURCE, 'prefect')
  assert.equal(prefect.COMPANY, 'Prefect')
  assert.equal(prefect.COMPANY_PAGE_URL, 'https://www.prefect.io/company')
  assert.equal(prefect.ASHBY_PUBLIC_BOARD_URL, 'https://jobs.ashbyhq.com/prefect')
  assert.equal(
    prefect.ASHBY_JOB_BOARD_URL,
    'https://api.ashbyhq.com/posting-api/job-board/prefect',
  )
  assert.equal(prefect.hasVerifiedCompanyPageSignal(companyHtml), true)
  assert.equal(
    prefect.extractVerifiedAshbyPublicBoardUrl(companyHtml),
    'https://jobs.ashbyhq.com/prefect',
  )
  assert.equal(
    prefect.buildAshbyJobBoardUrl('https://jobs.ashbyhq.com/prefect'),
    'https://api.ashbyhq.com/posting-api/job-board/prefect',
  )
})

test('Prefect extracts only listed India jobs from the verified Ashby payload', async () => {
  const prefect = await loadPrefectModule()
  const jobs = prefect.extractAshbyJobs(ashbyPayload)

  assert.deepEqual(jobs, [
    {
      title: 'Platform Engineer',
      company: 'Prefect',
      department: 'Engineering',
      location: 'Remote India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: 'platform-engineer-india',
      requisitionId: 'platform-engineer-india',
      sourceUrl: 'https://jobs.ashbyhq.com/prefect/platform-engineer-india',
      applyUrl: 'https://jobs.ashbyhq.com/prefect/platform-engineer-india/application',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-24T10:00:00.000Z',
      closingDate: null,
      jobDescription: 'Build and operate Prefect platform infrastructure.',
      remoteStatus: 'Remote',
    },
  ])
})

test('Prefect run validates the first-party handoff and returns an authoritative empty result when no India roles remain', async () => {
  const prefect = await loadPrefectModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await prefect.createPrefectScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      if (url === prefect.COMPANY_PAGE_URL) return companyHtml
      throw new Error(`Unexpected Prefect text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      return nonIndiaPayload
    },
  })

  assert.deepEqual(requestedTexts, [prefect.COMPANY_PAGE_URL])
  assert.deepEqual(requestedJson, [prefect.ASHBY_JOB_BOARD_URL])
  assert.deepEqual(jobs, [])
})

test('Prefect fails closed when the verified company page, Ashby handoff, or payload drift', async () => {
  const prefect = await loadPrefectModule()

  await assert.rejects(
    prefect.createPrefectScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
      fetchJson: async () => ashbyPayload,
    }),
    /verified prefect company page/i,
  )

  await assert.rejects(
    prefect.createPrefectScraper().run({
      fetchText: async () =>
        companyHtml.replaceAll('jobs.ashbyhq.com/prefect', 'jobs.ashbyhq.com/not-prefect'),
      fetchJson: async () => ashbyPayload,
    }),
    /verified ashby public board handoff/i,
  )

  await assert.rejects(
    prefect.createPrefectScraper().run({
      fetchText: async () => companyHtml,
      fetchJson: async () => ({ postings: [] }),
    }),
    /verified ashby payload/i,
  )
})
