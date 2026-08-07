import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Moglix Careers</title>
  </head>
  <body>
    <h1>Let's grow together</h1>
    <a href="https://moglix.flexiele.com/careers/moglix/jobs">EXPLORE OPPORTUNITIES</a>
    <button>APPLY NOW</button>
  </body>
</html>
`

const liveCareerSectionRequestCiphertext =
  'U2FsdGVkX1/7DMhK7Rf2O8Q6SxCQezwfzjxVMmJiTTswaIUcvGEaqPmguydVOXqttlTa1xN0/TfWRhkqHNFylhGGbdGp3L8j+IkZBHlJ+AzCuw0VE9R2fEC7q74zYIebljFC0vNtQuAT3snDftNEgrlmWs8kf/ML6dSNQ2/lWvEkLP/C91dUcA5JfHKN/7vOSUP5aXKr1i0HMV1ik9uYJwsLjI1o9vD4limodI2fq1FY8VHnJcexcV+ezEp+asZnBShW9RZX6brPwv+gPDUf5geR6mQgJtYdFkJqQ2j9iFZBKsHUqHgIz/1poLoyNyKpZwnJw6ajTEwIuLozRRdaVK7GmBvAwGN/OsFqfk4nsfBnFChOpItAvIxUsjbcnKGOBRghFP987uuUEj312LdjLQ=='

const careerSectionResponse = {
  err: [],
  errCode: [],
  message: [],
  msgCode: [],
  data: {
    rows: [
      {
        site_name: 'Moglix Careers',
        site_url: 'moglix',
        active: 1,
      },
    ],
    count: 1,
  },
}

const gridSchema = {
  code: 'GRD0000837',
  name: 'career_jobs',
  label: 'Jobs',
  formCode: 'FRM0001379',
  columns: [
    { prop: 'job_title' },
    { prop: 'date_posted' },
    { prop: 'location' },
    { prop: 'department' },
    { prop: 'functional_area' },
    { prop: 'business_unit_name' },
  ],
}

const jobsListResponse = {
  err: [],
  errCode: [],
  message: [],
  msgCode: [],
  data: {
    rows: [
      {
        id: 4065,
        job_title: 'AM - Finance ( Credlix )',
        date_posted: '16-07-2026',
        job_category: null,
        location: 'Noida',
        job_type: 'Business Regular',
        employee_status: null,
        jd: '<p>Manage finance operations and statutory compliance.</p>',
        skill: ['Bank & Business Reconciliations', 'Financial Reporting & MIS'],
        min_yrs_of_exp: 2,
        max_yrs_of_exp: 4,
        department: 'Credlix - Central',
        location_code: 19755,
        department_code: 11788,
        functional_area: 'Finance',
        business_unit_code: 11669,
        business_unit_name: 'Credlix',
      },
      {
        id: 4057,
        job_title: 'Java Software developer',
        date_posted: '15-07-2026',
        job_category: null,
        location: 'Hyderabad',
        job_type: 'Business Regular',
        employee_status: null,
        jd: '<p>Build backend applications using Java and Spring Boot.</p>',
        skill: ['Java', 'Spring Boot', 'MySQL'],
        min_yrs_of_exp: 0,
        max_yrs_of_exp: 1,
        department: 'Moglix - Technology',
        location_code: 20264,
        department_code: 10440,
        functional_area: 'SCM',
        business_unit_code: 11400,
        business_unit_name: 'Tech',
      },
    ],
    count: 2,
  },
}

const loadMoglixModule = async () => {
  try {
    return await import('../../scraper/moglix/script.js')
  } catch {
    assert.fail('Expected Moglix scraper module at ../../scraper/moglix/script.js')
  }
}

test('Moglix scraper helpers stay pinned to the verified official careers page and encrypted API contract', async () => {
  const moglix = await loadMoglixModule()

  assert.equal(moglix.SOURCE, 'moglix')
  assert.equal(moglix.COMPANY, 'Moglix')
  assert.equal(moglix.OFFICIAL_CAREERS_URL, 'https://www.moglix.com/career')
  assert.equal(moglix.JOBS_BOARD_URL, 'https://moglix.flexiele.com/careers/moglix/jobs')
  assert.equal(moglix.CAREER_SECTION_CONFIG_URL, 'https://moglix-api.flexiele.com/api-pub/rec/careerSectionConfiguration/search')
  assert.equal(moglix.GRID_DEFINITION_URL, 'https://moglix-api.flexiele.com/grid?gridCode=GRD0000837')
  assert.equal(moglix.JOBS_API_URL, 'https://moglix-api.flexiele.com/api-pub/rec/careers/list')
  assert.equal(moglix.EXPECTED_SITE_URL, 'moglix')
  assert.equal(moglix.EXPECTED_SITE_NAME, 'Moglix Careers')
  assert.equal(moglix.EXPECTED_GRID_CODE, 'GRD0000837')
  assert.equal(moglix.EXPECTED_FORM_CODE, 'FRM0001379')
  assert.equal(moglix.REQUEST_ENCRYPTION_HEADER, 'fe-req-encrypted')
  assert.equal(moglix.RESPONSE_ENCRYPTION_HEADER, 'fe-res-encrypted')
  assert.equal(moglix.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.deepEqual(moglix.createCareerSectionConfigPayload(), {
    formCode: 'FRM0001493',
    sorting: [],
    requiresCounts: true,
    skip: 0,
    take: 50000,
    where: {
      ignoreAccent: false,
      isComplex: true,
      condition: 'and',
      predicates: [
        {
          ignoreAccent: true,
          isComplex: false,
          field: 'site_url',
          operator: 'equal',
          value: 'moglix',
          ignoreCase: true,
        },
      ],
    },
  })
  assert.deepEqual(moglix.createJobsListPayload(), {
    formCode: 'FRM0001379',
    gridCode: 'GRD0000837',
    sorted: [],
    requiresCounts: true,
    skip: 0,
    take: 50000,
  })
  assert.deepEqual(
    moglix.decryptJsonCiphertext(liveCareerSectionRequestCiphertext),
    moglix.createCareerSectionConfigPayload(),
  )
  assert.equal(
    moglix.encryptJsonCiphertext(moglix.createJobsListPayload(), {
      saltHex: '0011223344556677',
    }),
    'U2FsdGVkX18AESIzRFVmd48rcHISmn53lqgxtxS9UoEghMnYljd0gOj5wSZm+BZHuSxZ2uebeoRoQdPbJG2BzmorpmIcYzpbJllyCiXvj8xpEaDzKY3yWDv5OuMW6ASC5h9j3uEVmTDtqDkOaNvFezsq4ka7dqP/buqxGm7Lx1U=',
  )
  assert.deepEqual(
    moglix.extractSearchResults(jobsListResponse),
    [
      {
        title: 'AM - Finance ( Credlix )',
        company: 'Moglix',
        department: 'Credlix - Central',
        location: 'Noida, India',
        city: 'Noida',
        country: 'India',
        jobId: '4065',
        requisitionId: '4065',
        sourceUrl: 'https://moglix.flexiele.com/careers/moglix/job-description/4065',
        applyUrl: 'https://moglix.flexiele.com/careers/moglix/apply/4065',
        employmentType: 'Business Regular',
        experienceRequired: '2-4 Years',
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: ['Bank & Business Reconciliations', 'Financial Reporting & MIS'],
        postingDate: '2026-07-16',
        closingDate: null,
        jobDescription: 'Manage finance operations and statutory compliance.',
        functionalArea: 'Finance',
        businessUnit: 'Credlix',
      },
      {
        title: 'Java Software developer',
        company: 'Moglix',
        department: 'Moglix - Technology',
        location: 'Hyderabad, India',
        city: 'Hyderabad',
        country: 'India',
        jobId: '4057',
        requisitionId: '4057',
        sourceUrl: 'https://moglix.flexiele.com/careers/moglix/job-description/4057',
        applyUrl: 'https://moglix.flexiele.com/careers/moglix/apply/4057',
        employmentType: 'Business Regular',
        experienceRequired: '0-1 Years',
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: ['Java', 'Spring Boot', 'MySQL'],
        postingDate: '2026-07-15',
        closingDate: null,
        jobDescription: 'Build backend applications using Java and Spring Boot.',
        functionalArea: 'SCM',
        businessUnit: 'Tech',
      },
    ],
  )
})

test('Moglix run returns public jobs from the verified careers page, site configuration, grid schema, and encrypted jobs API', async () => {
  const moglix = await loadMoglixModule()
  const requestedPageUrls = []
  const requestedJsonUrls = []
  const requestedEncryptedCalls = []

  const jobs = await moglix.createMoglixScraper({
    now: () => '2026-07-16T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPageUrls.push(url)

      if (url === moglix.OFFICIAL_CAREERS_URL) {
        return { status: 200, url, html: officialCareersHtml }
      }

      throw new Error(`Unexpected Moglix page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)

      if (url === moglix.GRID_DEFINITION_URL) {
        return { status: 200, url, json: gridSchema }
      }

      throw new Error(`Unexpected Moglix JSON URL: ${url}`)
    },
    fetchEncryptedJson: async (url, payload) => {
      requestedEncryptedCalls.push({ url, payload })

      if (url === moglix.CAREER_SECTION_CONFIG_URL) {
        return { status: 200, url, json: careerSectionResponse }
      }

      if (url === moglix.JOBS_API_URL) {
        return { status: 200, url, json: jobsListResponse }
      }

      throw new Error(`Unexpected Moglix encrypted URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPageUrls, [moglix.OFFICIAL_CAREERS_URL])
  assert.deepEqual(requestedJsonUrls, [moglix.GRID_DEFINITION_URL])
  assert.deepEqual(requestedEncryptedCalls, [
    {
      url: moglix.CAREER_SECTION_CONFIG_URL,
      payload: moglix.createCareerSectionConfigPayload(),
    },
    {
      url: moglix.JOBS_API_URL,
      payload: moglix.createJobsListPayload(),
    },
  ])
  assert.deepEqual(jobs, [
    {
      title: 'AM - Finance ( Credlix )',
      company: 'Moglix',
      department: 'Credlix - Central',
      location: 'Noida, India',
      city: 'Noida',
      country: 'India',
      jobId: '4065',
      requisitionId: '4065',
      sourceUrl: 'https://moglix.flexiele.com/careers/moglix/job-description/4065',
      applyUrl: 'https://moglix.flexiele.com/careers/moglix/apply/4065',
      employmentType: 'Business Regular',
      experienceRequired: '2-4 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Bank & Business Reconciliations', 'Financial Reporting & MIS'],
      postingDate: '2026-07-16',
      closingDate: null,
      jobDescription: 'Manage finance operations and statutory compliance.',
      functionalArea: 'Finance',
      businessUnit: 'Credlix',
      source: 'moglix',
      link: 'https://moglix.flexiele.com/careers/moglix/apply/4065',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
    {
      title: 'Java Software developer',
      company: 'Moglix',
      department: 'Moglix - Technology',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: '4057',
      requisitionId: '4057',
      sourceUrl: 'https://moglix.flexiele.com/careers/moglix/job-description/4057',
      applyUrl: 'https://moglix.flexiele.com/careers/moglix/apply/4057',
      employmentType: 'Business Regular',
      experienceRequired: '0-1 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Java', 'Spring Boot', 'MySQL'],
      postingDate: '2026-07-15',
      closingDate: null,
      jobDescription: 'Build backend applications using Java and Spring Boot.',
      functionalArea: 'SCM',
      businessUnit: 'Tech',
      source: 'moglix',
      link: 'https://moglix.flexiele.com/careers/moglix/apply/4057',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
  ])
})

test('Moglix fails closed when the official careers page, site config, grid schema, or jobs feed changes', async () => {
  const moglix = await loadMoglixModule()

  await assert.rejects(
    moglix.createMoglixScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: '<html><body>No jobs handoff</body></html>' }),
      fetchJson: async (url) => ({ status: 200, url, json: gridSchema }),
      fetchEncryptedJson: async (url) => ({ status: 200, url, json: careerSectionResponse }),
    }),
    /official careers page/i,
  )

  await assert.rejects(
    moglix.createMoglixScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: officialCareersHtml }),
      fetchJson: async (url) => ({ status: 200, url, json: gridSchema }),
      fetchEncryptedJson: async (url) => ({
        status: 200,
        url,
        json: { ...careerSectionResponse, data: { rows: [{ site_name: 'Different Careers', site_url: 'moglix', active: 1 }], count: 1 } },
      }),
    }),
    /career section configuration/i,
  )

  await assert.rejects(
    moglix.createMoglixScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: officialCareersHtml }),
      fetchJson: async (url) => ({
        status: 200,
        url,
        json: { ...gridSchema, formCode: 'FRM0009999' },
      }),
      fetchEncryptedJson: async (url) => {
        if (url === moglix.CAREER_SECTION_CONFIG_URL) {
          return { status: 200, url, json: careerSectionResponse }
        }

        return { status: 200, url, json: jobsListResponse }
      },
    }),
    /grid schema/i,
  )

  await assert.rejects(
    moglix.createMoglixScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: officialCareersHtml }),
      fetchJson: async (url) => ({ status: 200, url, json: gridSchema }),
      fetchEncryptedJson: async (url) => {
        if (url === moglix.CAREER_SECTION_CONFIG_URL) {
          return { status: 200, url, json: careerSectionResponse }
        }

        return { status: 200, url, json: { data: { rows: { broken: true } } } }
      },
    }),
    /jobs feed/i,
  )
})
