import assert from 'node:assert/strict'
import test from 'node:test'

const EMPTY_WELLFOUND_HTML = `
<!doctype html>
<html>
  <body>
    <h1>Jobs at KoinX</h1>
    <span>View 0 jobs</span>
    <p>KoinX hasn't added any jobs yet</p>
  </body>
</html>
`

const PUBLIC_WELLFOUND_HTML = `
<!doctype html>
<html>
  <body>
    <h1>Jobs at KoinX</h1>
    <span>View 1 job</span>
    <article class="job-card"><h2>Backend Engineer</h2></article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/koinx/script.js')
  } catch {
    assert.fail('Expected KoinX scraper module at ../../scraper/koinx/script.js')
  }
}

test('KoinX sentinel pins the verified first-party handoff and empty Wellfound surface', async () => {
  const koinx = await loadModule()

  assert.equal(koinx.SOURCE, 'koinx')
  assert.equal(koinx.COMPANY, 'KoinX')
  assert.equal(koinx.VERIFIED_ON, '2026-07-25')
  assert.equal(koinx.HOMEPAGE_URL, 'https://www.koinx.com/careers')
  assert.equal(koinx.CAREERS_URL, 'https://wellfound.com/company/koinx/jobs')
  assert.equal(koinx.hasEmptyJobsSurfaceSignal(EMPTY_WELLFOUND_HTML), true)
  assert.equal(koinx.hasEmptyJobsSurfaceSignal(PUBLIC_WELLFOUND_HTML), false)
})

test('KoinX sentinel returns [] only while the verified public jobs surface is empty', async () => {
  const koinx = await loadModule()
  const requestedUrls = []

  const jobs = await koinx.createKoinXScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return EMPTY_WELLFOUND_HTML
    },
  })

  assert.deepEqual(requestedUrls, [koinx.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('KoinX sentinel fails closed when the verified public jobs surface changes', async () => {
  const koinx = await loadModule()

  await assert.rejects(
    koinx.createKoinXScraper().run({ fetchText: async () => PUBLIC_WELLFOUND_HTML }),
    /surface now exposes public jobs|verified empty jobs surface/i,
  )
})

test('KoinX sentinel can verify the empty state with a browser fallback after direct access is blocked', async () => {
  const koinx = await loadModule()
  const browserUrls = []

  const jobs = await koinx.createKoinXScraper().run({
    fetchText: async () => {
      throw new Error('HTTP 403 for https://wellfound.com/company/koinx/jobs')
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return EMPTY_WELLFOUND_HTML
    },
  })

  assert.deepEqual(browserUrls, [koinx.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
