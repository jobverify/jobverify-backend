import assert from 'node:assert/strict'
import test from 'node:test'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>redBus Careers</title>
  </head>
  <body>
    <script>
      window.__CAREERS_DATA__ = {
        layoutConfig: {
          header: {
            navBtnLbls: { jobsBtnLbl: 'Explore open roles' }
          },
          footer: {
            footerLinksSections: [
              {
                title: 'redBus',
                links: [{ text: 'Careers', path: '/careers/jobs' }]
              }
            ]
          }
        }
      }
    </script>
  </body>
</html>
`

const jobsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>redBus Careers</title>
  </head>
  <body>
    <script src="/careers/scripts/jobs.bundle.js?v=41"></script>
    <script>
      let data = '{"pageConfig":{"data":[{"id":2,"data":{"openRolesTxt":"Open roles","searchBarPlaceholder":"Search job title, skills or keyword"}}]}}'
    </script>
  </body>
</html>
`

const jobsBundleJs = `
var getJobsList = function getJobsList() {
  var url = "/careers/api/getJobsList?timestamp=".concat(123, "&uid=").concat("TTEO251S99ERCL", "&hash=").concat("hash");
};
var apply = function apply() {
  window.open("https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/".concat(appliedJobId, "?from=all"), '_blank');
};
`

const darwinboxShellHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>MakeMyTrip</title>
    <meta property="og:title" content="MakeMyTrip " />
  </head>
  <body>
    MakeMyTrip -
  </body>
</html>
`

const rawPayload = {
  job_counts: 3,
  data: [
    {
      id: 'mmt-001',
      title: 'Associate Category Manager',
      department_name: 'Domestic Hotels (MMT_Revmgmt_Htls_DomHtls)',
      emp_sub_type_name: 'Employee - MMT',
      locations: 'Gurgaon, Haryana, India',
      country: 'India',
      experience: '1 - 3 Years',
      posted_on: '16-Jul-2026',
      jd: 'MakeMyTrip hotels business role',
      emp_type_name: 'Employee',
    },
    {
      id: 'rb-001',
      title: 'Assistant Manager - SEO',
      department_name: 'Digital Marketing (MMT_PrfMktng_Perfm-Mgmnt_Digmarke)',
      emp_sub_type_name: 'RB - Employee',
      locations: 'Bangalore, Karnataka, India',
      country: 'India',
      experience: '3 - 6 Years',
      posted_on: '16-Jul-2026',
      jd: "Develop and execute redBus's AEO strategy aligned with business goals.",
      emp_type_name: 'Employee',
    },
    {
      id: 'rb-002',
      title: 'Business Analyst',
      department_name: 'Business Development (MMT_SalesBD-RBM_Sales&BD-Mgmnt_BusnesDev)',
      emp_sub_type_name: 'RB - Employee',
      locations: 'Bangalore, Karnataka, India',
      country: 'India',
      experience: '2 - 4 Years',
      posted_on: '10-Jul-2026',
      jd: 'Commercial analytics role for the shared ground transport business.',
      emp_type_name: 'Employee',
    },
  ],
}

const loadRedBusModule = async () => {
  try {
    return await import('../redbus/script.js')
  } catch {
    assert.fail('Expected RedBus scraper module at ../redbus/script.js')
  }
}

test('RedBus scraper exports the verified first-party jobs route and Darwinbox handoff contract', async () => {
  const redbus = await loadRedBusModule()

  assert.equal(redbus.SOURCE, 'redbus')
  assert.equal(redbus.COMPANY, 'RedBus')
  assert.equal(redbus.OFFICIAL_BRAND_NAME, 'redBus India Pvt Ltd.')
  assert.equal(redbus.VERIFIED_ON, '2026-07-17')
  assert.equal(redbus.CAREERS_PAGE_URL, 'https://www.redbus.in/careers')
  assert.equal(redbus.JOBS_PAGE_URL, 'https://www.redbus.in/careers/jobs')
  assert.equal(redbus.DARWINBOX_ORIGIN, 'https://gommt.darwinbox.in')
  assert.equal(redbus.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(
    redbus.buildDarwinboxAllJobsUrl(),
    'https://gommt.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    redbus.buildDarwinboxJobDetailUrl('rb-001'),
    'https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/rb-001',
  )
  assert.equal(
    redbus.extractJobsBundleUrl(jobsPageHtml),
    'https://www.redbus.in/careers/scripts/jobs.bundle.js?v=41',
  )
  assert.equal(redbus.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(redbus.hasJobsPageSignal(jobsPageHtml), true)
  assert.equal(redbus.hasDarwinboxApplyHandoffSignal(jobsBundleJs), true)
  assert.equal(redbus.hasDarwinboxShellSignal(darwinboxShellHtml), true)
})

test('RedBus filters the shared Darwinbox board down to exact RedBus jobs only', async () => {
  const redbus = await loadRedBusModule()

  assert.equal(redbus.isRedBusRecord(rawPayload.data[0]), false)
  assert.equal(redbus.isRedBusRecord(rawPayload.data[1]), true)
  assert.equal(redbus.isRedBusRecord(rawPayload.data[2]), true)

  assert.deepEqual(
    redbus.filterRedBusRecords(rawPayload.data).map((job) => job.id),
    ['rb-001', 'rb-002'],
  )
})

test('run verifies the official RedBus surfaces and returns only exact RedBus jobs from the shared Darwinbox board', async () => {
  const redbus = await loadRedBusModule()
  const textRequests = []
  const listingRequests = []

  const jobs = await redbus.createRedBusScraper().run({
    now: () => '2026-07-17T00:00:00.000Z',
    fetchText: async (url) => {
      textRequests.push(url)

      if (url === redbus.CAREERS_PAGE_URL) return careersPageHtml
      if (url === redbus.JOBS_PAGE_URL) return jobsPageHtml
      if (url === redbus.extractJobsBundleUrl(jobsPageHtml)) return jobsBundleJs
      if (url === redbus.buildDarwinboxAllJobsUrl()) return darwinboxShellHtml

      throw new Error(`Unexpected RedBus text URL: ${url}`)
    },
    fetchListingPage: async ({ page }) => {
      listingRequests.push(page)
      return rawPayload
    },
  })

  assert.deepEqual(textRequests, [
    redbus.CAREERS_PAGE_URL,
    redbus.JOBS_PAGE_URL,
    redbus.extractJobsBundleUrl(jobsPageHtml),
    redbus.buildDarwinboxAllJobsUrl(),
  ])
  assert.deepEqual(listingRequests, [1])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => job.jobId),
    ['rb-001', 'rb-002'],
  )
  assert.deepEqual(
    jobs.map((job) => job.company),
    ['RedBus', 'RedBus'],
  )
  assert.deepEqual(
    jobs.map((job) => job.sourceUrl),
    [
      'https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/rb-001',
      'https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/rb-002',
    ],
  )
  assert.deepEqual(
    jobs.map((job) => job.scrapedAt),
    ['2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z'],
  )
})

test('RedBus fails closed when the verified jobs page, bundle handoff, or Darwinbox shell drifts', async () => {
  const redbus = await loadRedBusModule()

  await assert.rejects(
    redbus.createRedBusScraper().run({
      fetchText: async (url) => {
        if (url === redbus.CAREERS_PAGE_URL) return careersPageHtml
        if (url === redbus.JOBS_PAGE_URL) return '<html><body>broken</body></html>'
        throw new Error(`Unexpected RedBus text URL: ${url}`)
      },
      fetchListingPage: async () => rawPayload,
    }),
    /jobs page/i,
  )

  await assert.rejects(
    redbus.createRedBusScraper().run({
      fetchText: async (url) => {
        if (url === redbus.CAREERS_PAGE_URL) return careersPageHtml
        if (url === redbus.JOBS_PAGE_URL) return jobsPageHtml
        if (url === redbus.extractJobsBundleUrl(jobsPageHtml)) return 'window.open("/careers/job-details/123")'
        throw new Error(`Unexpected RedBus text URL: ${url}`)
      },
      fetchListingPage: async () => rawPayload,
    }),
    /darwinbox handoff/i,
  )

  await assert.rejects(
    redbus.createRedBusScraper().run({
      fetchText: async (url) => {
        if (url === redbus.CAREERS_PAGE_URL) return careersPageHtml
        if (url === redbus.JOBS_PAGE_URL) return jobsPageHtml
        if (url === redbus.extractJobsBundleUrl(jobsPageHtml)) return jobsBundleJs
        if (url === redbus.buildDarwinboxAllJobsUrl()) return '<html><head><title>Blocked</title></head><body>no shell</body></html>'
        throw new Error(`Unexpected RedBus text URL: ${url}`)
      },
      fetchListingPage: async () => rawPayload,
    }),
    /darwinbox shell/i,
  )
})
