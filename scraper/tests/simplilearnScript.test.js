import assert from 'node:assert/strict'
import test from 'node:test'

const loadSimplilearnModule = async () => {
  try {
    return await import('../simplilearn/script.js')
  } catch {
    assert.fail('Expected Simplilearn scraper module at ../simplilearn/script.js')
  }
}

const careersHtml = `
  <html lang="en">
    <head>
      <title>Careers at Simplilearn</title>
    </head>
    <body>
      <h1>Careers at Simplilearn</h1>
      <p>Build the future of digital upskilling with us.</p>
      <a href="https://www.simplilearn.com/job-openings">View job openings</a>
    </body>
  </html>
`

const jobOpeningsHtml = `
  <html lang="en">
    <head>
      <title>Job Openings | Simplilearn</title>
    </head>
    <body>
      <h1>Job Openings</h1>
      <div class="brand">Simplilearn</div>
      <p>Explore current opportunities across teams.</p>
    </body>
  </html>
`

const listingPayload = [
  {
    id: 8101,
    link: 'https://www.simplilearn.com/job-openings/senior-product-manager/',
    title: {
      rendered: 'Senior Product Manager',
    },
    content: {
      rendered: '<p>Own learner engagement experiments across the catalog.</p>',
    },
    class_list: [
      'type-awsm_job_openings',
      'job-category-product',
      'job-location-bengaluru',
      'job-type-full-time',
    ],
  },
  {
    id: 8102,
    link: 'https://www.simplilearn.com/job-openings/inside-sales-specialist/',
    title: {
      rendered: 'Inside Sales Specialist',
    },
    content: {
      rendered: '<p>Guide learners to the right upskilling path.</p>',
    },
    class_list: [
      'type-awsm_job_openings',
      'job-category-sales',
      'job-location-bangalore',
      'job-type-remote',
    ],
  },
]

test('Simplilearn AWSM helpers stay on the verified official public surfaces and map listing rows into shared fields', async () => {
  const simplilearn = await loadSimplilearnModule()

  assert.equal(simplilearn.CAREERS_URL, 'https://www.simplilearn.com/careers')
  assert.equal(simplilearn.JOB_OPENINGS_URL, 'https://www.simplilearn.com/job-openings')
  assert.equal(simplilearn.CAREERS_API_URL, 'https://www.simplilearn.com/wp-json/wp/v2/awsm_job_openings')
  assert.equal(typeof simplilearn.hasOfficialCareersSignal, 'function')
  assert.equal(typeof simplilearn.hasOfficialJobOpeningsSignal, 'function')
  assert.equal(typeof simplilearn.buildSearchUrl, 'function')
  assert.equal(typeof simplilearn.extractSearchResults, 'function')
  assert.equal(typeof simplilearn.createSimplilearnScraper, 'function')
  assert.equal(typeof simplilearn.run, 'function')

  assert.equal(simplilearn.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(simplilearn.hasOfficialJobOpeningsSignal(jobOpeningsHtml), true)
  assert.equal(
    simplilearn.buildSearchUrl(1),
    'https://www.simplilearn.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=100&page=1',
  )

  const jobs = simplilearn.extractSearchResults(listingPayload)

  assert.deepEqual(jobs[0], {
    title: 'Senior Product Manager',
    company: 'Simplilearn',
    department: 'Product',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '8101',
    requisitionId: '8101',
    sourceUrl: 'https://www.simplilearn.com/job-openings/senior-product-manager/',
    applyUrl: 'https://www.simplilearn.com/job-openings/senior-product-manager/',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Own learner engagement experiments across the catalog.',
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].location, 'Bangalore, India')
  assert.equal(jobs[1].employmentType, 'Remote')
  assert.equal(jobs[1].remoteStatus, 'Remote')
})

test('run returns no jobs when Simplilearn exposes the verified empty WP Job Openings feed', async () => {
  const simplilearn = await loadSimplilearnModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await simplilearn.createSimplilearnScraper().run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === simplilearn.CAREERS_URL) return careersHtml
      if (url === simplilearn.JOB_OPENINGS_URL) return jobOpeningsHtml
      throw new Error(`Unexpected HTML URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === simplilearn.buildSearchUrl(1)) return []
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedTextUrls, [
    'https://www.simplilearn.com/careers',
    'https://www.simplilearn.com/job-openings',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://www.simplilearn.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=100&page=1',
  ])
  assert.deepEqual(jobs, [])
})

test('run paginates Simplilearn REST listings and decorates runner fields when openings exist', async () => {
  const simplilearn = await loadSimplilearnModule()
  const requestedJsonUrls = []

  const jobs = await simplilearn.createSimplilearnScraper({ pageSize: 2 }).run({
    fetchText: async (url) => {
      if (url === simplilearn.CAREERS_URL) return careersHtml
      if (url === simplilearn.JOB_OPENINGS_URL) return jobOpeningsHtml
      throw new Error(`Unexpected HTML URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === simplilearn.buildSearchUrl(1, 2)) return listingPayload
      if (url === simplilearn.buildSearchUrl(2, 2)) return []
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-10T06:00:00.000Z',
  })

  assert.deepEqual(requestedJsonUrls, [
    'https://www.simplilearn.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=2&page=1',
    'https://www.simplilearn.com/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=2&page=2',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'simplilearn')
  assert.equal(jobs[0].link, 'https://www.simplilearn.com/job-openings/senior-product-manager/')
  assert.equal(jobs[0].scrapedAt, '2026-07-10T06:00:00.000Z')
})

test('run fails closed when the Simplilearn public careers surfaces change', async () => {
  const simplilearn = await loadSimplilearnModule()

  await assert.rejects(
    simplilearn.createSimplilearnScraper().run({
      fetchText: async (url) => {
        if (url === simplilearn.CAREERS_URL) return '<html><title>Unexpected</title></html>'
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    simplilearn.createSimplilearnScraper().run({
      fetchText: async (url) => {
        if (url === simplilearn.CAREERS_URL) return careersHtml
        if (url === simplilearn.JOB_OPENINGS_URL) return '<html><title>Unexpected</title></html>'
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /verified official job openings surface/i,
  )

  await assert.rejects(
    simplilearn.createSimplilearnScraper().run({
      fetchText: async (url) => {
        if (url === simplilearn.CAREERS_URL) return careersHtml
        if (url === simplilearn.JOB_OPENINGS_URL) return jobOpeningsHtml
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => ({ total: 0 }),
    }),
    /verified wp job openings feed/i,
  )
})
