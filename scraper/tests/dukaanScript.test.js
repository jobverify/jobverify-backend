import assert from 'node:assert/strict'
import test from 'node:test'

const EMPTY_WELLFOUND_HTML = `
<!doctype html>
<html>
  <body>
    <h1>Jobs at Dukaan</h1>
    <span>View 0 jobs</span>
    <p>Dukaan hasn't added any jobs yet</p>
  </body>
</html>
`

const PUBLIC_WELLFOUND_HTML = `
<!doctype html>
<html>
  <body>
    <h1>Jobs at Dukaan</h1>
    <span>View 1 job</span>
    <article class="job-card"><h2>Software Engineer</h2></article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../dukaan/script.js')
  } catch {
    assert.fail('Expected Dukaan scraper module at ../dukaan/script.js')
  }
}

test('Dukaan sentinel pins the verified first-party handoff and empty Wellfound surface', async () => {
  const dukaan = await loadModule()

  assert.equal(dukaan.SOURCE, 'dukaan')
  assert.equal(dukaan.COMPANY, 'Dukaan')
  assert.equal(dukaan.VERIFIED_ON, '2026-07-25')
  assert.equal(dukaan.HOMEPAGE_URL, 'https://mydukaan.io/about-us')
  assert.equal(dukaan.CAREERS_URL, 'https://wellfound.com/company/dukaan-app/jobs')
  assert.equal(dukaan.hasEmptyJobsSurfaceSignal(EMPTY_WELLFOUND_HTML), true)
  assert.equal(dukaan.hasEmptyJobsSurfaceSignal(PUBLIC_WELLFOUND_HTML), false)
})

test('Dukaan sentinel returns [] only while the verified public jobs surface is empty', async () => {
  const dukaan = await loadModule()
  const requestedUrls = []

  const jobs = await dukaan.createDukaanScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return EMPTY_WELLFOUND_HTML
    },
  })

  assert.deepEqual(requestedUrls, [dukaan.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Dukaan sentinel fails closed when the verified public jobs surface changes', async () => {
  const dukaan = await loadModule()

  await assert.rejects(
    dukaan.createDukaanScraper().run({ fetchText: async () => PUBLIC_WELLFOUND_HTML }),
    /surface now exposes public jobs|verified empty jobs surface/i,
  )
})

test('Dukaan sentinel can verify the empty state with a browser fallback after direct access is blocked', async () => {
  const dukaan = await loadModule()
  const browserUrls = []

  const jobs = await dukaan.createDukaanScraper().run({
    fetchText: async () => {
      throw new Error('HTTP 403 for https://wellfound.com/company/dukaan-app/jobs')
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return EMPTY_WELLFOUND_HTML
    },
  })

  assert.deepEqual(browserUrls, [dukaan.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
