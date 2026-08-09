import assert from 'node:assert/strict'
import test from 'node:test'

const loadCleartripModule = async () => {
  try {
    return await import('../../scraper/cleartrip/script.js')
  } catch {
    assert.fail('Expected Cleartrip scraper module at ../../scraper/cleartrip/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Cleartrip | Careers</title>
  </head>
  <body>
    <section class="mission-section">
      <h2 class="statement">
        To make travel so accessible and affordable through technology, that every Indian who thinks of it, can actually take a trip.
      </h2>
    </section>
    <section class="testimonials-section">
      <h1>What Cleartrippers say</h1>
    </section>
    <section class="featured-jobs">
      <h2>Featured jobs for you</h2>
      <a href="https://flipkart.turbohire.co/careerpage/4d757ba0-3d57-448a-b82c-238ed87ac90f" class="check-all-btn">
        Check all jobs
      </a>
    </section>
  </body>
</html>
`

const verifiedOrgPayload = {
  OrgID: '4d757ba0-3d57-448a-b82c-238ed87ac90f',
  OrgName: 'Flipkart Internet Private Limited',
  CareerPageSubdomain: 'flipkart',
  OrgVerifiedDomains: '["@cleartrip.com","@flipkart.com","@flipkartfinance.com"]',
  IsCareerPagePublished: true,
}

const sampleTurboHirePayload = {
  Total: 3,
  Result: [
    {
      JobId: 'cleartrip-role-1',
      JobIdObfuscated: 'cleartrip-public-role-1',
      JobCode: 'CLT-1001',
      JobTitle: 'Senior Product Manager - Cleartrip Flights',
      Department: 'Cleartrip Growth',
      PublishedDate: '2026-07-13T12:22:49.0747037Z',
      ExpiryDates: {
        CAREERPAGE: '2026-08-29T00:00:00',
      },
      Location: '[{"Address":"Bengaluru, Karnataka, India","PlaceId":null}]',
      JobTypeV2: 'Replacement',
      Experience: {
        MinExp: 8,
        MaxExp: 12,
      },
      Skills: [
        'Flights',
        'Growth',
        'Cleartrip',
      ],
      JobDescV2: '<p>Build the next generation of Cleartrip flight booking experiences.</p>',
      CreatedByEmail: 'recruiting@cleartrip.com',
      OrgDetails: {
        OrgName: 'Flipkart Internet Private Limited',
      },
    },
    {
      JobId: 'flipkart-role-1',
      JobIdObfuscated: 'flipkart-public-role-1',
      JobCode: 'FIPL-40027',
      JobTitle: 'Shift incharge',
      Department: 'Fulfilment Center Ops',
      PublishedDate: '2026-07-01T16:16:15.4666667Z',
      ExpiryDates: {
        CAREERPAGE: '2026-08-31T00:00:00',
      },
      Location: '[{"Address":"Padgha, Maharashtra, India","PlaceId":null}]',
      JobTypeV2: 'Replacement',
      Experience: {
        MinExp: 6,
        MaxExp: 8,
      },
      Skills: [
        'Shift Operations Management',
        'Team Leadership',
      ],
      JobDescV2: '<p>Warehouse operations role for Flipkart logistics.</p>',
      CreatedByEmail: 'jayanth.hiremath@flipkart.com',
      OrgDetails: {
        OrgName: 'Flipkart Internet Private Limited',
      },
    },
    {
      JobId: 'cleartrip-role-2',
      JobIdObfuscated: 'cleartrip-public-role-2',
      JobCode: 'CLT-2002',
      JobTitle: 'Cleartrip Partnerships Lead',
      Department: 'Cleartrip Partnerships',
      PublishedDate: '2026-07-09T08:53:40.1233333Z',
      ExpiryDates: {
        CAREERPAGE: '2026-08-28T00:00:00',
      },
      Location: '[{"Address":"Dubai, United Arab Emirates","PlaceId":null}]',
      JobTypeV2: 'Incremental',
      Experience: {
        MinExp: 7,
        MaxExp: 10,
      },
      Skills: [
        'Cleartrip',
        'Partnerships',
      ],
      JobDescV2: '<p>Lead strategic travel partnerships for Cleartrip in the GCC.</p>',
      CreatedByEmail: 'hiring@cleartrip.com',
      OrgDetails: {
        OrgName: 'Flipkart Internet Private Limited',
      },
    },
  ],
}

const broadFlipkartOnlyPayload = {
  Total: 1,
  Result: [
    {
      JobId: 'flipkart-role-2',
      JobIdObfuscated: 'flipkart-public-role-2',
      JobCode: 'FIPL-62668',
      JobTitle: 'Assistant Manager Business Development',
      Department: 'Operations',
      PublishedDate: '2026-02-20T08:18:06.6993491Z',
      ExpiryDates: {
        CAREERPAGE: '2026-09-30T00:00:00',
      },
      Location: '[{"Address":"Belgaum, Karnataka, India","PlaceId":null}]',
      JobTypeV2: 'Incremental',
      Experience: {
        MinExp: 3,
        MaxExp: 6,
      },
      Skills: [
        'Supply Chain',
        'Data Analysis',
      ],
      JobDescV2: '<p>Broad Flipkart business role with no subsidiary-specific marker.</p>',
      CreatedByEmail: 'jayanth.hiremath@flipkart.com',
      OrgDetails: {
        OrgName: 'Flipkart Internet Private Limited',
      },
    },
  ],
}

test('Cleartrip helpers stay pinned to the verified first-party careers handoff and parent-company board metadata', async () => {
  const cleartrip = await loadCleartripModule()

  assert.equal(cleartrip.SOURCE, 'cleartrip')
  assert.equal(cleartrip.COMPANY, 'Cleartrip')
  assert.equal(cleartrip.OFFICIAL_JOBS_URL, 'https://www.cleartrip.com/jobs')
  assert.equal(cleartrip.CAREERS_URL, 'https://careers.cleartrip.com/')
  assert.equal(cleartrip.ORIGIN, 'https://flipkart.turbohire.co')
  assert.equal(cleartrip.ORG_ID, '4d757ba0-3d57-448a-b82c-238ed87ac90f')
  assert.equal(
    cleartrip.BOARD_URL,
    'https://flipkart.turbohire.co/careerpage/4d757ba0-3d57-448a-b82c-238ed87ac90f',
  )
  assert.equal(cleartrip.API_BASE_URL, 'https://thapi.azurewebsites.net')
  assert.equal(
    cleartrip.NOAUTH_TOKEN_URL,
    'https://thapi.azurewebsites.net/api/token/noauth',
  )
  assert.equal(
    cleartrip.PUBLIC_ORG_URL,
    'https://thapi.azurewebsites.net/api/publicorganizations/4d757ba0-3d57-448a-b82c-238ed87ac90f',
  )
  assert.equal(
    cleartrip.FILTERED_JOBS_URL,
    'https://thapi.azurewebsites.net/api/careerpagev2/filteredjobs?orgId=4d757ba0-3d57-448a-b82c-238ed87ac90f&pageType=0',
  )
  assert.equal(cleartrip.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(cleartrip.extractTurboHireHandoffUrl(officialCareersHtml), cleartrip.BOARD_URL)
  assert.deepEqual(cleartrip.extractVerifiedDomains(verifiedOrgPayload), [
    '@cleartrip.com',
    '@flipkart.com',
    '@flipkartfinance.com',
  ])
  assert.equal(cleartrip.hasVerifiedPublicOrgSignal(verifiedOrgPayload), true)
  assert.deepEqual(JSON.parse(cleartrip.buildFilteredJobsRequestBody()), {
    BunitIds: { Value: null, FilterType: 0 },
    Experience: { Value: null, FilterType: 0 },
    JobTypes: { Value: null, FilterType: 0 },
    Locations: { Value: null, FilterType: 0 },
    CreatedDate: { Value: null, FilterType: 0 },
    Compensation: { Value: null, FilterType: 0 },
    Skills: { Value: null, FilterType: 0 },
    Keyword: '',
    ClientIds: { Value: null, FilterType: 0 },
    Department: '',
    SortByV2: { Key: 'AtoZ', Order: 2 },
  })
})

test('extractCleartripJobs keeps only India roles with explicit Cleartrip signals from the parent-company board', async () => {
  const cleartrip = await loadCleartripModule()

  assert.deepEqual(cleartrip.extractCleartripJobs(sampleTurboHirePayload), [
    {
      title: 'Senior Product Manager - Cleartrip Flights',
      company: 'Cleartrip',
      department: 'Cleartrip Growth',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'cleartrip-role-1',
      requisitionId: 'CLT-1001',
      sourceUrl: 'https://flipkart.turbohire.co/job/publicjobs/cleartrip-public-role-1',
      applyUrl: 'https://flipkart.turbohire.co/job/publicjobs/cleartrip-public-role-1',
      employmentType: 'Replacement',
      experienceRequired: '8-12 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Flights',
        'Growth',
        'Cleartrip',
      ],
      postingDate: '2026-07-13T12:22:49.0747037Z',
      closingDate: '2026-08-29T00:00:00',
      jobDescription: 'Build the next generation of Cleartrip flight booking experiences.',
    },
  ])
})

test('run validates the official Cleartrip handoff, parent-company org evidence, and filtered jobs API before returning Cleartrip-scoped roles', async () => {
  const cleartrip = await loadCleartripModule()
  const requested = []

  const jobs = await cleartrip.createCleartripScraper({ maxJobs: 1 }).run({
    fetchPage: async (url) => {
      requested.push({ type: 'page', url })
      if (url === cleartrip.OFFICIAL_JOBS_URL) {
        return {
          status: 200,
          url: 'https://careers.cleartrip.com/#!',
          html: officialCareersHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, method: options.method || 'GET' })

      if (url === cleartrip.NOAUTH_TOKEN_URL) {
        return { access_token: 'public-token' }
      }

      if (url === cleartrip.PUBLIC_ORG_URL) {
        return verifiedOrgPayload
      }

      if (url === cleartrip.FILTERED_JOBS_URL) {
        assert.equal(options.method, 'POST')
        assert.equal(options.body, cleartrip.buildFilteredJobsRequestBody())
        return sampleTurboHirePayload
      }

      throw new Error(`Unexpected json URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    { type: 'page', url: cleartrip.OFFICIAL_JOBS_URL },
    { type: 'json', url: cleartrip.NOAUTH_TOKEN_URL, method: 'GET' },
    { type: 'json', url: cleartrip.PUBLIC_ORG_URL, method: 'GET' },
    { type: 'json', url: cleartrip.FILTERED_JOBS_URL, method: 'POST' },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'cleartrip')
  assert.equal(jobs[0].company, 'Cleartrip')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})

test('run returns an honest zero-job result when the verified handoff exists but no explicit Cleartrip-scoped jobs are published', async () => {
  const cleartrip = await loadCleartripModule()

  const jobs = await cleartrip.createCleartripScraper().run({
    fetchPage: async () => ({
      status: 200,
      url: 'https://careers.cleartrip.com/',
      html: officialCareersHtml,
    }),
    fetchJson: async (url) => {
      if (url === cleartrip.NOAUTH_TOKEN_URL) return { access_token: 'public-token' }
      if (url === cleartrip.PUBLIC_ORG_URL) return verifiedOrgPayload
      if (url === cleartrip.FILTERED_JOBS_URL) return broadFlipkartOnlyPayload
      throw new Error(`Unexpected json URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('run fails closed when the official Cleartrip surface or parent-company verification changes', async () => {
  const cleartrip = await loadCleartripModule()

  await assert.rejects(
    cleartrip.createCleartripScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://careers.cleartrip.com/',
        html: '<html><body><h1>Join us</h1></body></html>',
      }),
      fetchJson: async () => ({ access_token: 'public-token' }),
    }),
    /official careers surface changed/i,
  )

  await assert.rejects(
    cleartrip.createCleartripScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://careers.cleartrip.com/',
        html: officialCareersHtml.replace(
          'https://flipkart.turbohire.co/careerpage/4d757ba0-3d57-448a-b82c-238ed87ac90f',
          'https://example.com/jobs',
        ),
      }),
      fetchJson: async () => ({ access_token: 'public-token' }),
    }),
    /verified turbohire handoff changed/i,
  )

  await assert.rejects(
    cleartrip.createCleartripScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://careers.cleartrip.com/',
        html: officialCareersHtml,
      }),
      fetchJson: async (url) => {
        if (url === cleartrip.NOAUTH_TOKEN_URL) return { access_token: 'public-token' }
        if (url === cleartrip.PUBLIC_ORG_URL) {
          return {
            ...verifiedOrgPayload,
            OrgVerifiedDomains: '["@flipkart.com"]',
          }
        }

        throw new Error(`Unexpected json URL: ${url}`)
      },
    }),
    /verified public organization signal changed/i,
  )
})
