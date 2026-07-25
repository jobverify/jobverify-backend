import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at GHX</title>
  </head>
  <body>
    <h1>Explore our opportunities</h1>
    <p>Build the future of healthcare supply chain technology with us.</p>
    <a href="https://job-boards.greenhouse.io/globalhealthcareexchangeinc">View all positions</a>
  </body>
</html>
`

const greenhousePayload = {
  jobs: [
    {
      id: 7045701003,
      title: 'Software Engineer II',
      location: { name: 'Hyderabad, Telangana, India' },
      absolute_url: 'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7045701003',
      requisition_id: 'GHX-101',
      company_name: 'GHX',
      updated_at: '2026-07-15T10:00:00Z',
      first_published: '2026-07-10T10:00:00Z',
      content: '&lt;p&gt;Design and build software for GHX platform teams.&lt;/p&gt;',
      departments: [{ name: 'Engineering' }],
      offices: [{ location: 'Hyderabad, Telangana, India' }],
      metadata: [{ name: 'Employment Type', value: 'Full-time' }],
    },
    {
      id: 7039757003,
      title: 'Senior Software Engineer',
      location: { name: 'Hyderabad, Telangana, India' },
      absolute_url: 'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7039757003',
      requisition_id: 'GHX-102',
      company_name: 'GHX',
      updated_at: '2026-07-14T10:00:00Z',
      first_published: '2026-07-09T10:00:00Z',
      content: '&lt;p&gt;Lead backend delivery for GHX healthcare integrations.&lt;/p&gt;',
      departments: [{ name: 'Engineering' }],
      offices: [{ location: 'Hyderabad, Telangana, India' }],
      metadata: [{ name: 'Employment Type', value: 'Full-time' }],
    },
    {
      id: 7000000001,
      title: 'Staff Product Manager',
      location: { name: 'Louisville, Colorado, United States' },
      absolute_url: 'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7000000001',
      requisition_id: 'GHX-200',
      company_name: 'GHX',
      updated_at: '2026-07-13T10:00:00Z',
      first_published: '2026-07-08T10:00:00Z',
      content: '&lt;p&gt;US role only.&lt;/p&gt;',
      departments: [{ name: 'Product' }],
      offices: [{ location: 'Louisville, Colorado, United States' }],
      metadata: [{ name: 'Employment Type', value: 'Full-time' }],
    },
  ],
}

const loadGhxIndiaModule = async () => {
  try {
    return await import('../ghxindia/script.js')
  } catch {
    assert.fail('Expected GHX India scraper module at ../ghxindia/script.js')
  }
}

test('GHX India verifies the official careers page handoff and Greenhouse API constants', async () => {
  const ghxIndia = await loadGhxIndiaModule()

  assert.equal(ghxIndia.CAREERS_URL, 'https://www.ghx.com/about/careers/')
  assert.equal(
    ghxIndia.GREENHOUSE_BOARD_URL,
    'https://job-boards.greenhouse.io/globalhealthcareexchangeinc',
  )
  assert.equal(
    ghxIndia.buildGreenhouseJobsApiUrl(),
    'https://boards-api.greenhouse.io/v1/boards/globalhealthcareexchangeinc/jobs?content=true',
  )
  assert.equal(ghxIndia.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    ghxIndia.normalizeGreenhouseJobUrl(
      'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7045701003',
      7045701003,
    ),
    'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7045701003',
  )
})

test('GHX India extracts India jobs from the verified Greenhouse payload', async () => {
  const ghxIndia = await loadGhxIndiaModule()

  const jobs = ghxIndia.extractIndiaJobsFromGreenhousePayload(greenhousePayload, {
    scrapedAt: '2026-07-16T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      country: job.country,
      link: job.link,
      applyUrl: job.applyUrl,
      department: job.department,
    })),
    [
      {
        title: 'Software Engineer II',
        location: 'Hyderabad, Telangana, India',
        city: 'Hyderabad',
        country: 'India',
        link: 'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7045701003',
        applyUrl: 'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7045701003#application',
        department: 'Engineering',
      },
      {
        title: 'Senior Software Engineer',
        location: 'Hyderabad, Telangana, India',
        city: 'Hyderabad',
        country: 'India',
        link: 'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7039757003',
        applyUrl: 'https://job-boards.greenhouse.io/globalhealthcareexchangeinc/jobs/7039757003#application',
        department: 'Engineering',
      },
    ],
  )
  assert.equal(jobs[0].source, 'ghxindia')
  assert.match(jobs[0].jobDescription, /platform teams/i)
})

test('GHX India run validates the official careers page before fetching the Greenhouse jobs API', async () => {
  const ghxIndia = await loadGhxIndiaModule()
  const requested = []

  const jobs = await ghxIndia.createGhxIndiaScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === ghxIndia.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected GHX India fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      return greenhousePayload
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requested, [
    { type: 'text', url: ghxIndia.CAREERS_URL },
    {
      type: 'json',
      url: 'https://boards-api.greenhouse.io/v1/boards/globalhealthcareexchangeinc/jobs?content=true',
      options: { method: 'GET' },
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'ghxindia')
})

test('GHX India fails closed when the official careers page drifts materially', async () => {
  const ghxIndia = await loadGhxIndiaModule()

  await assert.rejects(
    ghxIndia.createGhxIndiaScraper().run({
      fetchText: async () => officialCareersHtml.replace('View all positions', 'Join us today'),
      fetchJson: async () => greenhousePayload,
    }),
    /verified GHX careers page/i,
  )
})
