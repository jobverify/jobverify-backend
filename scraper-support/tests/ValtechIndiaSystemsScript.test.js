import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career | Valtech</title>
  </head>
  <body>
    <h1>Wanted: Innovators, Thinkers, Doers</h1>
    <p>At Valtech, our employees are our best asset.</p>
    <a href="/en-in/career/jobs/4944510101/" class="row slide-fade-in" data-om-job="SAP Commerce/Hybris Lead developer | Bengaluru">
      <div class="eight column">
        <h4 class="jobs__list__title">SAP Commerce/Hybris Lead developer</h4>
      </div>
      <div class="four column">
        <h5 class="jobs__list__city">Bengaluru</h5>
      </div>
    </a>
    <a href="/en-in/career/jobs/4945513101/" class="row slide-fade-in" data-om-job="Salesforce Marketing Cloud Developer Sr | Brazil - Remote">
      <div class="eight column">
        <h4 class="jobs__list__title">Salesforce Marketing Cloud Developer Sr</h4>
      </div>
      <div class="four column">
        <h5 class="jobs__list__city">Brazil - Remote</h5>
      </div>
    </a>
    <a href="/en-in/career/jobs/">View All Jobs</a>
  </body>
</html>
`

const indiaDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SAP Commerce/Hybris Lead developer | Valtech</title>
  </head>
  <body>
    <h1 class="masthead-sticky__hgroup__title">SAP Commerce/Hybris Lead developer</h1>
    <h2 class="masthead-sticky__hgroup__subtitle">Bengaluru</h2>
    <a href="https://job-boards.eu.greenhouse.io/valtech/jobs/4944510101" class="job-detail__apply-link">Apply</a>
    <h3>Why Valtech?</h3>
    <p>We're advisors, visionaries, creative and techies.</p>
    <h3>The opportunity</h3>
    <p>At Valtech, you'll find an environment designed for continuous learning, meaningful impact, and professional growth.</p>
  </body>
</html>
`

const brazilDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Salesforce Marketing Cloud Developer Sr | Valtech</title>
  </head>
  <body>
    <h1 class="masthead-sticky__hgroup__title">Salesforce Marketing Cloud Developer Sr</h1>
    <h2 class="masthead-sticky__hgroup__subtitle">Brazil - Remote</h2>
    <a href="https://job-boards.eu.greenhouse.io/valtech/jobs/4945513101" class="job-detail__apply-link">Apply</a>
    <h3>Why Valtech?</h3>
    <p>We're advisors, visionaries, creative and techies.</p>
    <h3>The opportunity</h3>
    <p>At Valtech, you'll find an environment designed for continuous learning, meaningful impact, and professional growth.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/valtechindiasystems/script.js')
  } catch {
    assert.fail('Expected Valtech India Systems scraper module at ../../scraper/valtechindiasystems/script.js')
  }
}

test('Valtech India Systems validates the live Valtech careers page and extracts visible job cards', async () => {
  const valtech = await loadModule()

  assert.equal(valtech.SOURCE, 'valtechindiasystems')
  assert.equal(valtech.COMPANY, 'Valtech India Systems')
  assert.equal(valtech.JOBS_URL, 'https://www.valtech.com/en-in/career/')
  assert.equal(valtech.hasOfficialJobsPageSignal(careersHtml), true)

  const listings = valtech.extractJobListings(careersHtml)
  assert.equal(listings.length, 2)
  assert.equal(listings[0].title, 'SAP Commerce/Hybris Lead developer')
  assert.equal(listings[0].location, 'Bengaluru, India')
  assert.equal(listings[1].title, 'Salesforce Marketing Cloud Developer Sr')
  assert.equal(listings[1].location, 'Brazil - Remote')
})

test('Valtech India Systems run keeps only India roles from the Valtech careers page and detail pages', async () => {
  const valtech = await loadModule()
  const requestedUrls = []

  const jobs = await valtech.createValtechindiasystemsScraper({
    now: () => '2026-08-06T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === valtech.JOBS_URL) return careersHtml
      if (url === 'https://www.valtech.com/en-in/career/jobs/4944510101/') return indiaDetailHtml
      if (url === 'https://www.valtech.com/en-in/career/jobs/4945513101/') return brazilDetailHtml
      throw new Error(`Unexpected Valtech fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    valtech.JOBS_URL,
    'https://www.valtech.com/en-in/career/jobs/4944510101/',
    'https://www.valtech.com/en-in/career/jobs/4945513101/',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'SAP Commerce/Hybris Lead developer')
  assert.equal(jobs[0].location, 'Bengaluru, India')
  assert.equal(jobs[0].city, 'Bangalore')
  assert.equal(jobs[0].applyUrl, 'https://job-boards.eu.greenhouse.io/valtech/jobs/4944510101')
  assert.match(jobs[0].jobDescription, /At Valtech/i)
})

test('Valtech India Systems fails closed when the Valtech careers-page contract drifts', async () => {
  const valtech = await loadModule()

  await assert.rejects(
    valtech.createValtechindiasystemsScraper().run({
      fetchText: async () => careersHtml.replace('Wanted: Innovators, Thinkers, Doers', 'Other Company'),
    }),
    /verified valtech careers page/i,
  )
})
