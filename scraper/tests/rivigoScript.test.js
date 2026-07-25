import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedEmptyBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Rivigo</title>
  </head>
  <body>
    <header>
      <a href="https://rivigo.com/">Home</a>
      <span>@Rivigo</span>
    </header>
    <main>
      <h1>Careers | Rivigo</h1>
      <p>We are building the next generation logistics platform.</p>
      <p>No Requsitions Found</p>
      <p>Job Openings 0 - 0 of 0</p>
      <p>Copyright © 2016. Rivigo Services Pvt Ltd</p>
    </main>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Rivigo</title>
  </head>
  <body>
    <header>
      <a href="https://rivigo.com/">Home</a>
      <span>@Rivigo</span>
    </header>
    <main>
      <h1>Careers | Rivigo</h1>
      <p>We are building the next generation logistics platform.</p>
      <p>Job Openings 1 - 2 of 2</p>
      <article class="opening-card">
        <h2>Senior Manager, Operations</h2>
        <a href="/job/123">View details</a>
      </article>
    </main>
  </body>
</html>
`

const loadRivigoModule = async () => {
  try {
    return await import('../rivigo/script.js')
  } catch {
    assert.fail('Expected Rivigo scraper module at ../rivigo/script.js')
  }
}

test('Rivigo helper signals stay pinned to the verified empty-board careers surface', async () => {
  const rivigo = await loadRivigoModule()

  assert.equal(rivigo.SOURCE, 'rivigo')
  assert.equal(rivigo.COMPANY, 'Rivigo')
  assert.equal(rivigo.HOMEPAGE_URL, 'https://www.rivigo.com/')
  assert.equal(rivigo.CAREERS_URL, 'https://careers-rivigo.flexiele.com/')
  assert.equal(rivigo.VERIFIED_ON, '2026-07-17')
  assert.equal(rivigo.hasVerifiedCareersPageSignal(verifiedEmptyBoardHtml), true)
  assert.deepEqual(rivigo.extractJobOpeningCounts(verifiedEmptyBoardHtml), {
    start: 0,
    end: 0,
    total: 0,
  })
  assert.equal(rivigo.hasVerifiedEmptyBoardSignals(verifiedEmptyBoardHtml), true)
  assert.equal(rivigo.hasPublicJobSignals(verifiedEmptyBoardHtml), false)
  assert.equal(rivigo.hasPublicJobSignals(publicJobsHtml), true)
})

test('Rivigo returns [] while the verified first-party careers board shows no public openings', async () => {
  const rivigo = await loadRivigoModule()
  const requestedUrls = []

  const jobs = await rivigo.createRivigoScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === rivigo.CAREERS_URL) return verifiedEmptyBoardHtml
      throw new Error(`Unexpected Rivigo fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [rivigo.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Rivigo fails closed when the verified empty-board surface drifts or starts exposing openings', async () => {
  const rivigo = await loadRivigoModule()

  await assert.rejects(
    rivigo.createRivigoScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified first-party careers surface/i,
  )

  await assert.rejects(
    rivigo.createRivigoScraper().run({
      fetchText: async () => publicJobsHtml,
    }),
    /public jobs surface/i,
  )
})
