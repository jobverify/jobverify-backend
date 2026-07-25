import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Dhan - Online Stock Trading and Investing Platform for India</title>
    <link rel="canonical" href="https://dhan.co/" />
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/career/">Careers</a>
    </nav>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Work with us and Help us Raise The Bar | Dhan</title>
    <link rel="canonical" href="https://dhan.co/career/" />
    <meta property="og:url" content="https://dhan.co/career/" />
  </head>
  <body>
    <main>
      <h1>Come work with us</h1>
      <p>Raise is a team of 550+ and hiring more.</p>
      <p>Apply now!</p>
      <a href="https://www.linkedin.com/company/raise-financial-services/jobs/">Explore on Linkedin</a>
      <a href="https://recruitcareers.zappyhire.com/en/dhan">Explore Careers at Raise</a>
    </main>
  </body>
</html>
`

const boardShellHtml = `
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <title>Careers</title>
    <base href="/en/">
  </head>
  <body>
    <app-root></app-root>
    <script src="https://utilities.zappyhire.com/zoey.js"></script>
    <script src="main.88782a04241d923c.js" type="module"></script>
  </body>
</html>
`

const careersConfigPayload = {
  status: 1,
  errors: '',
  results: {
    name: 'Dhan',
    career_text_heading: 'Raise Careers',
    website: 'https://raiseholding.co/',
    linkedin: 'https://www.linkedin.com/company/raise-financial-services/jobs/',
    career_filters: [
      { slug: 'departments', label: 'Departments', filter: true },
      { slug: 'locations', label: 'Locations', filter: true },
      { slug: 'job_types', label: 'Job Types', filter: true },
    ],
  },
}

const filterParamsPayload = {
  status: 1,
  errors: '',
  results: {
    locations: ['Mumbai'],
    groups: ['Dhan'],
    departments: ['Design'],
    job_types: [
      { value: 'full_time', label: 'Full Time' },
      { value: 'part_time', label: 'Part Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'intern', label: 'Intern' },
    ],
  },
}

const jobsPayload = {
  status: 1,
  errors: '',
  results: {
    total: { value: 1, relation: 'eq' },
    max_score: null,
    hits: [
      {
        _index: 'reindexed-v8-jobdb-prod',
        _id: '34dhan',
        _score: null,
        _source: {
          client: 'dhan',
          job: 34,
          title: 'Product & Growth Marketing - fuzz (Raise AI)',
          location: 'Mumbai',
          industry: 'Dhan',
          department: 'Design',
          entity: 'Raise',
          job_type: 'Full Time',
        },
        sort: [1778248272000],
      },
    ],
    departments: ['Design'],
  },
}

const loadDhanModule = async () => {
  try {
    return await import('../dhan/script.js')
  } catch {
    assert.fail('Expected Dhan scraper module at ../dhan/script.js')
  }
}

test('Dhan scraper constants and helpers stay pinned to the verified first-party and Zappyhire surfaces', async () => {
  const dhan = await loadDhanModule()

  assert.equal(dhan.SOURCE, 'dhan')
  assert.equal(dhan.COMPANY, 'Dhan')
  assert.equal(dhan.OFFICIAL_BRAND_NAME, 'Dhan')
  assert.equal(dhan.VERIFIED_ON, '2026-07-15')
  assert.equal(dhan.HOMEPAGE_URL, 'https://dhan.co/')
  assert.equal(dhan.CAREERS_URL, 'https://dhan.co/career/')
  assert.equal(dhan.CAREERS_HANDOFF_URL, 'https://recruitcareers.zappyhire.com/en/dhan')
  assert.equal(
    dhan.CAREERS_CONFIG_URL,
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/configurations/',
  )
  assert.equal(
    dhan.CAREERS_FILTER_PARAMS_URL,
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/filter-params/',
  )
  assert.equal(
    dhan.JOBS_API_URL,
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/jobs/jobsearch/?page=1&page_size=12',
  )
  assert.match(dhan.VERIFIED_SURFACE_SUMMARY, /https:\/\/dhan\.co\/career\//i)
  assert.equal(
    dhan.buildJobsApiUrl({ page: 2, pageSize: 24 }),
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/jobs/jobsearch/?page=2&page_size=24',
  )
  assert.equal(dhan.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(dhan.extractHomepageCareerUrl(homepageHtml), 'https://dhan.co/career/')
  assert.equal(dhan.hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(dhan.extractOfficialCareersHandoffUrl(careersHtml), 'https://recruitcareers.zappyhire.com/en/dhan')
  assert.equal(dhan.hasZappyhireBoardShell(boardShellHtml), true)
  assert.equal(dhan.hasZappyhireConfigSignal(careersConfigPayload), true)
  assert.equal(dhan.hasZappyhireFilterParamsSignal(filterParamsPayload), true)
  assert.deepEqual(dhan.extractJobHits(jobsPayload), jobsPayload.results.hits)

  const job = dhan.normalizeZappyhireJob(jobsPayload.results.hits[0])
  assert.ok(job)
  assert.equal(job.title, 'Product & Growth Marketing - fuzz (Raise AI)')
  assert.equal(job.company, 'Dhan')
  assert.equal(job.department, 'Design')
  assert.equal(job.location, 'Mumbai')
  assert.equal(job.city, 'Mumbai')
  assert.equal(job.country, 'India')
  assert.equal(job.jobId, 'dhan-34')
  assert.equal(job.requisitionId, '34')
  assert.equal(job.sourceUrl, 'https://recruitcareers.zappyhire.com/en/dhan/apply?job=34')
  assert.equal(job.applyUrl, 'https://recruitcareers.zappyhire.com/en/dhan/apply?job=34')
  assert.equal(job.employmentType, 'Full-time')
  assert.equal(job.postingDate, '2026-05-08T13:51:12.000Z')
  assert.deepEqual(job.requiredSkills, [])
  assert.match(job.jobDescription, /Raise/i)
})

test('Dhan run validates the verified first-party handoff and returns normalized Zappyhire jobs', async () => {
  const dhan = await loadDhanModule()
  const requestedPageUrls = []
  const requestedJsonUrls = []

  const jobs = await dhan.createDhanScraper({
    now: () => '2026-07-15T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPageUrls.push(url)

      if (url === dhan.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === dhan.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === dhan.CAREERS_HANDOFF_URL) {
        return { status: 200, url, html: boardShellHtml }
      }

      throw new Error(`Unexpected Dhan page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === dhan.CAREERS_CONFIG_URL) return careersConfigPayload
      if (url === dhan.CAREERS_FILTER_PARAMS_URL) return filterParamsPayload
      if (url === dhan.JOBS_API_URL) return jobsPayload

      throw new Error(`Unexpected Dhan JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPageUrls, [
    'https://dhan.co/',
    'https://dhan.co/career/',
    'https://recruitcareers.zappyhire.com/en/dhan',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/configurations/',
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/filter-params/',
    'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/jobs/jobsearch/?page=1&page_size=12',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Product & Growth Marketing - fuzz (Raise AI)')
  assert.equal(jobs[0].companyDomain, 'dhan.co')
  assert.equal(jobs[0].atsPlatform, 'zappyhire')
  assert.equal(jobs[0].companyCareerPage, 'https://dhan.co/career/')
  assert.equal(jobs[0].link, 'https://recruitcareers.zappyhire.com/en/dhan/apply?job=34')
  assert.equal(jobs[0].scrapedAt, '2026-07-15T12:00:00.000Z')
})

test('Dhan fails closed when the verified first-party handoff or Zappyhire payloads drift', async () => {
  const dhan = await loadDhanModule()

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === dhan.CAREERS_URL) {
          return { status: 200, url, html: '<html><title>Broken</title></html>' }
        }

        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
    }),
    /careers page/i,
  )

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === dhan.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === dhan.CAREERS_HANDOFF_URL) {
          return { status: 200, url, html: boardShellHtml }
        }

        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === dhan.CAREERS_CONFIG_URL) {
          return { status: 1, errors: '', results: { name: 'Unexpected' } }
        }

        throw new Error(`Unexpected Dhan JSON URL: ${url}`)
      },
    }),
    /configuration/i,
  )

  await assert.rejects(
    dhan.createDhanScraper().run({
      fetchPage: async (url) => {
        if (url === dhan.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === dhan.CAREERS_URL) return { status: 200, url, html: careersHtml }
        if (url === dhan.CAREERS_HANDOFF_URL) return { status: 200, url, html: boardShellHtml }
        throw new Error(`Unexpected Dhan page URL: ${url}`)
      },
      fetchJson: async (url) => {
        if (url === dhan.CAREERS_CONFIG_URL) return careersConfigPayload
        if (url === dhan.CAREERS_FILTER_PARAMS_URL) return filterParamsPayload
        if (url === dhan.JOBS_API_URL) {
          return { status: 1, errors: '', results: { total: { value: 1, relation: 'eq' }, hits: [{}] } }
        }

        throw new Error(`Unexpected Dhan JSON URL: ${url}`)
      },
    }),
    /jobs api/i,
  )
})
