import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs</title>
  </head>
  <body>
    <main>
      <section id="top">
        <h1>Help us change the way the world builds amazing apps.</h1>
        <a href="/about/jobs#positions">See open positions</a>
      </section>
      <section id="positions">
        <h2>Open positions</h2>
        <p>
          Here’s what we’re looking for right now. Don’t see your specific position below?
          Just <a href="mailto: joinus@ionic.io">drop us a line</a>.
        </p>
      </section>
      <footer>
        <p>An OutSystems company.</p>
      </footer>
    </main>
  </body>
</html>
`

const driftedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Ionic</title>
  </head>
  <body>
    <h1>Join our network</h1>
  </body>
</html>
`

const brokenLeverProxyPayload = {
  ok: true,
  data: {
    ok: false,
    error: 'Document not found',
  },
}

const liveLeverProxyPayload = {
  ok: true,
  data: [
    {
      text: 'Senior Developer Relations Engineer',
      hostedUrl: 'https://jobs.lever.co/Ionic/abc123',
      categories: {
        team: 'Engineering',
        location: 'Remote',
        commitment: 'Full-time',
      },
    },
  ],
}

const notFoundBoardPage = {
  status: 404,
  finalUrl: 'https://jobs.lever.co/Ionic',
  text: '<!doctype html><html><head><title>Not found – 404 error</title></head><body>Document not found</body></html>',
}

const liveBoardPage = {
  status: 200,
  finalUrl: 'https://jobs.lever.co/Ionic',
  text: '<!doctype html><html><head><title>Ionic Jobs</title></head><body>Open positions</body></html>',
}

const loadIonicModule = async () => {
  try {
    return await import('../ionic/script.js')
  } catch {
    assert.fail('Expected Ionic scraper module at ../ionic/script.js')
  }
}

test('Ionic pins the verified first-party careers and broken Lever proxy contracts', async () => {
  const ionic = await loadIonicModule()

  assert.equal(ionic.SOURCE, 'ionic')
  assert.equal(ionic.COMPANY_NAME, 'Ionic')
  assert.equal(ionic.OFFICIAL_BRAND_NAME, 'Ionic')
  assert.equal(ionic.HOMEPAGE_URL, 'https://ionic.io/')
  assert.equal(ionic.CAREERS_URL, 'https://ionic.io/about/jobs')
  assert.equal(ionic.LEVER_PROXY_URL, 'https://ionic.io/api/lever')
  assert.equal(ionic.LEVER_BOARD_URL, 'https://jobs.lever.co/Ionic')
  assert.equal(ionic.VERIFIED_ON, '2026-07-16')
  assert.equal(ionic.hasOfficialIonicCareersSignal(officialCareersHtml), true)
  assert.equal(ionic.hasOfficialIonicCareersSignal(driftedCareersHtml), false)
  assert.equal(ionic.hasBrokenLeverProxySignal(brokenLeverProxyPayload), true)
  assert.equal(ionic.hasBrokenLeverProxySignal(liveLeverProxyPayload), false)
  assert.deepEqual(ionic.extractLeverJobs(brokenLeverProxyPayload), [])
  assert.deepEqual(ionic.extractLeverJobs(liveLeverProxyPayload), liveLeverProxyPayload.data)
  assert.equal(ionic.isMissingLeverBoardPage(notFoundBoardPage), true)
  assert.equal(ionic.isMissingLeverBoardPage(liveBoardPage), false)
})

test('Ionic returns [] only while the official page stays intact and the first-party Lever surface remains broken', async () => {
  const ionic = await loadIonicModule()
  const requested = []

  const jobs = await ionic.createIonicScraper().run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === ionic.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected Ionic text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requested.push({ type: 'json', url })
      if (url === ionic.LEVER_PROXY_URL) return brokenLeverProxyPayload
      throw new Error(`Unexpected Ionic JSON URL: ${url}`)
    },
    fetchPage: async (url) => {
      requested.push({ type: 'page', url })
      if (url === ionic.LEVER_BOARD_URL) return notFoundBoardPage
      throw new Error(`Unexpected Ionic page URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    { type: 'text', url: ionic.CAREERS_URL },
    { type: 'json', url: ionic.LEVER_PROXY_URL },
    { type: 'page', url: ionic.LEVER_BOARD_URL },
  ])
  assert.deepEqual(jobs, [])
})

test('Ionic fails closed when the careers page drifts, the Lever proxy revives, or the Lever board comes back', async () => {
  const ionic = await loadIonicModule()

  await assert.rejects(
    ionic.createIonicScraper().run({
      fetchText: async () => driftedCareersHtml,
      fetchJson: async () => brokenLeverProxyPayload,
      fetchPage: async () => notFoundBoardPage,
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    ionic.createIonicScraper().run({
      fetchText: async () => officialCareersHtml,
      fetchJson: async () => liveLeverProxyPayload,
      fetchPage: async () => notFoundBoardPage,
    }),
    /public jobs feed/i,
  )

  await assert.rejects(
    ionic.createIonicScraper().run({
      fetchText: async () => officialCareersHtml,
      fetchJson: async () => brokenLeverProxyPayload,
      fetchPage: async () => liveBoardPage,
    }),
    /lever board/i,
  )
})
