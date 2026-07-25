import assert from 'node:assert/strict'
import test from 'node:test'

const OVERVIEW_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Overview | SHUTTERFLY</title>
  </head>
  <body>
    <nav>
      <a href="/overview/">Overview</a>
      <a href="https://shutterflycareers.ttcportals.com/">Careers</a>
    </nav>
    <h2>Careers</h2>
    <p>Wants to join our team ?</p>
    <p>Search our job openings to find a role that's right for you.</p>
    <a href="https://jobs.jobvite.com/shutterfly">Join our team</a>
  </body>
</html>
`

const CAREERS_HOME_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Shutterfly Careers</title>
  </head>
  <body>
    <h1>Careers at Shutterfly</h1>
    <h2>Where We Work</h2>
    <p>
      Select Location View All Locations Durham, NC Eden Prairie, MN Fort Mill, SC Galion, OH
      Muncie, IN Plano, TX Tempe, AZ San Francisco, CA San Jose, CA Haifa, Israel Winnipeg, MB Canada
    </p>
  </body>
</html>
`

const SEARCH_RESULTS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Search Results</title>
  </head>
  <body>
    <h1>Job Search Results</h1>
    <p>Showing 1-25 of 490 results</p>
    <h4>Country</h4>
    <p>Canada 2 jobs</p>
    <p>United States 488 jobs</p>
    <article>
      <h2>Preschool Photographer - Seasonal</h2>
      <p>Location: Fort Walton Beach, FL, United States</p>
    </article>
  </body>
</html>
`

const SEARCH_RESULTS_WITH_INDIA_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Search Results</title>
  </head>
  <body>
    <h1>Job Search Results</h1>
    <p>Showing 1-25 of 491 results</p>
    <h4>Country</h4>
    <p>Canada 2 jobs</p>
    <p>India 1 jobs</p>
    <p>United States 488 jobs</p>
    <article>
      <h2>Software Engineer</h2>
      <p>Location: Bengaluru, Karnataka, India</p>
    </article>
  </body>
</html>
`

const loadScriptModule = async () => {
  try {
    return await import('../shutterflyindia/script.js')
  } catch {
    assert.fail('Expected Shutterfly India scraper module at ../shutterflyindia/script.js')
  }
}

test('Shutterfly India sentinel helpers stay pinned to the verified overview and global careers surfaces', async () => {
  const shutterflyIndia = await loadScriptModule()

  assert.equal(shutterflyIndia.SOURCE, 'shutterflyindia')
  assert.equal(shutterflyIndia.COMPANY, 'Shutterfly India')
  assert.equal(shutterflyIndia.OFFICIAL_BRAND_NAME, 'Shutterfly')
  assert.equal(shutterflyIndia.VERIFIED_ON, '2026-07-17')
  assert.equal(shutterflyIndia.OVERVIEW_URL, 'https://shutterflyinc.com/overview/')
  assert.equal(shutterflyIndia.CAREERS_ENTRY_URL, 'https://jobs.jobvite.com/shutterfly')
  assert.equal(
    shutterflyIndia.SEARCH_RESULTS_URL,
    'https://shutterflycareers.ttcportals.com/search/jobs',
  )
  assert.equal(shutterflyIndia.hasOfficialOverviewSignal(OVERVIEW_HTML), true)
  assert.equal(shutterflyIndia.hasOfficialCareersHomeSignal(CAREERS_HOME_HTML), true)
  assert.equal(shutterflyIndia.hasOfficialSearchResultsSignal(SEARCH_RESULTS_HTML), true)
  assert.equal(shutterflyIndia.hasIndiaJobsSignal(OVERVIEW_HTML), false)
  assert.equal(shutterflyIndia.hasIndiaJobsSignal(CAREERS_HOME_HTML), false)
  assert.equal(shutterflyIndia.hasIndiaJobsSignal(SEARCH_RESULTS_HTML), false)
  assert.equal(shutterflyIndia.hasIndiaJobsSignal(SEARCH_RESULTS_WITH_INDIA_HTML), true)
})

test('Shutterfly India returns [] only while the verified official careers surface exposes no public India jobs', async () => {
  const shutterflyIndia = await loadScriptModule()
  const requestedUrls = []

  const jobs = await shutterflyIndia.createShutterflyIndiaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === shutterflyIndia.OVERVIEW_URL) return OVERVIEW_HTML
      if (url === shutterflyIndia.CAREERS_ENTRY_URL) return CAREERS_HOME_HTML
      if (url === shutterflyIndia.SEARCH_RESULTS_URL) return SEARCH_RESULTS_HTML
      throw new Error(`Unexpected Shutterfly India URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    shutterflyIndia.OVERVIEW_URL,
    shutterflyIndia.CAREERS_ENTRY_URL,
    shutterflyIndia.SEARCH_RESULTS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Shutterfly India fails closed when the verified surface drifts or starts exposing India jobs', async () => {
  const shutterflyIndia = await loadScriptModule()

  await assert.rejects(
    shutterflyIndia.createShutterflyIndiaScraper().run({
      fetchText: async (url) => {
        if (url === shutterflyIndia.OVERVIEW_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        if (url === shutterflyIndia.CAREERS_ENTRY_URL) return CAREERS_HOME_HTML
        return SEARCH_RESULTS_HTML
      },
    }),
    /verified official overview page/i,
  )

  await assert.rejects(
    shutterflyIndia.createShutterflyIndiaScraper().run({
      fetchText: async (url) => {
        if (url === shutterflyIndia.OVERVIEW_URL) return OVERVIEW_HTML
        if (url === shutterflyIndia.CAREERS_ENTRY_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        return SEARCH_RESULTS_HTML
      },
    }),
    /verified Shutterfly careers home/i,
  )

  await assert.rejects(
    shutterflyIndia.createShutterflyIndiaScraper().run({
      fetchText: async (url) => {
        if (url === shutterflyIndia.OVERVIEW_URL) return OVERVIEW_HTML
        if (url === shutterflyIndia.CAREERS_ENTRY_URL) return CAREERS_HOME_HTML
        return SEARCH_RESULTS_WITH_INDIA_HTML
      },
    }),
    /surface now appears to expose public India jobs/i,
  )
})
