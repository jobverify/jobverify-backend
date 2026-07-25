import assert from 'node:assert/strict'
import test from 'node:test'

const loadBiofourmisModule = async () => {
  try {
    return await import('../biofourmis/script.js')
  } catch {
    assert.fail('Expected Biofourmis scraper module at ../biofourmis/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Openings</title>
    <link rel="canonical" href="https://www.biofourmis.com/about/job-openings" />
  </head>
  <body>
    <h1>Open Roles</h1>
    <script src="https://c27rhq.csb.app/get-jobs.js"></script>
  </body>
</html>
`

const loaderScript = `
const ghSlug = "biofourmis";
fetch("https://boards-api.greenhouse.io/v1/boards/" + ghSlug + "/departments/");
`

const greenhousePayload = {
  jobs: [
    {
      id: 7010101004,
      title: 'Senior Platform Engineer',
      location: { name: 'Bengaluru, Karnataka, India' },
      absolute_url: 'https://job-boards.greenhouse.io/biofourmis/jobs/7010101004',
      requisition_id: 'BF-101',
      company_name: 'Biofourmis',
      updated_at: '2026-07-14T10:00:00Z',
      content: '&lt;p&gt;Build platform services for care enablement.&lt;/p&gt;',
      departments: [{ name: 'Engineering' }],
      offices: [{ location: 'Bengaluru, Karnataka, India' }],
      metadata: [{ name: 'Employment Type', value: 'Full-time' }],
    },
    {
      id: 7010101005,
      title: 'Clinical Operations Manager',
      location: { name: 'Boston, Massachusetts, United States' },
      absolute_url: 'https://job-boards.greenhouse.io/biofourmis/jobs/7010101005',
      requisition_id: 'BF-102',
      company_name: 'Biofourmis',
      updated_at: '2026-07-14T11:00:00Z',
      content: '&lt;p&gt;US role only.&lt;/p&gt;',
      departments: [{ name: 'Operations' }],
      offices: [{ location: 'Boston, Massachusetts, United States' }],
      metadata: [{ name: 'Employment Type', value: 'Full-time' }],
    },
  ],
}

test('Biofourmis verifies the official careers page, loader script, and Greenhouse API constants', async () => {
  const biofourmis = await loadBiofourmisModule()

  assert.equal(biofourmis.CAREERS_URL, 'https://biofourmis.com/about/job-openings')
  assert.equal(biofourmis.JOBS_LOADER_URL, 'https://c27rhq.csb.app/get-jobs.js')
  assert.equal(
    biofourmis.buildGreenhouseJobsApiUrl(),
    'https://boards-api.greenhouse.io/v1/boards/biofourmis/jobs?content=true',
  )
  assert.equal(biofourmis.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(biofourmis.extractJobsLoaderUrl(officialCareersHtml), biofourmis.JOBS_LOADER_URL)
  assert.equal(biofourmis.hasVerifiedJobsLoaderSignal(loaderScript), true)
})

test('Biofourmis extracts India jobs from the verified Greenhouse payload', async () => {
  const biofourmis = await loadBiofourmisModule()

  const jobs = biofourmis.extractIndiaJobsFromGreenhousePayload(greenhousePayload, {
    scrapedAt: '2026-07-14T12:00:00.000Z',
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Senior Platform Engineer')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].source, 'biofourmis')
})

test('Biofourmis run validates the official page before fetching the Greenhouse jobs API', async () => {
  const biofourmis = await loadBiofourmisModule()
  const requested = []

  const jobs = await biofourmis.createBiofourmisScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === biofourmis.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected Biofourmis fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      return greenhousePayload
    },
    now: () => '2026-07-14T12:00:00.000Z',
  })

  assert.deepEqual(requested, [
    { type: 'text', url: biofourmis.CAREERS_URL },
    {
      type: 'json',
      url: 'https://boards-api.greenhouse.io/v1/boards/biofourmis/jobs?content=true',
      options: { method: 'GET' },
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'biofourmis')
})
