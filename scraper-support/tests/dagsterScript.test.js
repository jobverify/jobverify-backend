import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Modern Data Orchestrator Platform | Dagster</title>
  </head>
  <body>
    <p>AI-native DataOps platform</p>
    <h1>Data your team trusts. AI that runs on it.</h1>
    <p>
      Dagster is the operational layer that structures how data is built, observed, and delivered,
      so both teams and AI agents can rely on it.
    </p>
    <a href="https://dagster.plus/">Get started for free</a>
      <footer>
        <p>Copyright Â© 2026 Elementl, Inc. d.b.a. Dagster Labs. All rights reserved.</p>
      </footer>
    </main>
  </body>
</html>
`

const PREFECT_CAREERS_REDIRECT_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Prefect - Open Roles</title>
  </head>
  <body>
    <main>
      <h1>Careers at Prefect - Open Roles</h1>
      <p>Join the team building modern workflow orchestration.</p>
    </main>
  </body>
</html>
`

const GREENHOUSE_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at Dagster Labs</title>
  </head>
  <body>
    <main>
      <h1>Current openings at Dagster Labs</h1>
      <p>There are no current openings.</p>
      <p>Powered by Greenhouse</p>
    </main>
  </body>
</html>
`

const GREENHOUSE_BOARD_WITH_ROLE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Current openings at Dagster Labs</h1>
      <a href="/dagsterlabs/jobs/9999999">Software Engineer</a>
    </main>
  </body>
</html>
`

const loadDagsterModule = async () => {
  try {
    return await import('../../scraper/dagster/script.js')
  } catch {
    assert.fail('Expected Dagster scraper module at ../../scraper/dagster/script.js')
  }
}

test('Dagster pins the verified Dagster homepage, Prefect redirect, and empty Greenhouse board constants', async () => {
  const dagster = await loadDagsterModule()

  assert.equal(dagster.SOURCE, 'dagster')
  assert.equal(dagster.COMPANY_NAME, 'Dagster')
  assert.equal(dagster.OFFICIAL_BRAND_NAME, 'Dagster Labs')
  assert.equal(dagster.HOMEPAGE_URL, 'https://dagster.io/')
  assert.equal(dagster.CAREERS_URL, 'https://dagster.io/company/careers')
  assert.equal(dagster.GREENHOUSE_BOARD_URL, 'https://job-boards.greenhouse.io/dagsterlabs')
  assert.equal(dagster.hasOfficialHomepageSignal(OFFICIAL_HOMEPAGE_HTML), true)
  assert.equal(
    dagster.isVerifiedPrefectCareersRedirect({
      status: 200,
      url: 'https://www.prefect.io/careers',
      html: PREFECT_CAREERS_REDIRECT_HTML,
    }, dagster.CAREERS_URL),
    true,
  )
  assert.equal(dagster.hasEmptyGreenhouseBoardSignal(GREENHOUSE_BOARD_HTML), true)
})

test('Dagster returns an honest empty result while the verified homepage, Prefect redirect, and empty Greenhouse board remain unchanged', async () => {
  const dagster = await loadDagsterModule()
  const requested = []
  const requestedPages = []

  const jobs = await dagster.createDagsterScraper().run({
    fetchText: async (url) => {
      requested.push(url)
      if (url === dagster.HOMEPAGE_URL) return OFFICIAL_HOMEPAGE_HTML
      if (url === dagster.GREENHOUSE_BOARD_URL) return GREENHOUSE_BOARD_HTML
      throw new Error(`Unexpected Dagster fixture URL: ${url}`)
    },
    fetchPage: async (url) => {
      requestedPages.push(url)
      if (url === dagster.CAREERS_URL) {
        return {
          status: 200,
          url: 'https://www.prefect.io/careers',
          html: PREFECT_CAREERS_REDIRECT_HTML,
        }
      }
      throw new Error(`Unexpected Dagster fixture page URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    dagster.HOMEPAGE_URL,
    dagster.GREENHOUSE_BOARD_URL,
  ])
  assert.deepEqual(requestedPages, [
    dagster.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Dagster fails closed when the verified homepage, redirect target, or empty Greenhouse board drifts', async () => {
  const dagster = await loadDagsterModule()

  await assert.rejects(
    dagster.createDagsterScraper().run({
      fetchText: async (url) => {
        if (url === dagster.HOMEPAGE_URL) {
          return OFFICIAL_HOMEPAGE_HTML.replace('AI-native DataOps platform', 'Modern data company')
        }
        return GREENHOUSE_BOARD_HTML
      },
      fetchPage: async () => ({
        status: 200,
        url: 'https://www.prefect.io/careers',
        html: PREFECT_CAREERS_REDIRECT_HTML,
      }),
    }),
    /verified dagster homepage/i,
  )

  await assert.rejects(
    dagster.createDagsterScraper().run({
      fetchText: async (url) => {
        if (url === dagster.HOMEPAGE_URL) return OFFICIAL_HOMEPAGE_HTML
        if (url === dagster.GREENHOUSE_BOARD_URL) return GREENHOUSE_BOARD_WITH_ROLE_HTML
        throw new Error(`Unexpected Dagster fixture URL: ${url}`)
      },
      fetchPage: async () => ({
        status: 200,
        url: 'https://www.prefect.io/careers',
        html: PREFECT_CAREERS_REDIRECT_HTML,
      }),
    }),
    /verified dagster greenhouse board changed materially/i,
  )

  await assert.rejects(
    dagster.createDagsterScraper().run({
      fetchText: async (url) => {
        if (url === dagster.HOMEPAGE_URL) return OFFICIAL_HOMEPAGE_HTML
        if (url === dagster.GREENHOUSE_BOARD_URL) return GREENHOUSE_BOARD_HTML
        throw new Error(`Unexpected Dagster fixture URL: ${url}`)
      },
      fetchPage: async () => ({
        status: 200,
        url: 'https://www.prefect.io/careers',
        html: PREFECT_CAREERS_REDIRECT_HTML.replace('Careers at Prefect - Open Roles', 'Careers at Someone Else'),
      }),
    }),
    /verified dagster careers redirect changed materially/i,
  )
})
