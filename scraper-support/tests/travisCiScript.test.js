import assert from 'node:assert/strict'
import test from 'node:test'

const homepagePage = {
  status: 200,
  url: 'https://www.travis-ci.com/',
  html: `
    <html>
      <head><title>Simple, Flexible, Trustworthy CI/CD Tools - Travis CI</title></head>
      <body>
        <h1>How developers build simple, trustworthy CI/CD pipelines</h1>
        <p>Where developers trust Travis CI with testing and automation</p>
      </body>
    </html>
  `,
}

const aboutPage = {
  status: 200,
  url: 'https://www.travis-ci.com/about-us/',
  html: `
    <html>
      <head><title>Empowering Developers Worldwide Since 2011 - Travis CI</title></head>
      <body>
        <p>Founded in Berlin, Germany, in 2011</p>
        <p>In 2019, Travis CI became part of Idera, Inc.</p>
      </body>
    </html>
  `,
}

const imprintPage = {
  status: 200,
  url: 'https://docs.travis-ci.com/imprint.html',
  html: `
    <html>
      <head><title>Imprint - Travis CI</title></head>
      <body>
        <p>Travis CI GmbH</p>
        <p>51379 Leverkusen</p>
        <a href="https://apply.workable.com/travisci/">Work with Travis CI</a>
      </body>
    </html>
  `,
}

const careers404Page = {
  status: 404,
  url: 'https://www.travis-ci.com/careers',
  html: '<html><head><title>Page not found - Travis CI</title></head><body></body></html>',
}

const jobs404Page = {
  status: 404,
  url: 'https://www.travis-ci.com/jobs',
  html: '<html><head><title>Page not found - Travis CI</title></head><body></body></html>',
}

const workableBoardPage = {
  status: 200,
  url: 'https://apply.workable.com/travisci/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Travis CI - Current Openings</title>
        <link rel="canonical" href="https://apply.workable.com/travisci/" />
        <meta name="subdomain" content="travisci" />
        <script>window.careers = { config: {} };</script>
      </head>
      <body><div id="app"></div></body>
    </html>
  `,
}

const emptyJobsMarkdown = `# Travis CI — All Open Positions

> Last updated: 2026-07-25

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|-----------|----------|------|--------|--------|---------|

---
Powered by [Workable](https://www.workable.com)
`

const jobsMarkdownWithIndiaAndUsRoles = `# Travis CI — All Open Positions

> Last updated: 2026-07-25

| Title | Department | Location | Type | Salary | Posted | Details |
|-------|-----------|----------|------|--------|--------|---------|
| Developer Advocate | Engineering | Bengaluru, Karnataka, India | Full-time | - | 2026-07-25 | [View](https://apply.workable.com/travisci/jobs/view/ABC123.md) |
| Sales Engineer | Revenue | Austin, Texas, United States | Full-time | - | 2026-07-24 | [View](https://apply.workable.com/travisci/jobs/view/US999.md) |

---
Powered by [Workable](https://www.workable.com)
`

const emptyWidgetPayload = {
  name: 'Travis CI',
  description: 'Travis CI is a continuous integration and delivery platform.',
  jobs: [],
}

const widgetPayloadWithJobs = {
  name: 'Travis CI',
  description: 'Travis CI is a continuous integration and delivery platform.',
  jobs: [{ shortcode: 'ABC123' }],
}

const loadTravisCiModule = async () => {
  try {
    return await import('../../scraper/travisci/script.js')
  } catch {
    assert.fail('Expected Travis CI scraper module at ../../scraper/travisci/script.js')
  }
}

test('Travis CI helper predicates stay pinned to the verified homepage, imprint, 404, and Workable surfaces', async () => {
  const travisci = await loadTravisCiModule()

  assert.equal(travisci.SOURCE, 'travisci')
  assert.equal(travisci.COMPANY, 'Travis CI')
  assert.equal(travisci.OFFICIAL_BRAND_NAME, 'Travis CI')
  assert.equal(travisci.HOMEPAGE_URL, 'https://www.travis-ci.com/')
  assert.equal(travisci.ABOUT_PAGE_URL, 'https://www.travis-ci.com/about-us/')
  assert.equal(travisci.IMPRINT_PAGE_URL, 'https://docs.travis-ci.com/imprint.html')
  assert.equal(travisci.WORKABLE_BOARD_URL, 'https://apply.workable.com/travisci/')
  assert.equal(travisci.JOBS_FEED_URL, 'https://apply.workable.com/travisci/jobs.md')
  assert.equal(
    travisci.WIDGET_API_URL,
    'https://apply.workable.com/api/v1/widget/accounts/travisci',
  )
  assert.equal(travisci.hasOfficialHomepageSignal(homepagePage), true)
  assert.equal(travisci.hasAboutPageSignal(aboutPage), true)
  assert.equal(travisci.hasImprintSignal(imprintPage), true)
  assert.equal(
    travisci.hasVerifiedMissingJobRoute(careers404Page, 'https://www.travis-ci.com/careers'),
    true,
  )
  assert.equal(travisci.hasWorkableBoardSignal(workableBoardPage), true)
  assert.equal(travisci.hasOfficialJobsFeedSignal(emptyJobsMarkdown), true)
  assert.equal(travisci.hasWidgetApiSignal(emptyWidgetPayload), true)
  assert.deepEqual(
    travisci.extractJobsFromMarkdown(jobsMarkdownWithIndiaAndUsRoles),
    [
      {
        title: 'Developer Advocate',
        company: 'Travis CI',
        department: 'Engineering',
        location: 'Bengaluru, Karnataka, India',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        jobId: 'ABC123',
        requisitionId: 'ABC123',
        sourceUrl: 'https://apply.workable.com/travisci/j/ABC123/',
        applyUrl: 'https://apply.workable.com/travisci/j/ABC123/apply',
        employmentType: 'Full-time',
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: '2026-07-25',
        closingDate: null,
        jobDescription: null,
      },
    ],
  )
})

test('Travis CI run returns [] while the verified Workable board remains live and empty', async () => {
  const travisci = await loadTravisCiModule()
  const pageRequests = []
  const textRequests = []
  const jsonRequests = []

  const jobs = await travisci.createTravisCiScraper({
    now: () => '2026-07-25T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      pageRequests.push(url)
      if (url === travisci.HOMEPAGE_URL) return homepagePage
      if (url === travisci.ABOUT_PAGE_URL) return aboutPage
      if (url === travisci.IMPRINT_PAGE_URL) return imprintPage
      if (url === 'https://www.travis-ci.com/careers') return careers404Page
      if (url === 'https://www.travis-ci.com/jobs') return jobs404Page
      if (url === travisci.WORKABLE_BOARD_URL) return workableBoardPage
      throw new Error(`Unexpected Travis CI page URL: ${url}`)
    },
    fetchText: async (url) => {
      textRequests.push(url)
      if (url === travisci.JOBS_FEED_URL) return emptyJobsMarkdown
      throw new Error(`Unexpected Travis CI text URL: ${url}`)
    },
    fetchJson: async (url) => {
      jsonRequests.push(url)
      if (url === travisci.WIDGET_API_URL) return emptyWidgetPayload
      throw new Error(`Unexpected Travis CI JSON URL: ${url}`)
    },
  })

  assert.deepEqual(pageRequests, [
    travisci.HOMEPAGE_URL,
    travisci.ABOUT_PAGE_URL,
    travisci.IMPRINT_PAGE_URL,
    'https://www.travis-ci.com/careers',
    'https://www.travis-ci.com/jobs',
    travisci.WORKABLE_BOARD_URL,
  ])
  assert.deepEqual(textRequests, [travisci.JOBS_FEED_URL])
  assert.deepEqual(jsonRequests, [travisci.WIDGET_API_URL])
  assert.deepEqual(jobs, [])
})

test('Travis CI run parses India jobs from the official Workable markdown feed when openings appear', async () => {
  const travisci = await loadTravisCiModule()

  const jobs = await travisci.createTravisCiScraper({
    now: () => '2026-07-25T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      if (url === travisci.HOMEPAGE_URL) return homepagePage
      if (url === travisci.ABOUT_PAGE_URL) return aboutPage
      if (url === travisci.IMPRINT_PAGE_URL) return imprintPage
      if (url === 'https://www.travis-ci.com/careers') return careers404Page
      if (url === 'https://www.travis-ci.com/jobs') return jobs404Page
      return workableBoardPage
    },
    fetchText: async () => jobsMarkdownWithIndiaAndUsRoles,
    fetchJson: async () => widgetPayloadWithJobs,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Developer Advocate',
      company: 'Travis CI',
      department: 'Engineering',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: 'ABC123',
      requisitionId: 'ABC123',
      sourceUrl: 'https://apply.workable.com/travisci/j/ABC123/',
      applyUrl: 'https://apply.workable.com/travisci/j/ABC123/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-25',
      closingDate: null,
      jobDescription: null,
      source: 'travisci',
      link: 'https://apply.workable.com/travisci/j/ABC123/apply',
      scrapedAt: '2026-07-25T12:00:00.000Z',
    },
  ])
})

test('Travis CI fails closed when the verified surfaces drift', async () => {
  const travisci = await loadTravisCiModule()

  await assert.rejects(
    travisci.createTravisCiScraper().run({
      fetchPage: async () => ({ ...homepagePage, html: '<html><body>Broken</body></html>' }),
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    travisci.createTravisCiScraper().run({
      fetchPage: async (url) => {
        if (url === travisci.HOMEPAGE_URL) return homepagePage
        return { ...aboutPage, html: '<html><body>Broken</body></html>' }
      },
    }),
    /verified about page/i,
  )

  await assert.rejects(
    travisci.createTravisCiScraper().run({
      fetchPage: async (url) => {
        if (url === travisci.HOMEPAGE_URL) return homepagePage
        if (url === travisci.ABOUT_PAGE_URL) return aboutPage
        return { ...imprintPage, html: '<html><body>Broken</body></html>' }
      },
    }),
    /verified imprint handoff/i,
  )

  await assert.rejects(
    travisci.createTravisCiScraper().run({
      fetchPage: async (url) => {
        if (url === travisci.HOMEPAGE_URL) return homepagePage
        if (url === travisci.ABOUT_PAGE_URL) return aboutPage
        if (url === travisci.IMPRINT_PAGE_URL) return imprintPage
        return { status: 200, url, html: '<html><head><title>Current Openings</title></head></html>' }
      },
    }),
    /verified main-domain missing careers route changed materially/i,
  )

  await assert.rejects(
    travisci.createTravisCiScraper().run({
      fetchPage: async (url) => {
        if (url === travisci.HOMEPAGE_URL) return homepagePage
        if (url === travisci.ABOUT_PAGE_URL) return aboutPage
        if (url === travisci.IMPRINT_PAGE_URL) return imprintPage
        if (url === 'https://www.travis-ci.com/careers') return careers404Page
        if (url === 'https://www.travis-ci.com/jobs') return jobs404Page
        return { ...workableBoardPage, html: '<html><body>Broken</body></html>' }
      },
    }),
    /verified Workable board/i,
  )

  await assert.rejects(
    travisci.createTravisCiScraper().run({
      fetchPage: async (url) => {
        if (url === travisci.HOMEPAGE_URL) return homepagePage
        if (url === travisci.ABOUT_PAGE_URL) return aboutPage
        if (url === travisci.IMPRINT_PAGE_URL) return imprintPage
        if (url === 'https://www.travis-ci.com/careers') return careers404Page
        if (url === 'https://www.travis-ci.com/jobs') return jobs404Page
        return workableBoardPage
      },
      fetchText: async () => 'not a workable markdown feed',
    }),
    /verified Workable jobs feed/i,
  )

  await assert.rejects(
    travisci.createTravisCiScraper().run({
      fetchPage: async (url) => {
        if (url === travisci.HOMEPAGE_URL) return homepagePage
        if (url === travisci.ABOUT_PAGE_URL) return aboutPage
        if (url === travisci.IMPRINT_PAGE_URL) return imprintPage
        if (url === 'https://www.travis-ci.com/careers') return careers404Page
        if (url === 'https://www.travis-ci.com/jobs') return jobs404Page
        return workableBoardPage
      },
      fetchText: async () => emptyJobsMarkdown,
      fetchJson: async () => ({ name: 'Travis CI', description: '', jobs: null }),
    }),
    /verified Workable widget payload/i,
  )
})
