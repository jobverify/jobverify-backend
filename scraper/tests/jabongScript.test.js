import assert from 'node:assert/strict'
import test from 'node:test'

const BROKEN_MYNNTRA_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Oops! Something went wrong</h1>
      <p>Please contact your administrator</p>
    </main>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://www.jabong.com/jobs/software-engineer">View job</a>
      <a href="https://www.jabong.com/jobs/software-engineer/apply">Apply now</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../jabong/script.js')
  } catch {
    assert.fail('Expected Jabong scraper module at ../jabong/script.js')
  }
}

test('Jabong sentinel helpers stay pinned to the verified exact-name broken redirect state', async () => {
  const jabong = await loadModule()

  assert.equal(jabong.SOURCE, 'jabong')
  assert.equal(jabong.COMPANY, 'Jabong')
  assert.equal(jabong.OFFICIAL_BRAND_NAME, 'Jabong')
  assert.equal(jabong.VERIFIED_ON, '2026-07-17')
  assert.equal(jabong.HOMEPAGE_URL, 'https://www.jabong.com/')
  assert.equal(jabong.EXPECTED_REDIRECT_URL, 'https://www.myntra.com/')
  assert.equal(jabong.hasVerifiedBrokenParentShellSignal(BROKEN_MYNNTRA_HTML), true)
  assert.equal(jabong.hasVerifiedBrokenParentShellSignal(PUBLIC_JOBS_HTML), false)
  assert.equal(jabong.pageExposesPublicJobListings(BROKEN_MYNNTRA_HTML), false)
  assert.equal(jabong.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
  assert.equal(
    jabong.matchesVerifiedJabongRedirectState({
      status: 200,
      url: 'https://www.myntra.com/',
      html: BROKEN_MYNNTRA_HTML,
    }),
    true,
  )
})

test('Jabong returns [] only while the exact-name host still redirects to the verified broken parent shell', async () => {
  const jabong = await loadModule()
  const requestedUrls = []

  const jobs = await jabong.createJabongScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      return {
        status: 200,
        url: 'https://www.myntra.com/',
        html: BROKEN_MYNNTRA_HTML,
      }
    },
  })

  assert.deepEqual(requestedUrls, [jabong.HOMEPAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Jabong fails closed when the verified redirect or broken parent shell drifts into a public jobs surface', async () => {
  const jabong = await loadModule()

  await assert.rejects(
    jabong.createJabongScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://www.myntra.com/',
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified exact-name redirect surface/i,
  )

  await assert.rejects(
    jabong.createJabongScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://www.jabong.com/jobs',
        html: PUBLIC_JOBS_HTML,
      }),
    }),
    /public jobs surface|verified exact-name redirect surface/i,
  )
})
