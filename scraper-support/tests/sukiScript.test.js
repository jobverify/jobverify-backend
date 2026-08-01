import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Help shape the future of healthcare with AI</h1>
      <p>Join the Team</p>
      <p>Level-up your career by applying to opportunities at Suki.</p>
      <a href="https://www.suki.ai/open-positions/">See open positions</a>
      <footer>
        <p>Copyright 2026. Suki AI, Inc. All rights reserved.</p>
      </footer>
    </main>
  </body>
</html>
`

const OPEN_POSITIONS_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Current Openings</h1>
      <footer>
        <p>About Us</p>
        <p>Careers</p>
        <p>Suki AI, Inc.</p>
      </footer>
    </main>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Open Positions @ Suki</h1>
    <h2>Business Operations Associate (SFDC)</h2>
    <a href="https://www.suki.ai/open-positions?gh_jid=6601892003">View job</a>
    <a href="https://www.suki.ai/open-positions?gh_jid=6601892003&weekdayJdUid=942792">Apply</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/suki/script.js')
  } catch {
    assert.fail('Expected Suki scraper module at ../../scraper/suki/script.js')
  }
}

test('Suki sentinel helpers stay pinned to the verified careers page and opaque open positions shell', async () => {
  const suki = await loadModule()

  assert.equal(suki.SOURCE, 'suki')
  assert.equal(suki.COMPANY, 'Suki')
  assert.equal(suki.OFFICIAL_BRAND_NAME, 'Suki AI, Inc.')
  assert.equal(suki.VERIFIED_ON, '2026-07-17')
  assert.equal(suki.CAREERS_PAGE_URL, 'https://www.suki.ai/careers/')
  assert.equal(suki.OFFICIAL_CAREERS_HANDOFF_URL, 'https://www.suki.ai/open-positions/')
  assert.match(suki.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(suki.hasOfficialCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(
    suki.extractOpenPositionsHandoffUrl(OFFICIAL_CAREERS_HTML),
    'https://www.suki.ai/open-positions/',
  )
  assert.equal(suki.pageExposesPublicJobListings(OFFICIAL_CAREERS_HTML), false)
  assert.equal(suki.pageExposesPublicJobListings(OPEN_POSITIONS_SHELL_HTML), false)
  assert.equal(suki.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
  assert.equal(
    suki.matchesVerifiedOpaqueOpenPositionsState({
      status: 200,
      url: suki.OFFICIAL_CAREERS_HANDOFF_URL,
      html: OPEN_POSITIONS_SHELL_HTML,
    }),
    true,
  )
})

test('Suki returns [] only while the verified careers page still hands off to the opaque open positions shell', async () => {
  const suki = await loadModule()
  const requestedUrls = []

  const jobs = await suki.createSukiScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === suki.CAREERS_PAGE_URL) {
        return { status: 200, url, html: OFFICIAL_CAREERS_HTML }
      }

      if (url === suki.OFFICIAL_CAREERS_HANDOFF_URL) {
        return { status: 200, url, html: OPEN_POSITIONS_SHELL_HTML }
      }

      throw new Error(`Unexpected Suki URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    suki.CAREERS_PAGE_URL,
    suki.OFFICIAL_CAREERS_HANDOFF_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Suki default fetch path uses bounded abort signals for each page request', async () => {
  const suki = await loadModule()
  const originalFetch = globalThis.fetch
  const originalTimeout = AbortSignal.timeout
  const requestedUrls = []
  const timeoutMs = []
  const timeoutSignals = []

  AbortSignal.timeout = (ms) => {
    timeoutMs.push(ms)
    const signal = new AbortController().signal
    timeoutSignals.push(signal)
    return signal
  }

  globalThis.fetch = async (url, options = {}) => {
    requestedUrls.push(url)
    const expectedSignal = timeoutSignals.at(-1)

    assert.ok(expectedSignal, 'expected default fetch to request a timeout signal')
    assert.equal(options.signal, expectedSignal)

    if (url === suki.CAREERS_PAGE_URL) {
      return { status: 200, url, text: async () => OFFICIAL_CAREERS_HTML }
    }

    if (url === suki.OFFICIAL_CAREERS_HANDOFF_URL) {
      return { status: 200, url, text: async () => OPEN_POSITIONS_SHELL_HTML }
    }

    throw new Error(`Unexpected Suki URL: ${url}`)
  }

  try {
    const jobs = await suki.createSukiScraper().run()

    assert.deepEqual(requestedUrls, [
      suki.CAREERS_PAGE_URL,
      suki.OFFICIAL_CAREERS_HANDOFF_URL,
    ])
    assert.deepEqual(timeoutMs, [15000, 15000])
    assert.deepEqual(jobs, [])
  } finally {
    globalThis.fetch = originalFetch
    AbortSignal.timeout = originalTimeout
  }
})

test('Suki fails closed when the verified careers page or open positions shell drifts materially', async () => {
  const suki = await loadModule()

  await assert.rejects(
    suki.createSukiScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified suki careers page/i,
  )

  await assert.rejects(
    suki.createSukiScraper().run({
      fetchPage: async (url) => {
        if (url === suki.CAREERS_PAGE_URL) {
          return { status: 200, url, html: OFFICIAL_CAREERS_HTML }
        }

        return { status: 200, url, html: PUBLIC_JOBS_HTML }
      },
    }),
    /open positions state changed materially|appears to expose public jobs/i,
  )
})
