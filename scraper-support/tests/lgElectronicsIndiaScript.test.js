import assert from 'node:assert/strict'
import test from 'node:test'

const locationPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at LG India | LG Global Careers</title>
  </head>
  <body>
    <main>
      <h1>India</h1>
      <button>Explore Jobs</button>
      <div role="tablist" aria-label="gcr-tab">
        <button role="tab" aria-selected="true">LG Electronics India</button>
        <button role="tab">Noida Factory</button>
        <button role="tab">Pune Factory</button>
        <button role="tab">R&amp;D Office</button>
      </div>
      <section aria-label="LG Electronics India">
        <h2>Overview</h2>
        <p>LG Electronics India has been certified as a Great Place To Work.</p>
      </section>
      <section>
        <h2>LG Job Opportunities</h2>
        <p>There are no open positions at the moment. Please check other job categories.</p>
        <button>Explore Jobs</button>
      </section>
    </main>
  </body>
</html>
`

const openJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at LG India | LG Global Careers</title>
  </head>
  <body>
    <main>
      <h1>India</h1>
      <div role="tablist" aria-label="gcr-tab">
        <button role="tab" aria-selected="true">LG Electronics India</button>
      </div>
      <section>
        <h2>LG Job Opportunities</h2>
        <a href="https://globalcareers.lge.com/jobs/12345">View Job</a>
      </section>
    </main>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/lgelectronicsindia/script.js')
  } catch {
    assert.fail('Expected LG Electronics India scraper module at ../../scraper/lgelectronicsindia/script.js')
  }
}

test('LG Electronics India scraper pins the verified exact-name no-openings first-party surface', async () => {
  const lgElectronicsIndia = await loadScriptModule()

  assert.equal(lgElectronicsIndia.SOURCE, 'lgelectronicsindia')
  assert.equal(lgElectronicsIndia.COMPANY, 'LG Electronics India')
  assert.equal(lgElectronicsIndia.OFFICIAL_BRAND_NAME, 'LG Electronics India')
  assert.equal(lgElectronicsIndia.VERIFIED_ON, '2026-07-16')
  assert.equal(
    lgElectronicsIndia.LOCATIONS_PAGE_URL,
    'https://globalcareers.lge.com/locations/IN',
  )
  assert.equal(
    lgElectronicsIndia.NO_OPENINGS_MESSAGE,
    'There are no open positions at the moment. Please check other job categories.',
  )
  assert.equal(lgElectronicsIndia.hasOfficialIndiaLocationSignal(locationPageHtml), true)
  assert.equal(lgElectronicsIndia.hasNoOpenPositionsSignal(locationPageHtml), true)
  assert.equal(lgElectronicsIndia.hasPublicJobListingSignal(locationPageHtml), false)
  assert.equal(lgElectronicsIndia.hasPublicJobListingSignal(openJobsHtml), true)
})

test('LG Electronics India returns no jobs only while the verified exact-name location page stays no-openings', async () => {
  const lgElectronicsIndia = await loadScriptModule()
  const requestedUrls = []

  const jobs = await lgElectronicsIndia.createLgElectronicsIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === lgElectronicsIndia.LOCATIONS_PAGE_URL) {
        return { status: 200, url, html: locationPageHtml }
      }

      throw new Error(`Unexpected LG Electronics India URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [lgElectronicsIndia.LOCATIONS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('LG Electronics India fails closed when the verified no-openings surface drifts or starts exposing public jobs', async () => {
  const lgElectronicsIndia = await loadScriptModule()

  await assert.rejects(
    lgElectronicsIndia.createLgElectronicsIndiaScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: lgElectronicsIndia.LOCATIONS_PAGE_URL,
        html: '<html><head><title>Unexpected</title></head><body>Placeholder</body></html>',
      }),
    }),
    /verified india location page no longer matches/i,
  )

  await assert.rejects(
    lgElectronicsIndia.createLgElectronicsIndiaScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: lgElectronicsIndia.LOCATIONS_PAGE_URL,
        html: openJobsHtml,
      }),
    }),
    /location page now appears to expose public jobs/i,
  )
})
