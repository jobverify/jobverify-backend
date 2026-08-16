import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>redBus Careers</title>
  </head>
  <body>
    <div id="reactContentMount"></div>
    <script defer>
      let data = '%7B%22layoutConfig%22%3A%7B%22header%22%3A%7B%22navBtnLbls%22%3A%7B%22jobsBtnLbl%22%3A%22Explore%20open%20roles%22%7D%7D%2C%22footer%22%3A%7B%22footerLinksSections%22%3A%5B%7B%22title%22%3A%22redBus%22%2C%22links%22%3A%5B%7B%22text%22%3A%22Careers%22%2C%22path%22%3A%22%2Fcareers%2Fjobs%22%7D%5D%7D%5D%7D%7D%7D'
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
    <script defer>
      let data = '%7B%22pageConfig%22%3A%7B%22data%22%3A%5B%7B%22id%22%3A2%2C%22data%22%3A%7B%22openRolesTxt%22%3A%22Open%20roles%22%2C%22searchBarPlaceholder%22%3A%22Search%20job%20title%2C%20skills%20or%20keyword%22%7D%7D%5D%7D%7D'
    </script>
  </body>
</html>
`

const jobsBundleJs = `
var getJobsList = function getJobsList() {
  var time = Math.floor(Date.now() / 1000);
  var data = {
    "timestamp": time,
    "Uid": "TTEO251S99ERCL",
    "hash": js_sha512__WEBPACK_IMPORTED_MODULE_1___default()("Admindarwinbox@go-mmt.com9ee1f8acd90924a81180267e97609291" + time)
  };
  var url = "/careers/api/getJobsList?timestamp=".concat(data.timestamp, "&uid=").concat(data.Uid, "&hash=").concat(data.hash);
  return axios__WEBPACK_IMPORTED_MODULE_0__["default"].post(url, data);
};
var getJobDescription = function getJobDescription(_ref) {
  var data2 = _ref.data2;
  var time = Math.floor(Date.now() / 1000);
  var data = {
    "timestamp": time,
    "Uid": "TTEO251S99ERCL",
    "hash": js_sha512__WEBPACK_IMPORTED_MODULE_1___default()("Admindarwinbox@go-mmt.com9ee1f8acd90924a81180267e97609291" + time),
    "job_id": data2.jobId
  };
  var url = "/careers/api/getJobDesc?timestamp=".concat(data.timestamp, "&uid=").concat(data.Uid, "&hash=").concat(data.hash, "&jobid=").concat(data.job_id);
  return axios__WEBPACK_IMPORTED_MODULE_0__["default"].post(url, data);
};
var apply = function apply() {
  window.open("https://gommt.darwinbox.in/ms/candidatev2/main/careers/jobDetails/".concat(appliedJobId, "?from=all"), '_blank');
};
`

const escapedJobsBundleJs = JSON.stringify(jobsBundleJs).slice(1, -1)

const jobsListPayload = {
  Error: null,
  Response: {
    Data: [
      {
        job_id: 'mmt-001',
        job_code: 'JOB_1000',
        group_company: 'MakeMyTrip (India) Limited',
        parent_department: 'Hotels - Management',
        department: 'Domestic Hotels',
        division: 'MMT_HOTELS',
        business_unit: 'Hotels',
        location: ['Gurgaon, Haryana, India (Gurgaon_MMT)'],
        location_city: ['Gurgaon'],
        location_country: 'India',
        job_title: 'Associate Category Manager',
        employee_type: 'Employee',
        job_created_timestamp: '16-07-2026 12:35:13',
        experience_to: '3',
        experience_from: '1',
        is_remote: 0,
        designation_code: 'MMTR111',
      },
      {
        job_id: 'rb-001',
        job_code: 'JOB_2089',
        group_company: 'MakeMyTrip (India) Limited',
        parent_department: 'Performance Marketing - Management',
        department: 'Digital Marketing',
        division: 'RB_MMT',
        business_unit: 'Performance Marketing',
        location: ['Bangalore, Karnataka, India (Bangalore_RBM)'],
        location_city: ['Bangalore'],
        location_country: 'India',
        job_title: 'Assistant Manager - SEO',
        employee_type: 'Employee',
        job_created_timestamp: '16-07-2026 12:35:13',
        experience_to: '6',
        experience_from: '3',
        is_remote: 0,
        designation_code: 'RBMR667',
      },
      {
        job_id: 'rb-002',
        job_code: 'JOB_2093',
        group_company: 'MakeMyTrip (India) Limited',
        parent_department: 'Sales & Business Development - Management',
        department: 'Business Development',
        division: 'RB_MMT',
        business_unit: 'Sales & Business Development',
        location: ['Indore, Madhya Pradesh, India (Indore_RBM)'],
        location_city: ['Indore'],
        location_country: 'India',
        job_title: 'Senior Business Development Manager',
        employee_type: 'Employee',
        job_created_timestamp: '14-07-2026 10:10:10',
        experience_to: '8',
        experience_from: '5',
        is_remote: 0,
        designation_code: 'RBMR63',
      },
    ],
  },
}

const jobDetailPayloadById = {
  'rb-001': {
    Error: null,
    Response: {
      Data: {
        message: 'Successfully loaded job details',
        status: 1,
        data: {
          job_title: 'Assistant Manager - SEO',
          group_company: 'MakeMyTrip (India) Limited',
          department_code: 'MMT_PrfMktng_Perfm-Mgmnt_Digmarke',
          department: 'Digital Marketing',
          parent_department: 'Performance Marketing - Management',
          designation_code: 'RBMR667',
          designation: 'Assistant Manager SEO',
          employee_type: 'Employee',
          experience_from: '3',
          experience_to: '6',
          unit_experience: 'Years',
          location: ['Bangalore, Karnataka, India (Bangalore_RBM)'],
          location_city: ['Bangalore'],
          location_country: 'India',
          job_decription: '&lt;p&gt;Own redBus SEO and AI search growth.&lt;/p&gt;',
          functional_area: 'Marketing',
        },
      },
    },
  },
  'rb-002': {
    Error: null,
    Response: {
      Data: {
        message: 'Successfully loaded job details',
        status: 1,
        data: {
          job_title: 'Senior Business Development Manager',
          group_company: 'MakeMyTrip (India) Limited',
          department_code: 'MMT_SalesBD-RBM_Sales&BD-Mgmnt_BusnesDev',
          department: 'Business Development',
          parent_department: 'Sales & Business Development - Management',
          designation_code: 'RBMR63',
          designation: 'Senior Business Development Manager',
          employee_type: 'Employee',
          experience_from: '5',
          experience_to: '8',
          unit_experience: 'Years',
          location: ['Indore, Madhya Pradesh, India (Indore_RBM)'],
          location_city: ['Indore'],
          location_country: 'India',
          job_decription: '&lt;p&gt;Grow redBus demand across central India.&lt;/p&gt;',
          functional_area: 'Sales',
        },
      },
    },
  },
}

const loadRedBusModule = async () => {
  try {
    return await import('../../scraper/redbus/script.js')
  } catch {
    assert.fail('Expected RedBus scraper module at ../../scraper/redbus/script.js')
  }
}

test('RedBus scraper exports the verified first-party jobs route, signed API contract, and Darwinbox handoff', async () => {
  const redbus = await loadRedBusModule()
  const credentials = redbus.extractJobsApiCredentials(jobsBundleJs)
  const auth = redbus.buildJobsApiAuth({
    timestamp: 1700000000,
    uid: credentials.uid,
    secret: credentials.secret,
  })

  assert.equal(redbus.SOURCE, 'redbus')
  assert.equal(redbus.COMPANY, 'RedBus')
  assert.equal(redbus.OFFICIAL_BRAND_NAME, 'redBus India Pvt Ltd.')
  assert.equal(redbus.VERIFIED_ON, '2026-08-14')
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
  assert.deepEqual(credentials, {
    uid: 'TTEO251S99ERCL',
    secret: 'Admindarwinbox@go-mmt.com9ee1f8acd90924a81180267e97609291',
  })
  assert.deepEqual(redbus.extractJobsApiCredentials(escapedJobsBundleJs), credentials)
  assert.equal(auth.timestamp, 1700000000)
  assert.equal(auth.uid, 'TTEO251S99ERCL')
  assert.equal(
    auth.hash,
    createHash('sha512')
      .update('Admindarwinbox@go-mmt.com9ee1f8acd90924a81180267e976092911700000000')
      .digest('hex'),
  )
  assert.equal(
    redbus.buildJobsListApiUrl(auth),
    `https://www.redbus.in/careers/api/getJobsList?timestamp=1700000000&uid=TTEO251S99ERCL&hash=${auth.hash}`,
  )
  assert.equal(
    redbus.buildJobDescriptionApiUrl(auth, 'rb-001'),
    `https://www.redbus.in/careers/api/getJobDesc?timestamp=1700000000&uid=TTEO251S99ERCL&hash=${auth.hash}&jobid=rb-001`,
  )
  assert.equal(redbus.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(redbus.hasJobsPageSignal(jobsPageHtml), true)
  assert.equal(redbus.hasSignedJobsApiSignal(jobsBundleJs), true)
  assert.equal(redbus.hasSignedJobsApiSignal(escapedJobsBundleJs), true)
})

test('RedBus filters the first-party signed jobs payload down to exact RedBus jobs only', async () => {
  const redbus = await loadRedBusModule()

  assert.equal(redbus.isRedBusRecord(jobsListPayload.Response.Data[0]), false)
  assert.equal(redbus.isRedBusRecord(jobsListPayload.Response.Data[1]), true)
  assert.equal(redbus.isRedBusRecord(jobsListPayload.Response.Data[2]), true)

  assert.deepEqual(
    redbus.filterRedBusRecords(jobsListPayload.Response.Data).map((job) => job.job_id),
    ['rb-001', 'rb-002'],
  )
})

test('run verifies the official RedBus surfaces and returns only exact RedBus jobs from the signed first-party APIs', async () => {
  const redbus = await loadRedBusModule()
  const textRequests = []
  const jobsListRequests = []
  const jobDetailRequests = []

  const jobs = await redbus.createRedBusScraper().run({
    now: () => '2026-08-14T00:00:00.000Z',
    getUnixTime: () => 1700000000,
    fetchText: async (url) => {
      textRequests.push(url)

      if (url === redbus.CAREERS_PAGE_URL) return careersPageHtml
      if (url === redbus.JOBS_PAGE_URL) return jobsPageHtml
      if (url === redbus.extractJobsBundleUrl(jobsPageHtml)) return jobsBundleJs

      throw new Error(`Unexpected RedBus text URL: ${url}`)
    },
    fetchJobsList: async ({ auth }) => {
      jobsListRequests.push(auth)
      return jobsListPayload
    },
    fetchJobDescription: async ({ jobId, auth }) => {
      jobDetailRequests.push({ jobId, auth })
      return jobDetailPayloadById[jobId]
    },
  })

  assert.deepEqual(textRequests, [
    redbus.CAREERS_PAGE_URL,
    redbus.JOBS_PAGE_URL,
    redbus.extractJobsBundleUrl(jobsPageHtml),
  ])
  assert.equal(jobsListRequests.length, 1)
  assert.deepEqual(
    jobDetailRequests.map((request) => request.jobId),
    ['rb-001', 'rb-002'],
  )
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      jobId: job.jobId,
      title: job.title,
      city: job.city,
      location: job.location,
      postingDate: job.postingDate,
      experienceRequired: job.experienceRequired,
      jobDescription: job.jobDescription,
    })),
    [
      {
        jobId: 'rb-001',
        title: 'Assistant Manager - SEO',
        city: 'Bangalore',
        location: 'Bangalore, Karnataka, India',
        postingDate: '2026-07-16',
        experienceRequired: '3 - 6 Years',
        jobDescription: 'Own redBus SEO and AI search growth.',
      },
      {
        jobId: 'rb-002',
        title: 'Senior Business Development Manager',
        city: 'Indore',
        location: 'Indore, Madhya Pradesh, India',
        postingDate: '2026-07-14',
        experienceRequired: '5 - 8 Years',
        jobDescription: 'Grow redBus demand across central India.',
      },
    ],
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
    ['2026-08-14T00:00:00.000Z', '2026-08-14T00:00:00.000Z'],
  )
})

test('RedBus fails closed when the verified jobs page, signed jobs API bundle, or API payload drifts', async () => {
  const redbus = await loadRedBusModule()

  await assert.rejects(
    redbus.createRedBusScraper().run({
      fetchText: async (url) => {
        if (url === redbus.CAREERS_PAGE_URL) return careersPageHtml
        if (url === redbus.JOBS_PAGE_URL) return '<html><body>broken</body></html>'
        throw new Error(`Unexpected RedBus text URL: ${url}`)
      },
      fetchJobsList: async () => jobsListPayload,
      fetchJobDescription: async () => jobDetailPayloadById['rb-001'],
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
      fetchJobsList: async () => jobsListPayload,
      fetchJobDescription: async () => jobDetailPayloadById['rb-001'],
    }),
    /signed redbus jobs api/i,
  )

  await assert.rejects(
    redbus.createRedBusScraper().run({
      fetchText: async (url) => {
        if (url === redbus.CAREERS_PAGE_URL) return careersPageHtml
        if (url === redbus.JOBS_PAGE_URL) return jobsPageHtml
        if (url === redbus.extractJobsBundleUrl(jobsPageHtml)) return jobsBundleJs
        throw new Error(`Unexpected RedBus text URL: ${url}`)
      },
      fetchJobsList: async () => ({ Error: null, Response: { Data: null } }),
      fetchJobDescription: async () => jobDetailPayloadById['rb-001'],
    }),
    /signed redbus jobs api no longer exposes a job array/i,
  )
})
