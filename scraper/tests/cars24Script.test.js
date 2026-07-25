import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
  <html>
    <head>
      <title>Cars24 | Careers</title>
      <link rel="canonical" href="https://www.cars24.com/careers/" />
    </head>
    <body>
      <h1>Join us in the Essential Revolution</h1>
      <p>Better drives, better lives</p>
      <a href="https://careers.cars24.com/">Explore roles</a>
    </body>
  </html>
`

const officialJobsSiteHtml = `
  <html>
    <head>
      <title>Cars24 Careers</title>
      <link rel="canonical" href="https://careers.cars24.com/" />
      <meta name="ROBOTS" content="NOINDEX,NOFOLLOW" />
    </head>
    <body>
      <a href="#roles">See roles</a>
      <section id="roles">
        <h2>Choose your grind</h2>
        <div id="rolesList"></div>
      </section>
    </body>
  </html>
`

const jobsPayload = {
  status: 1,
  message: 'Successfully loaded all the open jobs',
  data: [
    {
      job_title: 'Product Manager',
      job_id: 'a6a06e00534853',
      department: 'Product Management- Core',
      parent_department: 'Product Management',
      business_unit: 'Core',
      employee_type: 'Permanent',
      location_country: 'India',
      location_city: ['Gurgaon'],
      location: ['Gurgaon, Haryana, India (Support-Management-Gurgaon-Management Corporate)'],
      designation_code: 'CSPL_Core_ProductManagement_ProductManagement-Core_ProductManager',
      experience_from: '5',
      experience_to: '10',
      job_created_timestamp: '15-05-2026 14:27:41',
      job_updated_timestamp: '13-07-2026 16:55:02',
    },
    {
      job_title: 'Regional Sales Lead',
      job_id: 'uae-001',
      department: 'Sales',
      parent_department: 'Business',
      business_unit: 'International',
      employee_type: 'Permanent',
      location_country: 'United Arab Emirates',
      location_city: ['Dubai'],
      location: ['Dubai, United Arab Emirates'],
      designation_code: 'CSPL_Intl_Business_Sales_RegionalSalesLead',
      experience_from: '4',
      experience_to: '8',
      job_created_timestamp: '11-07-2026 11:00:00',
      job_updated_timestamp: '13-07-2026 12:00:00',
    },
  ],
}

const productManagerDetailPayload = {
  status: 1,
  message: 'Successfully loaded job details',
  data: {
    designation: 'Product Manager',
    job_title: 'Product Manager',
    job_description: [
      '&lt;p&gt;&lt;b&gt;We&#8217;re particularly excited about designers who enjoy building AI-powered product&lt;/b&gt;&lt;/p&gt;',
      '&lt;p&gt;&lt;b&gt;experiences.&lt;/b&gt;&lt;/p&gt;',
      '&lt;p&gt;&lt;b&gt;&#8226; Have 5+ years of product design experience (B2C / marketplace is a plus)&lt;/b&gt;&lt;/p&gt;',
      '&lt;p&gt;&lt;b&gt;&#8226; Love designing AI-powered workflows and interfaces&lt;/b&gt;&lt;/p&gt;',
    ].join(''),
    experience_from: '5',
    experience_to: '10',
    unit_experience: 'Years',
    location_city: ['Gurgaon'],
    department: 'Product Management- Core',
    location: ['Gurgaon, Haryana, India (Support-Management-Gurgaon-Management Corporate)'],
    employee_type: 'Permanent',
    location_country: 'India',
    parent_department: 'Product Management',
    designation_code: 'CSPL_Core_ProductManagement_ProductManagement-Core_ProductManager',
    business_unit: 'Core',
  },
}

const loadCars24Module = async () => {
  try {
    return await import('../cars24/script.js')
  } catch {
    assert.fail('Expected Cars24 scraper module at ../cars24/script.js')
  }
}

test('Cars24 verifies the official first-party careers surfaces and extracts India jobs from the public jobs feed', async () => {
  const cars24 = await loadCars24Module()

  assert.equal(cars24.extractDedicatedCareersUrl(officialCareersHtml), cars24.DEDICATED_CAREERS_URL)
  assert.equal(cars24.hasOfficialCompanyCareersSignal(officialCareersHtml), true)
  assert.equal(cars24.hasOfficialJobsSiteSignal(officialJobsSiteHtml), true)
  assert.equal(cars24.hasVerifiedJobsFeedShape(jobsPayload), true)
  assert.equal(cars24.hasVerifiedJobDetailShape(productManagerDetailPayload), true)

  const jobs = cars24.extractJobsFromFeed(jobsPayload, {
    scrapedAt: '2026-07-14T00:00:00.000Z',
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Product Manager')
  assert.equal(jobs[0].department, 'Product Management- Core')
  assert.equal(jobs[0].location, 'Gurgaon')
  assert.equal(jobs[0].city, 'Gurgaon')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].experienceRequired, '5-10 Years')
  assert.equal(
    jobs[0].link,
    'https://careers.cars24.com/product-manager/?title=Product+Manager&team=Product+Management-+Core&location=Gurgaon&type=Permanent&focus=Core&id=a6a06e00534853',
  )
})

test('Cars24 run scrapes the verified first-party jobs API and enriches jobs from the official detail route', async () => {
  const cars24 = await loadCars24Module()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await cars24.createCars24Scraper({
    now: () => '2026-07-14T00:00:00.000Z',
    detailConcurrency: 1,
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)

      if (url === cars24.OFFICIAL_CAREERS_URL) return officialCareersHtml
      if (url === cars24.DEDICATED_CAREERS_URL) return officialJobsSiteHtml
      throw new Error(`Unexpected text fixture URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === cars24.JOBS_API_URL) return jobsPayload
      if (url === cars24.buildJobDetailApiUrl('a6a06e00534853')) return productManagerDetailPayload
      throw new Error(`Unexpected JSON fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [cars24.DEDICATED_CAREERS_URL])
  assert.deepEqual(requestedJsonUrls, [
    cars24.JOBS_API_URL,
    cars24.buildJobDetailApiUrl('a6a06e00534853'),
  ])

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Cars24')
  assert.equal(jobs[0].source, 'cars24')
  assert.equal(jobs[0].title, 'Product Manager')
  assert.equal(jobs[0].department, 'Product Management- Core')
  assert.equal(jobs[0].location, 'Gurgaon')
  assert.equal(jobs[0].city, 'Gurgaon')
  assert.equal(jobs[0].country, 'India')
  assert.equal(
    jobs[0].requisitionId,
    'CSPL_Core_ProductManagement_ProductManagement-Core_ProductManager',
  )
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].experienceRequired, '5-10 Years')
  assert.match(jobs[0].jobDescription, /We're particularly excited about designers/i)
  assert.deepEqual(jobs[0].requiredSkills, [
    'Have 5+ years of product design experience (B2C / marketplace is a plus)',
    'Love designing AI-powered workflows and interfaces',
  ])
  assert.equal(
    jobs[0].applyUrl,
    'https://careers.cars24.com/product-manager/?title=Product+Manager&team=Product+Management-+Core&location=Gurgaon&type=Permanent&focus=Core&id=a6a06e00534853',
  )
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-14T00:00:00.000Z')
})

test('Cars24 fails closed when the verified careers shell or public API contracts change', async () => {
  const cars24 = await loadCars24Module()

  await assert.rejects(
    cars24.createCars24Scraper().run({
      fetchText: async () => '<html><head><title>Careers</title></head><body>No jobs board</body></html>',
      fetchJson: async () => jobsPayload,
    }),
    /Cars24 careers site/i,
  )

  await assert.rejects(
    cars24.createCars24Scraper().run({
      fetchText: async (url) => (
        url === cars24.OFFICIAL_CAREERS_URL ? officialCareersHtml : officialJobsSiteHtml
      ),
      fetchJson: async (url) => (
        url === cars24.JOBS_API_URL
          ? { status: 0, data: null }
          : productManagerDetailPayload
      ),
    }),
    /Cars24 jobs API/i,
  )

  await assert.rejects(
    cars24.createCars24Scraper({ detailConcurrency: 1 }).run({
      fetchText: async (url) => (
        url === cars24.OFFICIAL_CAREERS_URL ? officialCareersHtml : officialJobsSiteHtml
      ),
      fetchJson: async (url) => (
        url === cars24.JOBS_API_URL
          ? jobsPayload
          : { status: 1, data: null }
      ),
    }),
    /Cars24 job detail API/i,
  )
})
