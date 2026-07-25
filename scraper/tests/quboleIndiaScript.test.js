import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers | Open Job Opportunities at Qubole</title>
    <meta
      name="description"
      content="Careers: Check out our open career opportunities. We are always hiring opportunistically for the best engineers at all of our locations."
    />
    <link rel="canonical" href="https://www.qubole.com/company/careers" />
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Check out our open career opportunities.</p>
      <p>We are always hiring opportunistically for the best engineers at all of our locations.</p>
      <a class="careerbtn" href="https://www.qubole.com/company/careers">View Open Positions</a>
    </main>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers | Open Job Opportunities at Qubole</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"JobPosting","title":"Senior Data Engineer"}
      </script>
      <a class="careerbtn" href="https://boards.greenhouse.io/qubole/jobs/12345">View Open Positions</a>
    </main>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../quboleindia/script.js')
  } catch {
    assert.fail('Expected Qubole India scraper module at ../quboleindia/script.js')
  }
}

test('Qubole India sentinel helpers stay pinned to the verified self-looping official careers page', async () => {
  const quboleIndia = await loadScriptModule()

  assert.equal(quboleIndia.SOURCE, 'quboleindia')
  assert.equal(quboleIndia.COMPANY, 'Qubole India')
  assert.equal(quboleIndia.OFFICIAL_BRAND_NAME, 'Qubole')
  assert.equal(quboleIndia.VERIFIED_ON, '2026-07-17')
  assert.equal(quboleIndia.HOMEPAGE_URL, 'https://www.qubole.com/')
  assert.equal(quboleIndia.CAREERS_URL, 'https://www.qubole.com/company/careers')
  assert.equal(
    quboleIndia.extractOpenPositionsUrl(OFFICIAL_CAREERS_HTML),
    'https://www.qubole.com/company/careers',
  )
  assert.equal(quboleIndia.hasOfficialCareersPageSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(quboleIndia.pageExposesPublicJobListings(OFFICIAL_CAREERS_HTML), false)
  assert.equal(quboleIndia.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
})

test('Qubole India returns [] when the verified first-party careers page still self-loops its open positions CTA', async () => {
  const quboleIndia = await loadScriptModule()
  const requestedUrls = []

  const jobs = await quboleIndia.createQuboleIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return { status: 200, url, html: OFFICIAL_CAREERS_HTML }
    },
  })

  assert.deepEqual(requestedUrls, [quboleIndia.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Qubole India fails closed when the verified careers page drifts or starts exposing public jobs', async () => {
  const quboleIndia = await loadScriptModule()

  await assert.rejects(
    quboleIndia.createQuboleIndiaScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    quboleIndia.createQuboleIndiaScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: PUBLIC_JOBS_HTML,
      }),
    }),
    /careers page now appears to expose public jobs/i,
  )
})
