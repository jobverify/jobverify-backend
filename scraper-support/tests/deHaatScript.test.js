import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const homepagePage = {
  status: 200,
  url: 'https://agrevolution.in/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>DeHaat, From Seeds to Market | Online marketplace for farmers</title>
      </head>
      <body>
        <header>
          <a href="/careers">Careers</a>
          <a href="https://apply.workable.com/agrevolution/">Apply Now</a>
        </header>
        <main>
          <h1>From Seeds to Market</h1>
          <p>We are Hiring</p>
        </main>
      </body>
    </html>
  `,
}

const careersPage = {
  status: 200,
  url: 'https://agrevolution.in/careers',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Dehaat - Current Openings</title>
      </head>
      <body>
        <main>
          <h1>Cultivate your potential with DeHaat's career opportunities.</h1>
          <section>
            <h2>Our Work Culture</h2>
            <p>We embrace challenges and grow together.</p>
          </section>
        </main>
      </body>
    </html>
  `,
}

const workableBoardPage = {
  status: 200,
  url: 'https://apply.workable.com/agrevolution/',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Dehaat - Current Openings</title>
        <link rel="canonical" href="https://apply.workable.com/agrevolution/">
        <link rel="alternate" hreflang="en" href="https://apply.workable.com/agrevolution/?lng=en">
        <meta name="subdomain" content="agrevolution">
        <meta name="description" content="DeHaat is the fastest growing AgTech startup in India and the only full stack agri platform in India.">
      </head>
      <body>
        <main>
          <h1>Dehaat - Current Openings</h1>
          <script>window.careers = {"company":"Dehaat"}</script>
        </main>
      </body>
    </html>
  `,
}

const emptyJobsMarkdown = `# Dehaat - All Open Positions

> Last updated: 2026-07-14

| Title | Department | Location | Type | Salary | Posted | Details |
| --- | --- | --- | --- | --- | --- | --- |

---
Powered by [Workable](https://www.workable.com)
`

const jobsMarkdownWithIndiaRole = `# Dehaat - All Open Positions

> Last updated: 2026-07-14

| Title | Department | Location | Type | Salary | Posted | Details |
| --- | --- | --- | --- | --- | --- | --- |
| Senior Backend Engineer | Technology | Bengaluru, Karnataka, India | Full-time | - | 2026-07-10 | [View](https://apply.workable.com/agrevolution/jobs/view/DEHAAT12345.md) |
| Expansion Lead | Strategy | Bangkok, Thailand | Full-time | - | 2026-07-09 | [View](https://apply.workable.com/agrevolution/jobs/view/THAIROLE999.md) |

---
Powered by [Workable](https://www.workable.com)
`

const widgetPayload = {
  name: 'Dehaat',
  description: '<p>DeHaat is the fastest growing AgTech startup in India.</p>',
  jobs: [],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/dehaat/script.js')
  } catch {
    assert.fail('Expected DeHaat scraper module at ../../scraper/dehaat/script.js')
  }
}

test('DeHaat constants and validators stay pinned to the verified first-party and Workable surfaces', async () => {
  const dehaat = await loadModule()

  assert.equal(dehaat.COMPANY_NAME, 'DeHaat')
  assert.equal(dehaat.SOURCE, 'dehaat')
  assert.equal(dehaat.COUNTRY_FILTER, 'India')
  assert.equal(dehaat.HOMEPAGE_URL, 'https://agrevolution.in/')
  assert.equal(dehaat.CAREERS_PAGE_URL, 'https://agrevolution.in/careers')
  assert.equal(dehaat.WORKABLE_BOARD_URL, 'https://apply.workable.com/agrevolution/')
  assert.equal(dehaat.JOBS_FEED_URL, 'https://apply.workable.com/agrevolution/jobs.md')
  assert.equal(
    dehaat.WIDGET_API_URL,
    'https://apply.workable.com/api/v1/widget/accounts/agrevolution',
  )
  assert.equal(dehaat.VERIFIED_ON, '2026-07-15')
  assert.equal(dehaat.hasOfficialHomepageSignal(homepagePage), true)
  assert.equal(dehaat.hasOfficialCareersPageSignal(careersPage), true)
  assert.equal(dehaat.hasWorkableBoardSignal(workableBoardPage), true)
  assert.equal(dehaat.hasOfficialJobsFeedSignal(emptyJobsMarkdown), true)
  assert.equal(dehaat.hasWidgetApiSignal(widgetPayload), true)
  assert.deepEqual(dehaat.extractJobsFromMarkdown(emptyJobsMarkdown), [])

  assert.deepEqual(dehaat.extractJobsFromMarkdown(jobsMarkdownWithIndiaRole), [
    {
      title: 'Senior Backend Engineer',
      company: 'DeHaat',
      department: 'Technology',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      jobId: 'DEHAAT12345',
      requisitionId: 'DEHAAT12345',
      sourceUrl: 'https://apply.workable.com/agrevolution/j/DEHAAT12345/',
      applyUrl: 'https://apply.workable.com/agrevolution/j/DEHAAT12345/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10',
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('run validates the verified DeHaat surfaces and returns no jobs for the current empty public board', async () => {
  const dehaat = await loadModule()
  const requestedUrls = []

  const jobs = await dehaat.createDeHaatScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === dehaat.HOMEPAGE_URL) return homepagePage
      if (url === dehaat.CAREERS_PAGE_URL) return careersPage
      if (url === dehaat.WORKABLE_BOARD_URL) return workableBoardPage

      throw new Error(`Unexpected DeHaat page URL: ${url}`)
    },
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === dehaat.JOBS_FEED_URL) return emptyJobsMarkdown

      throw new Error(`Unexpected DeHaat feed URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (url === dehaat.WIDGET_API_URL) return widgetPayload

      throw new Error(`Unexpected DeHaat widget URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    dehaat.HOMEPAGE_URL,
    dehaat.CAREERS_PAGE_URL,
    dehaat.WORKABLE_BOARD_URL,
    dehaat.JOBS_FEED_URL,
    dehaat.WIDGET_API_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('DeHaat scraper fails closed when any verified public-surface checkpoint drifts', async () => {
  const dehaat = await loadModule()

  await assert.rejects(
    dehaat.createDeHaatScraper().run({
      fetchPage: async (url) => {
        if (url === dehaat.HOMEPAGE_URL) {
          return {
            ...homepagePage,
            html: homepagePage.html.replace('Apply Now', 'Join Us'),
          }
        }

        if (url === dehaat.CAREERS_PAGE_URL) return careersPage
        if (url === dehaat.WORKABLE_BOARD_URL) return workableBoardPage
        return homepagePage
      },
      fetchText: async () => emptyJobsMarkdown,
      fetchJson: async () => widgetPayload,
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    dehaat.createDeHaatScraper().run({
      fetchPage: async (url) => {
        if (url === dehaat.HOMEPAGE_URL) return homepagePage
        if (url === dehaat.CAREERS_PAGE_URL) {
          return {
            ...careersPage,
            html: careersPage.html.replace('Cultivate your potential', 'Explore opportunities'),
          }
        }

        if (url === dehaat.WORKABLE_BOARD_URL) return workableBoardPage
        return homepagePage
      },
      fetchText: async () => emptyJobsMarkdown,
      fetchJson: async () => widgetPayload,
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    dehaat.createDeHaatScraper().run({
      fetchPage: async (url) => {
        if (url === dehaat.HOMEPAGE_URL) return homepagePage
        if (url === dehaat.CAREERS_PAGE_URL) return careersPage
        if (url === dehaat.WORKABLE_BOARD_URL) {
          return {
            ...workableBoardPage,
            html: workableBoardPage.html.replace('window.careers =', 'window.board ='),
          }
        }

        return homepagePage
      },
      fetchText: async () => emptyJobsMarkdown,
      fetchJson: async () => widgetPayload,
    }),
    /verified workable board/i,
  )

  await assert.rejects(
    dehaat.createDeHaatScraper().run({
      fetchPage: async (url) => {
        if (url === dehaat.HOMEPAGE_URL) return homepagePage
        if (url === dehaat.CAREERS_PAGE_URL) return careersPage
        if (url === dehaat.WORKABLE_BOARD_URL) return workableBoardPage
        return homepagePage
      },
      fetchText: async () => '# Dehaat jobs',
      fetchJson: async () => widgetPayload,
    }),
    /verified workable jobs feed/i,
  )

  await assert.rejects(
    dehaat.createDeHaatScraper().run({
      fetchPage: async (url) => {
        if (url === dehaat.HOMEPAGE_URL) return homepagePage
        if (url === dehaat.CAREERS_PAGE_URL) return careersPage
        if (url === dehaat.WORKABLE_BOARD_URL) return workableBoardPage
        return homepagePage
      },
      fetchText: async () => emptyJobsMarkdown,
      fetchJson: async () => ({ name: 'DeHaat' }),
    }),
    /verified workable widget payload/i,
  )
})
