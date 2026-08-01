import assert from 'node:assert/strict'
import test from 'node:test'

const loadIValueModule = async () => {
  try {
    return await import('../../scraper/ivalue/script.js')
  } catch {
    assert.fail('Expected iValue scraper module at ../../scraper/ivalue/script.js')
  }
}

const blockedOfficialCareersHtml = `
<!doctype html>
<html style="height:100%">
  <head>
    <meta name="robots" content="noindex,nofollow">
    <script src="/_Incapsula_Resource?SWJIYLWA=719d34d31c8e3a6e6fffd425f7e032f3"></script>
  </head>
  <body>
    <iframe>Request unsuccessful. Incapsula incident ID: 739000230090811618-26648902025545208</iframe>
  </body>
</html>
`

const jobsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at iValue Group</title>
    <meta property="og:url" content="https://ivgroup.greythr.com/hire/jobs" />
    <script src="https://storage.googleapis.com/gt-zaire-static/static-Main-3132/app/dist/careerbuild.3ed761bb9061ceacf28f.js"></script>
  </head>
  <body>
    <main>
      <h1>Openings</h1>
    </main>
  </body>
</html>
`

const companyDetailsPayload = {
  company_name: 'iValue Group',
  other_details: {
    website: 'https://ivaluegroup.com/',
    social: {
      in: 'https://www.linkedin.com/company/ivalue-group/',
    },
  },
}

const employmentCategoriesPayload = {
  cat_extfield: {
    location: '1',
  },
  value: {
    1: { cat_id: '1', name: 'Mumbai' },
    2: { cat_id: '1', name: 'Delhi' },
    637: { cat_id: '1', name: 'Ahmedabad' },
    971: { cat_id: '1', name: 'Singapore' },
  },
}

const jobsPayload = {
  data: [
    {
      id: 'job-1',
      req_id: '1130',
      title: 'Business Manager',
      locations: ['1', '2'],
      description: `
        <p>Job Title</p>
        <p>Business Manager</p>
        <p>Job Location</p>
        <p>Mumbai / Delhi</p>
      `,
      job_type: 'Full-time',
      min_exp: 120,
      max_exp: 180,
      is_remote: false,
      apply_url: 'https://ivgroup.greythr.com/hire/jobs/business-manager',
      published_on_career_page: '2026-07-13T10:12:46.321688Z',
    },
    {
      id: 'job-2',
      req_id: '1128',
      title: 'Partner Account Manager',
      locations: ['637'],
      description: `
        <p>Location: Ahmedabad</p>
      `,
      job_type: 'Full-time',
      min_exp: 60,
      max_exp: 120,
      is_remote: false,
      apply_url: 'https://ivgroup.greythr.com/hire/jobs/partner-account-manager',
      published_on_career_page: '2026-07-08T06:44:29.250079Z',
    },
    {
      id: 'job-3',
      req_id: '1200',
      title: 'Country Manager',
      locations: ['971'],
      description: `
        <p>Location: Singapore</p>
      `,
      job_type: 'Full-time',
      min_exp: 96,
      max_exp: 144,
      is_remote: false,
      apply_url: 'https://ivgroup.greythr.com/hire/jobs/country-manager',
      published_on_career_page: '2026-07-01T09:00:00.000000Z',
    },
  ],
}

test('iValue pins the verified official careers block state and public GreytHR jobs surfaces', async () => {
  const ivalue = await loadIValueModule()

  assert.equal(ivalue.SOURCE, 'ivalue')
  assert.equal(ivalue.COMPANY, 'iValue')
  assert.equal(ivalue.VERIFIED_ON, '2026-07-16')
  assert.equal(
    ivalue.OFFICIAL_CAREERS_URL,
    'https://ivaluegroup.com/en-in/careers/working-at-ivalue/',
  )
  assert.equal(
    ivalue.LEGACY_OFFICIAL_CAREERS_URL,
    'https://ivaluegroup.com/working-at-ivalue/',
  )
  assert.equal(ivalue.JOBS_PAGE_URL, 'https://ivgroup.greythr.com/hire/jobs/')
  assert.equal(
    ivalue.COMPANY_DETAILS_URL,
    'https://ivgroup.greythr.com/hire/api/career/get_company_details/',
  )
  assert.equal(
    ivalue.EMPLOYMENT_CATEGORIES_URL,
    'https://ivgroup.greythr.com/hire/api/greythr/emp-category/',
  )
  assert.equal(
    ivalue.JOBS_API_URL,
    'https://ivgroup.greythr.com/hire/api/career/published_jobs/',
  )
  assert.equal(ivalue.hasOfficialCareersBlockSignal(blockedOfficialCareersHtml), true)
  assert.equal(ivalue.hasPublicJobsPageSignal(jobsPageHtml), true)
  assert.equal(ivalue.hasCompanyDetailsSignal(companyDetailsPayload), true)
  assert.deepEqual(
    ivalue.buildLocationLookup(employmentCategoriesPayload),
    {
      1: 'Mumbai',
      2: 'Delhi',
      637: 'Ahmedabad',
      971: 'Singapore',
    },
  )
})

test('iValue run verifies the official block state, public GreytHR APIs, and filters to India jobs', async () => {
  const ivalue = await loadIValueModule()
  const requests = []

  const jobs = await ivalue.createIValueScraper().run({
    fetchText: async (url) => {
      requests.push({ type: 'text', url })

      if (url === ivalue.LEGACY_OFFICIAL_CAREERS_URL || url === ivalue.OFFICIAL_CAREERS_URL) {
        return blockedOfficialCareersHtml
      }

      if (url === ivalue.JOBS_PAGE_URL) {
        return jobsPageHtml
      }

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requests.push({ type: 'json', url, options })

      if (url === ivalue.COMPANY_DETAILS_URL) return companyDetailsPayload
      if (url === ivalue.EMPLOYMENT_CATEGORIES_URL) return employmentCategoriesPayload
      if (url === ivalue.JOBS_API_URL) return jobsPayload

      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-16T20:46:44.000Z',
  })

  assert.deepEqual(requests, [
    { type: 'text', url: ivalue.LEGACY_OFFICIAL_CAREERS_URL },
    { type: 'text', url: ivalue.OFFICIAL_CAREERS_URL },
    { type: 'text', url: ivalue.JOBS_PAGE_URL },
    { type: 'json', url: ivalue.COMPANY_DETAILS_URL, options: { method: 'GET' } },
    { type: 'json', url: ivalue.EMPLOYMENT_CATEGORIES_URL, options: { method: 'GET' } },
    { type: 'json', url: ivalue.JOBS_API_URL, options: { method: 'POST', body: {} } },
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Business Manager',
    'Partner Account Manager',
  ])
  assert.equal(jobs[0].location, 'Mumbai, Delhi')
  assert.equal(jobs[0].city, 'Mumbai')
  assert.equal(jobs[0].experienceRequired, '10-15 years')
  assert.equal(jobs[0].source, 'ivalue')
  assert.equal(jobs[0].link, 'https://ivgroup.greythr.com/hire/jobs/business-manager')
  assert.equal(jobs[1].location, 'Ahmedabad')
  assert.equal(jobs[1].experienceRequired, '5-10 years')
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})

test('iValue fails closed when the official careers block or the verified public jobs surfaces change materially', async () => {
  const ivalue = await loadIValueModule()

  await assert.rejects(
    ivalue.createIValueScraper().run({
      fetchText: async (url) => {
        if (url === ivalue.LEGACY_OFFICIAL_CAREERS_URL || url === ivalue.OFFICIAL_CAREERS_URL) {
          return '<html><body><h1>Working at iValue</h1></body></html>'
        }

        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => {
        throw new Error('Should not fetch JSON when the official careers state has drifted')
      },
    }),
    /official iValue careers surface changed materially/i,
  )

  await assert.rejects(
    ivalue.createIValueScraper().run({
      fetchText: async (url) => {
        if (url === ivalue.LEGACY_OFFICIAL_CAREERS_URL || url === ivalue.OFFICIAL_CAREERS_URL) {
          return blockedOfficialCareersHtml
        }

        if (url === ivalue.JOBS_PAGE_URL) {
          return '<html><body><h1>Unexpected jobs page</h1></body></html>'
        }

        throw new Error(`Unexpected text URL: ${url}`)
      },
      fetchJson: async () => {
        throw new Error('Should not fetch JSON when the public jobs page has drifted')
      },
    }),
    /verified public GreytHR jobs page changed materially/i,
  )
})
