import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Dagster | Help Shape Data's Future</title>
  </head>
  <body>
    <main>
      <h1>Join the Dagster Team</h1>
      <p>Help us shape the future of data orchestration.</p>
      <a href="https://job-boards.greenhouse.io/dagsterlabs">View Open Positions</a>
      <section>
        <h2>Open Roles</h2>
        <p>We're not currently hiring, but check back soon! In the meantime, feel free to follow us on LinkedIn.</p>
      </section>
      <footer>
        <p>Copyright © 2026 Elementl, Inc. d.b.a. Dagster Labs. All rights reserved.</p>
      </footer>
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
    return await import('../dagster/script.js')
  } catch {
    assert.fail('Expected Dagster scraper module at ../dagster/script.js')
  }
}

test('Dagster pins the verified official careers page and empty Greenhouse board constants', async () => {
  const dagster = await loadDagsterModule()

  assert.equal(dagster.SOURCE, 'dagster')
  assert.equal(dagster.COMPANY_NAME, 'Dagster')
  assert.equal(dagster.OFFICIAL_BRAND_NAME, 'Dagster Labs')
  assert.equal(dagster.CAREERS_URL, 'https://dagster.io/company/careers')
  assert.equal(dagster.GREENHOUSE_BOARD_URL, 'https://job-boards.greenhouse.io/dagsterlabs')
  assert.equal(dagster.hasOfficialCareersPageSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(dagster.hasEmptyGreenhouseBoardSignal(GREENHOUSE_BOARD_HTML), true)
})

test('Dagster returns an honest empty result while the verified official careers and board surfaces remain empty', async () => {
  const dagster = await loadDagsterModule()
  const requested = []

  const jobs = await dagster.createDagsterScraper().run({
    fetchText: async (url) => {
      requested.push(url)
      if (url === dagster.CAREERS_URL) return OFFICIAL_CAREERS_HTML
      if (url === dagster.GREENHOUSE_BOARD_URL) return GREENHOUSE_BOARD_HTML
      throw new Error(`Unexpected Dagster fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    dagster.CAREERS_URL,
    dagster.GREENHOUSE_BOARD_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Dagster fails closed when the verified careers page or empty Greenhouse board drifts', async () => {
  const dagster = await loadDagsterModule()

  await assert.rejects(
    dagster.createDagsterScraper().run({
      fetchText: async (url) => {
        if (url === dagster.CAREERS_URL) {
          return OFFICIAL_CAREERS_HTML.replace('View Open Positions', 'Explore Roles')
        }
        return GREENHOUSE_BOARD_HTML
      },
    }),
    /verified dagster careers page/i,
  )

  await assert.rejects(
    dagster.createDagsterScraper().run({
      fetchText: async (url) => {
        if (url === dagster.CAREERS_URL) return OFFICIAL_CAREERS_HTML
        if (url === dagster.GREENHOUSE_BOARD_URL) return GREENHOUSE_BOARD_WITH_ROLE_HTML
        throw new Error(`Unexpected Dagster fixture URL: ${url}`)
      },
    }),
    /verified dagster greenhouse board changed materially/i,
  )
})
