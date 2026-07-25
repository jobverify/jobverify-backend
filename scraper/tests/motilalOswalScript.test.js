import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Growth Opportunities | MOFSL</title>
  </head>
  <body>
    <main>
      <h1>Join us and build a rewarding career!</h1>
      <a href="https://motilaloswal.turbohire.co/">View Opportunities</a>
    </main>
  </body>
</html>
`

const officialBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Motilal Oswal Financial Services Ltd</title>
    <meta property="og:title" content="Motilal Oswal Financial Services Ltd - Career Page" />
    <meta property="og:description" content="Explore job opportunities at Motilal Oswal Financial Services Ltd" />
  </head>
  <body>
    <div id="root">You need to enable JavaScript to run this app.</div>
  </body>
</html>
`

const tokenPayload = {
  access_token: 'public-token-123',
}

const sampleFilteredJobsPayload = {
  Total: 2,
  Result: [
    {
      JobId: '3e2a66bf-8a92-479d-8540-d67c5ad4a54d',
      JobIdObfuscated: 'k4EksA%2FVAhabRMx4P%2FoDd4vzfS4iRwbhk_IbeLEYnT1pnLdCG09kgLlCbMt3ghQZ',
      JobCode: 'MOFSL-37444',
      JobTitle: 'Advisor PCG',
      Department: 'Advisory-PCG',
      PublishedDate: '2026-07-14T07:25:03.4535134Z',
      ExpiryDates: {
        CAREERPAGE: '2026-11-24T00:00:00',
      },
      Location: '[{"Address":"Mumbai, Maharashtra, India","PlaceId":null}]',
      JobTypeV2: 'Full Time',
      Experience: {
        MinExp: 5,
        MaxExp: 6,
      },
      Skills: ['Advisory', 'PCG', 'Equity', 'Equity advisor'],
      OrgDetails: {
        OrgID: '0f6e3a76-85ff-4b66-8bfa-4cd4fede4ffa',
        OrgName: 'Motilal Oswal Financial Services Ltd',
      },
      JobDescV2:
        '<ul><li><strong>Education:</strong> Graduate/Postgraduate in Finance, Commerce, or related fields.</li><li><strong>Experience:</strong> Equity advisory experience.</li></ul>',
    },
    {
      JobId: 'foreign-org-role',
      JobIdObfuscated: 'foreign-role-token',
      JobCode: 'OTHER-101',
      JobTitle: 'Ignore This Role',
      Department: 'Other',
      PublishedDate: '2026-07-10T00:00:00.0000000Z',
      ExpiryDates: {
        CAREERPAGE: '2026-12-31T00:00:00',
      },
      Location: '[{"Address":"London, United Kingdom","PlaceId":null}]',
      JobTypeV2: 'Full Time',
      Experience: {
        MinExp: 2,
        MaxExp: 3,
      },
      Skills: ['Ignore'],
      OrgDetails: {
        OrgID: 'other-org-id',
        OrgName: 'Other Company',
      },
      JobDescV2: '<p>Ignore this job.</p>',
    },
  ],
}

const loadMotilalOswalModule = async () => {
  try {
    return await import('../motilaloswal/script.js')
  } catch {
    assert.fail('Expected Motilal Oswal scraper module at ../motilaloswal/script.js')
  }
}

test('Motilal Oswal helpers stay pinned to the verified first-party careers handoff and TurboHire public jobs contract', async () => {
  const motilal = await loadMotilalOswalModule()

  assert.equal(motilal.SOURCE, 'motilaloswal')
  assert.equal(motilal.COMPANY_NAME, 'Motilal Oswal')
  assert.equal(motilal.OFFICIAL_BRAND_NAME, 'Motilal Oswal Financial Services Ltd')
  assert.equal(motilal.CAREERS_PAGE_URL, 'https://www.motilaloswal.com/careers/growth')
  assert.equal(motilal.TURBOHIRE_BOARD_URL, 'https://motilaloswal.turbohire.co/')
  assert.equal(motilal.ORIGIN, 'https://motilaloswal.turbohire.co')
  assert.equal(
    motilal.ORG_ID,
    '0f6e3a76-85ff-4b66-8bfa-4cd4fede4ffa',
  )
  assert.equal(motilal.NOAUTH_TOKEN_URL, 'https://thapi.azurewebsites.net/api/token/noauth')
  assert.equal(
    motilal.FILTERED_JOBS_URL,
    'https://thapi.azurewebsites.net/api/careerpagev2/filteredjobs?orgId=0f6e3a76-85ff-4b66-8bfa-4cd4fede4ffa&pageType=0',
  )
  assert.equal(motilal.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(
    motilal.extractTurboHireHandoffUrl(officialCareersHtml),
    'https://motilaloswal.turbohire.co/',
  )
  assert.equal(motilal.hasOfficialBoardSignal(officialBoardHtml), true)
  assert.deepEqual(JSON.parse(motilal.buildFilteredJobsRequestBody()), {
    SortByV2: { Key: 'PostedDate', Order: 2 },
    BunitIds: { Value: null, FilterType: 0 },
    Experience: { Value: null, FilterType: 0 },
    JobTypes: { Value: null, FilterType: 0 },
    JobTypeV2: { Value: null, FilterType: 0 },
    Locations: { Value: null, FilterType: 0 },
    CreatedDate: { Value: null, FilterType: 0 },
    Compensation: { Value: null, FilterType: 0 },
    Skills: { Value: null, FilterType: 0 },
    Keyword: '',
    ClientIds: { Value: null, FilterType: 0 },
    Department: '',
    CustomFields: {},
  })
  assert.deepEqual(motilal.extractPublicJobs(sampleFilteredJobsPayload), [
    {
      title: 'Advisor PCG',
      company: 'Motilal Oswal',
      department: 'Advisory-PCG',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '3e2a66bf-8a92-479d-8540-d67c5ad4a54d',
      requisitionId: 'MOFSL-37444',
      sourceUrl: 'https://motilaloswal.turbohire.co/job/publicjobs/k4EksA%2FVAhabRMx4P%2FoDd4vzfS4iRwbhk_IbeLEYnT1pnLdCG09kgLlCbMt3ghQZ',
      applyUrl: 'https://motilaloswal.turbohire.co/job/publicjobs/k4EksA%2FVAhabRMx4P%2FoDd4vzfS4iRwbhk_IbeLEYnT1pnLdCG09kgLlCbMt3ghQZ',
      employmentType: 'Full Time',
      experienceRequired: '5-6 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Advisory', 'PCG', 'Equity', 'Equity advisor'],
      postingDate: '2026-07-14T07:25:03.4535134Z',
      closingDate: '2026-11-24T00:00:00',
      jobDescription: 'Education: Graduate/Postgraduate in Finance, Commerce, or related fields. Experience: Equity advisory experience.',
    },
  ])
})

test('Motilal Oswal run follows the verified careers handoff, TurboHire board, and public filtered jobs API only', async () => {
  const motilal = await loadMotilalOswalModule()
  const pageRequests = []
  const jsonRequests = []

  const jobs = await motilal.createMotilalOswalScraper({
    fetchPage: async (url) => {
      pageRequests.push(url)

      if (url === motilal.CAREERS_PAGE_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      if (url === motilal.TURBOHIRE_BOARD_URL) {
        return {
          status: 200,
          url,
          html: officialBoardHtml,
        }
      }

      throw new Error(`Unexpected Motilal Oswal page URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      jsonRequests.push([url, options.method || 'GET'])

      if (url === motilal.NOAUTH_TOKEN_URL) return tokenPayload
      if (url === motilal.FILTERED_JOBS_URL) return sampleFilteredJobsPayload

      throw new Error(`Unexpected Motilal Oswal json URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  }).run()

  assert.deepEqual(pageRequests, [
    motilal.CAREERS_PAGE_URL,
    motilal.TURBOHIRE_BOARD_URL,
  ])
  assert.deepEqual(jsonRequests, [
    [motilal.NOAUTH_TOKEN_URL, 'GET'],
    [motilal.FILTERED_JOBS_URL, 'POST'],
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Advisor PCG',
      company: 'Motilal Oswal',
      department: 'Advisory-PCG',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '3e2a66bf-8a92-479d-8540-d67c5ad4a54d',
      requisitionId: 'MOFSL-37444',
      sourceUrl: 'https://motilaloswal.turbohire.co/job/publicjobs/k4EksA%2FVAhabRMx4P%2FoDd4vzfS4iRwbhk_IbeLEYnT1pnLdCG09kgLlCbMt3ghQZ',
      applyUrl: 'https://motilaloswal.turbohire.co/job/publicjobs/k4EksA%2FVAhabRMx4P%2FoDd4vzfS4iRwbhk_IbeLEYnT1pnLdCG09kgLlCbMt3ghQZ',
      employmentType: 'Full Time',
      experienceRequired: '5-6 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Advisory', 'PCG', 'Equity', 'Equity advisor'],
      postingDate: '2026-07-14T07:25:03.4535134Z',
      closingDate: '2026-11-24T00:00:00',
      jobDescription: 'Education: Graduate/Postgraduate in Finance, Commerce, or related fields. Experience: Equity advisory experience.',
      source: 'motilaloswal',
      link: 'https://motilaloswal.turbohire.co/job/publicjobs/k4EksA%2FVAhabRMx4P%2FoDd4vzfS4iRwbhk_IbeLEYnT1pnLdCG09kgLlCbMt3ghQZ',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
  ])
})

test('Motilal Oswal fails closed when the verified careers handoff or TurboHire board changes materially', async () => {
  const motilal = await loadMotilalOswalModule()

  await assert.rejects(
    motilal.createMotilalOswalScraper({
      fetchPage: async (url) => {
        if (url === motilal.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Motilal careers changed</h1></body></html>',
          }
        }

        throw new Error(`Unexpected Motilal Oswal page URL: ${url}`)
      },
    }).run(),
    /verified official careers page/i,
  )

  await assert.rejects(
    motilal.createMotilalOswalScraper({
      fetchPage: async (url) => {
        if (url === motilal.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: officialCareersHtml,
          }
        }

        if (url === motilal.TURBOHIRE_BOARD_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Board changed</h1></body></html>',
          }
        }

        throw new Error(`Unexpected Motilal Oswal page URL: ${url}`)
      },
    }).run(),
    /verified turbohire board/i,
  )
})
