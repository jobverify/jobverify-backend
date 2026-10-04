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
      <title>Home</title>
      <meta property="og:url" content="https://depusa.com/">
    </head>
    <body>
      <span>DEP USA</span>
      <a href="https://depusa.com/index.php/company/careers">Careers</a>
      <a href="https://depusa.com/index.php/company/about-us">About</a>
      <a href="https://depusa.com/index.php/contact">Contact Us</a>
    </body>
  </html>
`

const careersLandingHtml = `
  <html>
    <head>
      <title>Careers</title>
    </head>
    <body>
      <h1>Careers</h1>
      <p>Welcome to DEP's Careers Page - where innovation meets opportunity.</p>
      <a href="https://depusa.com/index.php/careers-india">Careers India</a>
      <a href="https://depusa.com/index.php/careers-usa">Careers USA</a>
    </body>
  </html>
`

const indiaCareersHtml = `
  <html>
    <head>
      <title>Careers India</title>
    </head>
    <body>
      <h1>Careers India</h1>
      <h2>CAREERS AT DEP</h2>
      <h3>JOIN OUR TEAM</h3>
      <script
        src="https://jobsapi.ceipal.com/APISource/widget.js"
        data-ceipal-api-key="abc123"
        data-ceipal-career-portal-id="portal456"></script>
    </body>
  </html>
`

const careerPortalPage1 = {
  count: 3,
  num_pages: 2,
  page_number: 1,
  next: 'https://careerapi.ceipal.com/abc123/CareerPortalJobPostings/?page=2',
  previous: null,
  results: [
    {
      id: 'encoded-india-233',
      public_job_title: 'Powertrain Integration & NPD CAD',
      position_title: 'Powertrain Integration & NPD CAD',
      public_job_desc: 'Qualification:&nbsp;B.E &ndash; Mechanical',
      requistion_description: 'Qualification:&nbsp;B.E &ndash; Mechanical',
      job_code: 'JPC - 233',
      job_id: 233,
      country: 'India',
      state: 'Tamil Nadu',
      city: 'Chennai',
      multpile_job_location: '',
      remote_opportunities: 0,
      created: '20/07/2026',
      closing_date: null,
      apply_job: 'https://candidateportal.ceipal.com/login/dep-job-233',
      apply_job_monster: 'https://candidateportal.ceipal.com/jobs/career/dep-job-233/apply',
      campus_portal_job_details_url: 'https://candidateportal.ceipal.com/job-details/dep-job-233',
      pay_rates: [
        {
          pay_rate_currency: 'INR',
          pay_rate_employment_type: null,
        },
      ],
      tax_terms: '',
    },
    {
      id: 'encoded-usa-5084',
      public_job_title: 'Product Engineer (Engine Cooling systems)',
      position_title: 'Product Engineer Engine System Cooling',
      public_job_desc: 'United States role that should be filtered out',
      requistion_description: 'United States role that should be filtered out',
      job_code: '734-1',
      job_id: 5084,
      country: 'United States',
      state: 'Michigan',
      city: 'Auburn Hills',
      multpile_job_location: '',
      remote_opportunities: 0,
      created: '28/07/2026',
      closing_date: null,
      apply_job: 'https://candidateportal.ceipal.com/login/dep-job-5084',
      apply_job_monster: 'https://candidateportal.ceipal.com/jobs/career/dep-job-5084/apply',
      campus_portal_job_details_url: 'https://candidateportal.ceipal.com/job-details/dep-job-5084',
      pay_rates: [
        {
          pay_rate_currency: 'USD',
          pay_rate_employment_type: 'W-2',
        },
      ],
      tax_terms: '',
    },
  ],
}

const careerPortalPage2 = {
  count: 3,
  num_pages: 2,
  page_number: 2,
  next: null,
  previous: 'https://careerapi.ceipal.com/abc123/CareerPortalJobPostings/?page=1',
  results: [
    {
      id: 'encoded-india-234',
      public_job_title: 'CAE Analyst - PT ( Ansys )',
      position_title: 'CAE Analyst - PT ( Ansys )',
      public_job_desc: 'Skill set:&nbsp;STAR-CCM+, ANSYS Fluent',
      requistion_description: 'Skill set:&nbsp;STAR-CCM+, ANSYS Fluent',
      job_code: 'JPC - 232',
      job_id: 234,
      country: 'India',
      state: 'Karnataka',
      city: 'Bengaluru',
      multpile_job_location: '',
      remote_opportunities: 2,
      created: '15/07/2026',
      closing_date: null,
      apply_job: 'https://candidateportal.ceipal.com/login/dep-job-234',
      apply_job_monster: 'https://candidateportal.ceipal.com/jobs/career/dep-job-234/apply',
      campus_portal_job_details_url: 'https://candidateportal.ceipal.com/job-details/dep-job-234',
      pay_rates: [
        {
          pay_rate_currency: 'INR',
          pay_rate_employment_type: 'Contract',
        },
      ],
      tax_terms: '',
    },
  ],
}

const emptyCareerPortalPage = {
  count: 0,
  num_pages: 0,
  page_number: 0,
  next: null,
  previous: null,
  results: [],
}

test('Detroit Engineered Products constants stay pinned to the live DEP pages and CEIPAL career portal contract', async () => {
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
  assert.equal(
    dep.buildCareerPortalApiUrl({ apiKey: 'abc123', page: 2 }),
    'https://careerapi.ceipal.com/abc123/CareerPortalJobPostings/?page=2',
  )
  assert.equal(dep.hasCareerPortalResponseSignal(careerPortalPage1), true)
})

test('extractIndiaJobs maps the live DEP India CEIPAL response and keeps only India roles', async () => {
  const dep = await loadModule()
  assert.ok(dep, 'Detroit Engineered Products scraper module should load')

  assert.deepEqual(dep.extractIndiaJobs(careerPortalPage1), [
    {
      title: 'Powertrain Integration & NPD CAD',
      company: 'Detroit Engineered Products',
      department: null,
      location: 'Chennai, Tamil Nadu, India',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      jobId: '233',
      requisitionId: 'JPC - 233',
      sourceUrl: 'https://candidateportal.ceipal.com/job-details/dep-job-233',
      applyUrl: 'https://candidateportal.ceipal.com/jobs/career/dep-job-233/apply',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-20',
      closingDate: null,
      jobDescription: 'Qualification: B.E - Mechanical',
      publicExperienceChecked: true,
      remoteStatus: 'On-site',
    },
  ])
})

test('run validates the DEP careers chain, pages through the CEIPAL career portal API, and decorates India jobs', async () => {
  const dep = await loadModule()
  assert.ok(dep, 'Detroit Engineered Products scraper module should load')

  const requestedTextUrls = []
  const requestedJsonCalls = []
  const jobs = await dep.createDetroitEngineeredProductsScraper().run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)

      if (url === dep.HOMEPAGE_URL) return homepageHtml
      if (url === dep.CAREERS_PAGE_URL) return careersLandingHtml
      if (url === dep.INDIA_CAREERS_URL) return indiaCareersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchJson: async (url, options) => {
      requestedJsonCalls.push({
        url,
        method: options?.method ?? null,
        headers: options?.headers ?? {},
        body: String(options?.body ?? ''),
      })

      if (url === dep.buildCareerPortalApiUrl({ apiKey: 'abc123', page: 1 })) {
        return careerPortalPage1
      }

      if (url === dep.buildCareerPortalApiUrl({ apiKey: 'abc123', page: 2 })) {
        return careerPortalPage2
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-12T00:00:00.000Z',
  })

  assert.deepEqual(requestedTextUrls, [
    dep.HOMEPAGE_URL,
    dep.CAREERS_PAGE_URL,
    dep.INDIA_CAREERS_URL,
  ])
  assert.deepEqual(
    requestedJsonCalls.map((call) => call.url),
    [
      dep.buildCareerPortalApiUrl({ apiKey: 'abc123', page: 1 }),
      dep.buildCareerPortalApiUrl({ apiKey: 'abc123', page: 2 }),
    ],
  )
  assert.equal(requestedJsonCalls[0].method, 'POST')
  assert.equal(requestedJsonCalls[0].headers.Origin, 'https://jobsapi.ceipal.com')
  assert.equal(
    requestedJsonCalls[0].headers.Referer,
    dep.buildWidgetUrl({ apiKey: 'abc123', careerPortalId: 'portal456' }),
  )
  assert.match(requestedJsonCalls[0].body, /cp_id=portal456/)
  assert.match(requestedJsonCalls[0].body, /method=CareerPortalJobPostings/)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'detroitengineeredproducts')
  assert.equal(jobs[0].link, 'https://candidateportal.ceipal.com/jobs/career/dep-job-233/apply')
  assert.equal(jobs[0].scrapedAt, '2026-07-12T00:00:00.000Z')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.equal(jobs[1].remoteStatus, 'Hybrid')
})

test('run returns an empty list when the verified DEP India career portal reports zero current openings', async () => {
  const dep = await loadModule()
  assert.ok(dep, 'Detroit Engineered Products scraper module should load')

  const jobs = await dep.createDetroitEngineeredProductsScraper().run({
    fetchText: async (url) => {
      if (url === dep.HOMEPAGE_URL) return homepageHtml
      if (url === dep.CAREERS_PAGE_URL) return careersLandingHtml
      if (url === dep.INDIA_CAREERS_URL) return indiaCareersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchJson: async () => emptyCareerPortalPage,
  })

  assert.deepEqual(jobs, [])
})

test('run fails closed when the DEP India careers page or CEIPAL career portal API contract changes', async () => {
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
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => ({ status: 400, message: 'Unexpected response' }),
    }),
    /public ceipal career portal api/i,
  )
})


test('DEP accepts the current first-party page titles while retaining navigation and widget validation', async () => {
  const dep = await loadModule()
  assert.equal(dep.hasOfficialHomepageSignal(homepageHtml.replace('<title>Home</title>', '<title>Home - Detroit Engineered Products (DEP)</title>')), true)
  assert.equal(dep.hasCareersLandingSignal(careersLandingHtml.replace('<title>Careers</title>', '<title>Careers - Detroit Engineered Products (DEP)</title>')), true)
  assert.equal(dep.hasIndiaCareersSignal(indiaCareersHtml.replace('<title>Careers India</title>', '<title>Careers India - Detroit Engineered Products (DEP)</title>')), true)
})
