import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>SatSure Careers | Build the Future of Earth Intelligence</title>
  </head>
  <body>
    <main>
      <section>
        <h2>Think Bold To Soar High</h2>
        <p>Let's Solve for Earth from Space</p>
        <a href="https://satsure.keka.com/careers">View Open Positions</a>
      </section>
      <footer>
        <p>SatSure Analytics India Pvt Ltd</p>
        <p>Bengaluru</p>
      </footer>
    </main>
  </body>
</html>
`

const EMPTY_KEKA_SHELL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body></body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <a href="https://satsure.keka.com/careers/jobdetails/146529">Senior Geospatial Engineer</a>
    <a href="https://satsure.keka.com/careers/applyjob/146529">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../satsure/script.js')
  } catch {
    assert.fail('Expected SatSure scraper module at ../satsure/script.js')
  }
}

test('SatSure sentinel helpers stay pinned to the verified first-party careers page and opaque Keka handoff state', async () => {
  const satSure = await loadModule()

  assert.equal(satSure.SOURCE, 'satsure')
  assert.equal(satSure.COMPANY, 'SatSure')
  assert.equal(satSure.OFFICIAL_BRAND_NAME, 'SatSure Analytics India Pvt Ltd')
  assert.equal(satSure.VERIFIED_ON, '2026-07-17')
  assert.equal(satSure.CAREERS_PAGE_URL, 'https://www.satsure.co/careers/')
  assert.equal(satSure.OFFICIAL_CAREERS_HANDOFF_URL, 'https://satsure.keka.com/careers')
  assert.equal(satSure.VERIFIED_SAMPLE_JOB_URL, 'https://satsure.keka.com/careers/jobdetails/30263')
  assert.match(satSure.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(satSure.hasOfficialCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(
    satSure.extractOfficialKekaHandoffUrl(OFFICIAL_CAREERS_HTML),
    'https://satsure.keka.com/careers',
  )
  assert.equal(satSure.pageExposesPublicJobListings(OFFICIAL_CAREERS_HTML), true)
  assert.equal(satSure.pageExposesPublicJobListings(EMPTY_KEKA_SHELL_HTML), false)
  assert.equal(satSure.pageExposesPublicJobListings(PUBLIC_JOBS_HTML), true)
  assert.equal(
    satSure.matchesVerifiedOpaqueKekaState({
      status: 200,
      url: satSure.OFFICIAL_CAREERS_HANDOFF_URL,
      html: EMPTY_KEKA_SHELL_HTML,
    }),
    true,
  )
})

test('SatSure returns [] only while the verified first-party careers page still hands off to an opaque public Keka shell', async () => {
  const satSure = await loadModule()
  const requestedUrls = []

  const jobs = await satSure.createSatSureScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === satSure.CAREERS_PAGE_URL) {
        return { status: 200, url, html: OFFICIAL_CAREERS_HTML }
      }

      if (url === satSure.OFFICIAL_CAREERS_HANDOFF_URL) {
        return { status: 200, url, html: EMPTY_KEKA_SHELL_HTML }
      }

      throw new Error(`Unexpected SatSure URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    satSure.CAREERS_PAGE_URL,
    satSure.OFFICIAL_CAREERS_HANDOFF_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('SatSure fails closed when the verified official careers page or Keka handoff state drifts into a parseable board', async () => {
  const satSure = await loadModule()

  await assert.rejects(
    satSure.createSatSureScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body><h1>Unexpected</h1></body></html>',
      }),
    }),
    /verified satsure careers page/i,
  )

  await assert.rejects(
    satSure.createSatSureScraper().run({
      fetchPage: async (url) => {
        if (url === satSure.CAREERS_PAGE_URL) {
          return { status: 200, url, html: OFFICIAL_CAREERS_HTML }
        }

        return { status: 200, url, html: PUBLIC_JOBS_HTML }
      },
    }),
    /keka handoff state changed materially|appears to expose public jobs/i,
  )
})
