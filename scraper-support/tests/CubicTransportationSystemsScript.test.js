import assert from 'node:assert/strict'
import test from 'node:test'

const blockedCareersHtml = `
<!doctype html>
<html style="height:100%">
  <head>
    <meta name="robots" content="noindex,nofollow">
    <script src="/_Incapsula_Resource?SWUDNSAI=31"></script>
  </head>
  <body>
    <iframe>Request unsuccessful. Incapsula incident ID: 736000290008243506-277102748239706</iframe>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Global Careers | Cubic</title>
  </head>
  <body>
    <h1>Global Careers</h1>
    <p>We have jobs at all of our locations around the world. What do you want to do?</p>
    <a href="https://cubic.wd1.myworkdayjobs.com/cubic_global_careers/jobs">Global Career Opportunities</a>
  </body>
</html>
`

const workdayBoardHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <link rel="canonical" href="https://cubic.wd1.myworkdayjobs.com/cubic_global_careers" />
    <meta property="og:title" content="Global.Innovative.Trusted" />
    <meta property="og:url" content="https://cubic.wd1.myworkdayjobs.com/cubic_global_careers/jobs" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

const seniorSiteReliabilityEngineerHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <meta property="og:title" content="Senior Site Reliability Engineer" />
  </head>
  <body>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'http://schema.org',
      '@type': 'JobPosting',
      title: 'Senior Site Reliability Engineer',
      description: 'Business Unit: Cubic Transportation Systems Company Details: Verified page. Job Details: Role Overview.',
      identifier: {
        '@type': 'PropertyValue',
        value: 'REQ_48649',
      },
      datePosted: '2026-07-31',
      employmentType: 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: '2038 Cubic Transportation Systems (India) Private Limited',
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'India',
          addressLocality: 'Hyderabad, Telangana',
        },
      },
    })}</script>
  </body>
</html>
`

const buildDetailHtml = ({
  title,
  requisitionId,
  businessUnit,
  country = 'India',
  locality,
  employmentType = 'FULL_TIME',
  postingDate = '2026-07-31',
  description = 'Role Overview',
}) => `
<!doctype html>
<html lang="en-US">
  <head>
    <meta property="og:title" content="${title}" />
  </head>
  <body>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'http://schema.org',
      '@type': 'JobPosting',
      title,
      description: `Business Unit: ${businessUnit} Company Details: Verified page. Job Details: ${description}.`,
      identifier: {
        '@type': 'PropertyValue',
        value: requisitionId,
      },
      datePosted: postingDate,
      employmentType,
      hiringOrganization: {
        '@type': 'Organization',
        name: '2038 Cubic Transportation Systems (India) Private Limited',
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressCountry: country,
          addressLocality: locality,
        },
      },
    })}</script>
  </body>
</html>
`

const pageZeroPayload = {
  total: 87,
  jobPostings: [
    {
      title: 'Senior Site Reliability Engineer',
      externalPath: '/job/Hyderabad-Telangana/Senior-Site-Reliability-Engineer_REQ_48649',
      locationsText: 'Hyderabad, Telangana',
      postedOn: 'Posted Yesterday',
      bulletFields: ['REQ_48649'],
    },
    {
      title: 'Manager, Financial Systems',
      externalPath: '/job/Hyderabad-Telangana/Manager--Financial-Systems_REQ_48188',
      locationsText: '2 Locations',
      postedOn: 'Posted 2 Days Ago',
      bulletFields: ['REQ_48188'],
    },
  ],
}

const pageTwentyPayload = {
  total: 0,
  jobPostings: [
    {
      title: 'Senior Product Security Architect',
      externalPath: '/job/IND-Hyderabad-Aparna/Senior-Product-Security-Architect_REQ_49134',
      locationsText: 'IND Hyderabad Aparna',
      postedOn: 'Posted 4 Days Ago',
      bulletFields: ['REQ_49134'],
    },
    {
      title: 'Field Services Technician 2',
      externalPath: '/job/United-Kingdom---Remote/Field-Services-Technician-2_REQ_49276',
      locationsText: 'United Kingdom - Remote',
      postedOn: 'Posted 2 Days Ago',
      bulletFields: ['REQ_49276'],
    },
  ],
}

const pageFortyPayload = {
  total: 0,
  jobPostings: [
    {
      title: 'Senior Accounts Payable Analyst',
      externalPath: '/job/Hyderabad-Telangana/Accounts-Payable-Analyst_REQ_48966',
      locationsText: 'Hyderabad, Telangana',
      postedOn: 'Posted 5 Days Ago',
      bulletFields: ['REQ_48966'],
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/cubictransportationsystems/script.js')
  } catch {
    assert.fail('Expected Cubic Transportation Systems scraper module at ../../scraper/cubictransportationsystems/script.js')
  }
}

test('Cubic Transportation Systems helpers stay pinned to the verified block state, Workday board, and CTS detail structured data', async () => {
  const cubic = await loadModule()
  const parsedDetail = cubic.extractStructuredJobPosting(seniorSiteReliabilityEngineerHtml)

  assert.equal(cubic.SOURCE, 'cubictransportationsystems')
  assert.equal(cubic.COMPANY, 'Cubic Transportation Systems')
  assert.equal(cubic.CAREERS_URL, 'https://www.cubic.com/global-careers')
  assert.equal(cubic.WORKDAY_BOARD_URL, 'https://cubic.wd1.myworkdayjobs.com/cubic_global_careers/jobs')
  assert.equal(cubic.COUNTRY_FILTER, 'India')
  assert.equal(cubic.VERIFIED_BUSINESS_UNIT, 'Cubic Transportation Systems')
  assert.equal(cubic.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(cubic.hasOfficialCareersBlockSignal(blockedCareersHtml), true)
  assert.equal(cubic.hasOfficialWorkdayBoardSignal(workdayBoardHtml), true)
  assert.equal(cubic.hasVerifiedCtsJobDetailSignal(seniorSiteReliabilityEngineerHtml), true)
  assert.equal(cubic.isBlockedWorkdayApiPayload({ errorCode: 'HTTP_500', httpStatus: 500 }), true)
  assert.equal(cubic.isLikelyIndiaPosting(pageZeroPayload.jobPostings[0]), true)
  assert.equal(cubic.isLikelyIndiaPosting(pageZeroPayload.jobPostings[1]), true)
  assert.equal(cubic.isLikelyIndiaPosting(pageTwentyPayload.jobPostings[1]), false)
  assert.equal(
    cubic.buildDetailUrl('/job/Hyderabad-Telangana/Senior-Site-Reliability-Engineer_REQ_48649'),
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Hyderabad-Telangana/Senior-Site-Reliability-Engineer_REQ_48649',
  )
  assert.equal(
    cubic.buildApplyUrl('https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Hyderabad-Telangana/Senior-Site-Reliability-Engineer_REQ_48649'),
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Hyderabad-Telangana/Senior-Site-Reliability-Engineer_REQ_48649/apply',
  )
  assert.deepEqual(
    parsedDetail,
    {
      title: 'Senior Site Reliability Engineer',
      description: 'Business Unit: Cubic Transportation Systems Company Details: Verified page. Job Details: Role Overview.',
      requisitionId: 'REQ_48649',
      employmentType: 'FULL_TIME',
      postingDate: '2026-07-31',
      country: 'India',
      locality: 'Hyderabad, Telangana',
      businessUnit: 'Cubic Transportation Systems',
      hiringOrganization: '2038 Cubic Transportation Systems (India) Private Limited',
    },
  )
  assert.equal(
    cubic.buildJobsRequestBody({ limit: 2, offset: 20 }),
    JSON.stringify({
      appliedFacets: {},
      limit: 2,
      offset: 20,
      searchText: '',
    }),
  )
})

test('Cubic Transportation Systems run tolerates the verified Incapsula block, paginates until the short page, and returns only India CTS roles', async () => {
  const cubic = await loadModule()
  const requests = []

  const jobs = await cubic.createCubicTransportationSystemsScraper({
    pageSize: 2,
    detailConcurrency: 1,
  }).run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === cubic.CAREERS_URL) return blockedCareersHtml
      if (url === cubic.WORKDAY_BOARD_URL) return workdayBoardHtml
      if (url === cubic.VERIFIED_JOB_DETAIL_URLS[0]) return seniorSiteReliabilityEngineerHtml
      if (url.endsWith('Senior-Site-Reliability-Engineer_REQ_48649')) return seniorSiteReliabilityEngineerHtml
      if (url.endsWith('Manager--Financial-Systems_REQ_48188')) {
        return buildDetailHtml({
          title: 'Manager, Financial Systems',
          requisitionId: 'REQ_48188',
          businessUnit: 'Cubic Corporation',
          locality: 'Hyderabad, Telangana',
        })
      }
      if (url.endsWith('Senior-Product-Security-Architect_REQ_49134')) {
        return buildDetailHtml({
          title: 'Senior Product Security Architect',
          requisitionId: 'REQ_49134',
          businessUnit: 'Cubic Transportation Systems',
          locality: 'IND Hyderabad Aparna',
        })
      }
      if (url.endsWith('Accounts-Payable-Analyst_REQ_48966')) {
        return buildDetailHtml({
          title: 'Senior Accounts Payable Analyst',
          requisitionId: 'REQ_48966',
          businessUnit: 'Cubic Corporation',
          locality: 'Hyderabad, Telangana',
        })
      }

      throw new Error(`Unexpected Cubic URL: ${url}`)
    },
    fetchJson: async (url, body) => {
      requests.push(`${url}::${body}`)
      assert.equal(url, cubic.JOBS_API_URL)

      const parsed = JSON.parse(body)
      if (parsed.offset === 0) return pageZeroPayload
      if (parsed.offset === 2) return pageTwentyPayload
      if (parsed.offset === 4) return pageFortyPayload

      throw new Error(`Unexpected Cubic offset: ${parsed.offset}`)
    },
    now: () => '2026-08-01T18:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Senior Site Reliability Engineer',
      'Senior Product Security Architect',
    ],
  )
  assert.deepEqual(
    jobs.map((job) => job.requisitionId),
    ['REQ_48649', 'REQ_49134'],
  )
  assert.equal(jobs[0].department, 'Cubic Transportation Systems')
  assert.equal(jobs[0].location, 'Hyderabad, Telangana, India')
  assert.equal(jobs[0].city, 'Hyderabad')
  assert.equal(jobs[0].state, 'Telangana')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].employmentType, 'FULL_TIME')
  assert.equal(
    jobs[0].sourceUrl,
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Hyderabad-Telangana/Senior-Site-Reliability-Engineer_REQ_48649',
  )
  assert.equal(
    jobs[1].location,
    'Hyderabad, India',
  )
  assert.equal(jobs[1].city, 'Hyderabad')
  assert.equal(jobs[1].state, null)
  assert.equal(jobs[1].source, 'cubictransportationsystems')
  assert.equal(
    jobs[1].link,
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/IND-Hyderabad-Aparna/Senior-Product-Security-Architect_REQ_49134/apply',
  )
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(requests, [
    cubic.CAREERS_URL,
    cubic.WORKDAY_BOARD_URL,
    cubic.VERIFIED_JOB_DETAIL_URLS[0],
    `${cubic.JOBS_API_URL}::${JSON.stringify({ appliedFacets: {}, limit: 2, offset: 0, searchText: '' })}`,
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Hyderabad-Telangana/Senior-Site-Reliability-Engineer_REQ_48649',
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Hyderabad-Telangana/Manager--Financial-Systems_REQ_48188',
    `${cubic.JOBS_API_URL}::${JSON.stringify({ appliedFacets: {}, limit: 2, offset: 2, searchText: '' })}`,
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/IND-Hyderabad-Aparna/Senior-Product-Security-Architect_REQ_49134',
    `${cubic.JOBS_API_URL}::${JSON.stringify({ appliedFacets: {}, limit: 2, offset: 4, searchText: '' })}`,
    'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Hyderabad-Telangana/Accounts-Payable-Analyst_REQ_48966',
  ])
})

test('Cubic Transportation Systems fails closed when the verified public board or detail structured data drift', async () => {
  const cubic = await loadModule()

  await assert.rejects(
    cubic.createCubicTransportationSystemsScraper({
      pageSize: 2,
      detailConcurrency: 1,
    }).run({
      fetchText: async (url) => {
        if (url === cubic.CAREERS_URL) return careersHtml
        if (url === cubic.WORKDAY_BOARD_URL) return '<html><body><h1>Unexpected board</h1></body></html>'
        throw new Error(`Unexpected Cubic URL: ${url}`)
      },
      fetchJson: async () => {
        throw new Error('Should not fetch JSON when the verified board has drifted')
      },
    }),
    /verified Cubic Workday board/i,
  )

  await assert.rejects(
    cubic.createCubicTransportationSystemsScraper({
      pageSize: 2,
      detailConcurrency: 1,
    }).run({
      fetchText: async (url) => {
        if (url === cubic.CAREERS_URL) return blockedCareersHtml
        if (url === cubic.WORKDAY_BOARD_URL) return workdayBoardHtml
        if (url === cubic.VERIFIED_JOB_DETAIL_URLS[0]) return '<html><body><h1>Senior Site Reliability Engineer</h1></body></html>'
        throw new Error(`Unexpected Cubic URL: ${url}`)
      },
      fetchJson: async () => {
        throw new Error('Should not fetch JSON when the verified detail page has drifted')
      },
    }),
    /verified CTS job detail page/i,
  )
})
