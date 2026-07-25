import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <html>
    <head>
      <title>Detroit Engineered Products</title>
      <meta property="og:url" content="https://depusa.com/">
      <meta property="og:site_name" content="Detroit Engineered Products">
    </head>
    <body>
      <a href="https://depusa.com/index.php/company/careers">Careers</a>
      <a href="https://depusa.com/index.php/company/about-us">About</a>
    </body>
  </html>
`

const careersLandingHtml = `
  <html>
    <head>
      <title>Careers | Detroit Engineered Products</title>
    </head>
    <body>
      <h1>Careers</h1>
      <a href="https://depusa.com/index.php/careers-india">Careers India</a>
      <a href="https://depusa.com/index.php/careers-usa">Careers USA</a>
    </body>
  </html>
`

const indiaCareersHtml = `
  <html>
    <head>
      <title>Careers India | Detroit Engineered Products</title>
    </head>
    <body>
      <h2>India Opportunities</h2>
      <script
        src="https://jobsapi.ceipal.com/APISource/widget.js"
        data-ceipal-api-key="abc123"
        data-ceipal-career-portal-id="portal456"></script>
    </body>
  </html>
`

const widgetHtml = `
  <html>
    <head>
      <title>.:: CEIPAL Career Portal ::.</title>
    </head>
    <body>
      <h1>Search Jobs</h1>
      <h2>Current Openings</h2>

      <div class="job-posting">
        <a class="job-title" href="https://jobsapi.ceipal.com/jobs/controls-engineer">Controls Engineer</a>
        <div class="job-location">Bangalore, India</div>
        <div class="job-type">Full-time</div>
      </div>

      <div class="job-posting">
        <a class="job-title" href="https://jobsapi.ceipal.com/jobs/systems-analyst">Systems Analyst</a>
        <div class="job-location">Pune, India</div>
        <div class="job-type">Contract</div>
      </div>

      <div class="job-posting">
        <a class="job-title" href="https://jobsapi.ceipal.com/jobs/program-manager">Program Manager</a>
        <div class="job-location">Detroit, USA</div>
        <div class="job-type">Full-time</div>
      </div>
    </body>
  </html>
`

test('Detroit Engineered Products constants stay pinned to the verified homepage, careers chain, and CEIPAL widget contract', async () => {
  const dep = await loadModule()
  assert.ok(dep, 'Detroit Engineered Products scraper module should load')

  assert.equal(dep.SOURCE, 'detroitengineeredproducts')
  assert.equal(dep.COMPANY, 'Detroit Engineered Products')
  assert.equal(dep.HOMEPAGE_URL, 'https://depusa.com/')
  assert.equal(dep.CAREERS_PAGE_URL, 'https://depusa.com/index.php/company/careers')
  assert.equal(dep.INDIA_CAREERS_URL, 'https://depusa.com/index.php/careers-india')
  assert.equal(dep.USA_CAREERS_URL, 'https://depusa.com/index.php/careers-usa')
  assert.equal(dep.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(dep.hasCareersLandingSignal(careersLandingHtml), true)
  assert.equal(dep.hasIndiaCareersSignal(indiaCareersHtml), true)
  assert.deepEqual(dep.extractWidgetConfig(indiaCareersHtml), {
    apiKey: 'abc123',
    careerPortalId: 'portal456',
  })
  assert.equal(
    dep.buildWidgetUrl({ apiKey: 'abc123', careerPortalId: 'portal456' }),
    'https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=abc123&cp_id=portal456',
  )
  assert.equal(dep.hasWidgetSignal(widgetHtml), true)
})

test('extractIndiaJobs keeps only India roles from the verified DEP CEIPAL widget', async () => {
  const dep = await loadModule()
  assert.ok(dep, 'Detroit Engineered Products scraper module should load')

  assert.deepEqual(dep.extractIndiaJobs(widgetHtml), [
    {
      title: 'Controls Engineer',
      company: 'Detroit Engineered Products',
      department: null,
      location: 'Bangalore, India',
      city: 'Bangalore',
      state: null,
      country: 'India',
      jobId: 'controls-engineer',
      requisitionId: 'controls-engineer',
      sourceUrl: 'https://jobsapi.ceipal.com/jobs/controls-engineer',
      applyUrl: 'https://jobsapi.ceipal.com/jobs/controls-engineer',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Systems Analyst',
      company: 'Detroit Engineered Products',
      department: null,
      location: 'Pune, India',
      city: 'Pune',
      state: null,
      country: 'India',
      jobId: 'systems-analyst',
      requisitionId: 'systems-analyst',
      sourceUrl: 'https://jobsapi.ceipal.com/jobs/systems-analyst',
      applyUrl: 'https://jobsapi.ceipal.com/jobs/systems-analyst',
      employmentType: 'Contract',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('run validates the DEP careers chain and decorates India jobs from the CEIPAL widget', async () => {
  const dep = await loadModule()
  assert.ok(dep, 'Detroit Engineered Products scraper module should load')

  const requestedUrls = []
  const jobs = await dep.createDetroitEngineeredProductsScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === dep.HOMEPAGE_URL) return homepageHtml
      if (url === dep.CAREERS_PAGE_URL) return careersLandingHtml
      if (url === dep.INDIA_CAREERS_URL) return indiaCareersHtml
      if (url === 'https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=abc123&cp_id=portal456') {
        return widgetHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-12T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    dep.HOMEPAGE_URL,
    dep.CAREERS_PAGE_URL,
    dep.INDIA_CAREERS_URL,
    'https://jobsapi.ceipal.com/APISource/v2/index.html?api_key=abc123&cp_id=portal456',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'detroitengineeredproducts')
  assert.equal(jobs[0].link, 'https://jobsapi.ceipal.com/jobs/controls-engineer')
  assert.equal(jobs[0].scrapedAt, '2026-07-12T00:00:00.000Z')
})

test('run fails closed when the DEP India careers page or widget contract changes', async () => {
  const dep = await loadModule()
  assert.ok(dep, 'Detroit Engineered Products scraper module should load')

  await assert.rejects(
    dep.createDetroitEngineeredProductsScraper().run({
      fetchText: async (url) => {
        if (url === dep.HOMEPAGE_URL) return homepageHtml
        if (url === dep.CAREERS_PAGE_URL) return careersLandingHtml
        return '<html><body>Unexpected page</body></html>'
      },
    }),
    /official DEP India careers page/i,
  )

  await assert.rejects(
    dep.createDetroitEngineeredProductsScraper().run({
      fetchText: async (url) => {
        if (url === dep.HOMEPAGE_URL) return homepageHtml
        if (url === dep.CAREERS_PAGE_URL) return careersLandingHtml
        if (url === dep.INDIA_CAREERS_URL) return indiaCareersHtml
        return '<html><body>No search jobs marker here</body></html>'
      },
    }),
    /public ceipal widget/i,
  )
})
