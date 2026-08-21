import assert from 'node:assert/strict'
import test from 'node:test'

const careerLandingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career | Valtech</title>
  </head>
  <body>
    <h1>Wanted: Innovators, Thinkers, Doers</h1>
    <a href="/en-in/career/jobs/">Joblist</a>
    <a href="/en-in/career/jobs/4949952101/">Backend Developer</a>
    <a href="/en-in/career/jobs/4950983101/">Vice-president Marketing - Americas</a>
    <a href="/en-in/career/jobs/4918758101/">Content Strategist Lead</a>
    <a href="/en-in/career/jobs/">View All</a>
  </body>
</html>
`

const jobsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs | Valtech</title>
  </head>
  <body>
    <p>Joblist</p>
    <react
      data-react-component-name="JobsPage"
      data-url="/joblist/getjsonresult?id=1571&amp;language=en-IN&amp;limit=100">
    </react>
  </body>
</html>
`

const indiaApiPayload = {
  filters: [
    {
      text: 'All Countries',
      value: 'country',
      title: 'All Countries',
      tags: [
        { value: '2423-india', stringValue: 'india', text: 'India' },
      ],
    },
  ],
  list: [
    {
      id: 496151,
      title: 'SAP Commerce/Hybris Lead developer',
      url: '/en-in/career/jobs/4944510101/',
      offices: ['Bengaluru'],
      tags: ['2423-india', '116302-development', '62904-bengaluru'],
    },
  ],
  page: {
    itemTotal: 1,
    pageOffset: 0,
    pageLimit: 100,
    pageQuery: {
      offset: 0,
      limit: 100,
      language: 'en-IN',
      country: ['2423-india'],
      department: [],
      expertise: [],
    },
  },
}

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

const loadModule = async () => {
  try {
    return await import('../../scraper/valtechindiasystems/script.js')
  } catch {
    assert.fail('Expected Valtech India Systems scraper module at ../../scraper/valtechindiasystems/script.js')
  }
}

test('Valtech India Systems validates the live Valtech landing page, jobs page, and first-party JSON feed contract from Friday, August 14, 2026', async () => {
  const valtech = await loadModule()

  assert.equal(valtech.SOURCE, 'valtechindiasystems')
  assert.equal(valtech.COMPANY, 'Valtech India Systems')
  assert.equal(valtech.CAREER_LANDING_URL, 'https://www.valtech.com/en-in/career/')
  assert.equal(valtech.JOBS_URL, 'https://www.valtech.com/en-in/career/jobs/')
  assert.equal(
    valtech.JOBS_API_URL,
    'https://www.valtech.com/joblist/getjsonresult?id=1571&language=en-IN&limit=100',
  )
  assert.equal(valtech.INDIA_COUNTRY_TAG, '2423-india')
  assert.equal(valtech.hasOfficialCareerLandingSignal(careerLandingHtml), true)
  assert.equal(valtech.hasOfficialJobsPageSignal(jobsPageHtml), true)
  assert.equal(
    valtech.extractJobsApiUrl(jobsPageHtml),
    'https://www.valtech.com/joblist/getjsonresult?id=1571&language=en-IN&limit=100',
  )
  assert.equal(
    valtech.buildIndiaJobsApiUrl(),
    'https://www.valtech.com/joblist/getjsonresult?id=1571&language=en-IN&limit=100&offset=0&country=2423-india',
  )

  const listings = valtech.extractJobListingsFromApi(indiaApiPayload)
  assert.equal(listings.length, 1)
  assert.equal(listings[0].title, 'SAP Commerce/Hybris Lead developer')
  assert.equal(listings[0].location, 'Bengaluru, India')
  assert.equal(listings[0].city, 'Bangalore')
  assert.equal(listings[0].requisitionId, '4944510101')
})

test('Valtech India Systems run keeps only India roles from the first-party JSON feed and Valtech detail pages', async () => {
  const valtech = await loadModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await valtech.createValtechindiasystemsScraper({
    now: () => '2026-08-14T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === valtech.CAREER_LANDING_URL) return careerLandingHtml
      if (url === valtech.JOBS_URL) return jobsPageHtml
      if (url === 'https://www.valtech.com/en-in/career/jobs/4944510101/') return indiaDetailHtml
      throw new Error(`Unexpected Valtech fixture URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      return indiaApiPayload
    },
  })

  assert.deepEqual(requestedTextUrls, [
    valtech.CAREER_LANDING_URL,
    valtech.JOBS_URL,
    'https://www.valtech.com/en-in/career/jobs/4944510101/',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://www.valtech.com/joblist/getjsonresult?id=1571&language=en-IN&limit=100&offset=0&country=2423-india',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'SAP Commerce/Hybris Lead developer')
  assert.equal(jobs[0].location, 'Bengaluru, India')
  assert.equal(jobs[0].city, 'Bangalore')
  assert.equal(jobs[0].applyUrl, 'https://job-boards.eu.greenhouse.io/valtech/jobs/4944510101')
  assert.match(jobs[0].jobDescription, /At Valtech/i)
})

test('Valtech India Systems fails closed when the Valtech landing page or jobs-page contract drifts', async () => {
  const valtech = await loadModule()

  await assert.rejects(
    valtech.createValtechindiasystemsScraper().run({
      fetchText: async (url) => {
        if (url === valtech.CAREER_LANDING_URL) {
          return careerLandingHtml.replace('Wanted: Innovators, Thinkers, Doers', 'Other Company')
        }
        return jobsPageHtml
      },
      fetchJson: async () => indiaApiPayload,
    }),
    /verified valtech careers landing page/i,
  )

  await assert.rejects(
    valtech.createValtechindiasystemsScraper().run({
      fetchText: async (url) => {
        if (url === valtech.CAREER_LANDING_URL) return careerLandingHtml
        return '<html><body><h1>Jobs</h1></body></html>'
      },
      fetchJson: async () => indiaApiPayload,
    }),
    /verified valtech jobs page/i,
  )
})
