import assert from 'node:assert/strict'
import test from 'node:test'

const careersPage = {
  status: 200,
  url: 'https://promptql.io/careers',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Join us to build the future of reliable AI | PromptQL</title>
      </head>
      <body>
        <main>
          <h1>Help developers build great products</h1>
          <p>Join our globally distributed team and work on the future of AI data-agents and PromptQL.</p>
          <h2>Open Roles</h2>
          <a href="https://jobs.gem.com/promptql">See Open Roles</a>
        </main>
      </body>
    </html>
  `,
}

const gemBoardPage = {
  status: 200,
  url: 'https://jobs.gem.com/promptql',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <meta name="description" content="PromptQL Careers" />
        <meta property="og:title" content="PromptQL Careers" />
        <meta property="og:url" content="https://jobs.gem.com/promptql" />
        <title>PromptQL Careers</title>
      </head>
      <body>
        <script>
          window['__GEM_TRACKING_CONTEXT__'] = {
            'type': 'job_board',
            'id': '4a76acaa-70ac-4e16-bedb-d4426e6a9d3c',
          };
        </script>
        <div id="content"></div>
        <script
          type="module"
          src="https://static.gem.com/scripts/jobBoards.ddgoqUdv.v2.min.js"
          crossorigin="anonymous"
        ></script>
      </body>
    </html>
  `,
}

const listPayload = {
  data: {
    oatsExternalJobPostings: {
      jobPostings: [
        {
          id: 'talent-community',
          extId: 'am9icG9zdDoSyQegiepY2OpFb9QhQ6VV',
          title: 'Join our Talent Community! ',
          locations: [
            {
              id: 'sf-office',
              name: 'San Francisco',
              city: 'San Francisco',
              isoCountry: 'USA',
              isRemote: false,
              extId: 'loc-us',
            },
            {
              id: 'blr-office',
              name: 'Bengaluru - Office',
              city: 'Bengaluru',
              isoCountry: 'IND',
              isRemote: false,
              extId: 'loc-in-office',
            },
            {
              id: 'remote-in',
              name: 'Remote - India',
              city: 'Bengaluru',
              isoCountry: 'IND',
              isRemote: true,
              extId: 'loc-in-remote',
            },
          ],
          job: {
            id: 'job-community',
            department: {
              id: 'dept-people',
              name: 'People',
              extId: 'dept-people',
            },
            locationType: 'REMOTE',
            employmentType: 'FULL_TIME',
          },
        },
        {
          id: 'forward-deployed-analyst',
          extId: 'am9icG9zdDqFcCqALL3yOrMp6tFzI6t8',
          title: 'Forward Deployed Analyst, Bangalore',
          locations: [
            {
              id: 'blr-office',
              name: 'Bengaluru - Office',
              city: 'Bengaluru',
              isoCountry: 'IND',
              isRemote: false,
              extId: 'loc-in-office',
            },
            {
              id: 'remote-in',
              name: 'Remote - India',
              city: 'Bengaluru',
              isoCountry: 'IND',
              isRemote: true,
              extId: 'loc-in-remote',
            },
          ],
          job: {
            id: 'job-fda',
            department: {
              id: 'dept-fde',
              name: 'Forward Deployed Engineering',
              extId: 'dept-fde',
            },
            locationType: 'REMOTE',
            employmentType: 'FULL_TIME',
          },
        },
        {
          id: 'remote-us',
          extId: 'am9icG9zdDoUSOnlyExample',
          title: 'Strategic Account Executive, AI Strategist',
          locations: [
            {
              id: 'sf-office',
              name: 'San Francisco',
              city: 'San Francisco',
              isoCountry: 'USA',
              isRemote: false,
              extId: 'loc-us',
            },
          ],
          job: {
            id: 'job-us',
            department: {
              id: 'dept-sales',
              name: 'Sales',
              extId: 'dept-sales',
            },
            locationType: 'REMOTE',
            employmentType: 'FULL_TIME',
          },
        },
      ],
    },
    oatsExternalJobPostingsFilters: [
      {
        type: 'LOCATION_CITY',
        displayName: 'Bengaluru',
        rawValue: 'bengaluru',
        value: '2__bengaluru',
        count: 2,
      },
    ],
    jobBoardExternal: {
      id: 'board-promptql',
      teamDisplayName: 'PromptQL',
      descriptionHtml: '<p>PromptQL Careers</p>',
      pageTitle: 'PromptQL Careers',
    },
  },
}

const analystDetailPayload = {
  data: {
    oatsExternalJobPosting: {
      id: 'forward-deployed-analyst',
      title: 'Forward Deployed Analyst, Bangalore',
      extId: 'am9icG9zdDqFcCqALL3yOrMp6tFzI6t8',
      descriptionHtml: `
        <div><strong>About the team</strong></div>
        <div>PromptQL’s Forward Deployed Analysts are data scientists, analysts, or biz ops experts who help shape PromptQL into a high-quality AI-analyst.</div>
      `,
      startDateTs: null,
      firstPublishedTsSec: 1765227566,
      companyLogo: null,
      companyUrl: null,
      isApplicationFormHidden: false,
      isUnlistedExternally: false,
      locations: [
        {
          id: 'blr-office',
          extId: 'loc-in-office',
          name: 'Bengaluru - Office',
          city: 'Bengaluru',
          isoCountry: 'IND',
          isRemote: false,
        },
        {
          id: 'remote-in',
          extId: 'loc-in-remote',
          name: 'Remote - India',
          city: 'Bengaluru',
          isoCountry: 'IND',
          isRemote: true,
        },
      ],
      job: {
        id: 'job-fda',
        locationType: 'REMOTE',
        employmentType: 'FULL_TIME',
        requisitionId: 'R36',
        teamDisplayName: 'PromptQL',
        department: {
          id: 'dept-fde',
          extId: 'dept-fde',
          name: 'Forward Deployed Engineering',
        },
        locations: [
          {
            id: 'blr-office',
            extId: 'loc-in-office',
            name: 'Bengaluru - Office',
            city: 'Bengaluru',
            isoCountry: 'IND',
            isRemote: false,
          },
          {
            id: 'remote-in',
            extId: 'loc-in-remote',
            name: 'Remote - India',
            city: 'Bengaluru',
            isoCountry: 'IND',
            isRemote: true,
          },
        ],
      },
      jobPostSectionHtml: {
        introHtml: null,
        outroHtml: null,
      },
      compensationHtml: null,
    },
  },
}

const loadHasuraModule = async () => {
  try {
    return await import('../../scraper/hasura/script.js')
  } catch {
    assert.fail('Expected Hasura scraper module at ../../scraper/hasura/script.js')
  }
}

test('Hasura helpers stay pinned to the verified Hasura redirect, PromptQL careers page, and Gem board contract from July 16, 2026', async () => {
  const hasura = await loadHasuraModule()

  assert.equal(hasura.SOURCE, 'hasura')
  assert.equal(hasura.COMPANY, 'Hasura')
  assert.equal(hasura.OFFICIAL_BRAND_NAME, 'PromptQL')
  assert.equal(hasura.CAREERS_URL, 'https://hasura.io/careers/')
  assert.equal(hasura.REDIRECTED_CAREERS_URL, 'https://promptql.io/careers')
  assert.equal(hasura.GEM_BOARD_URL, 'https://jobs.gem.com/promptql')
  assert.equal(hasura.GRAPHQL_URL, 'https://jobs.gem.com/api/public/graphql')
  assert.equal(
    hasura.GEM_BOARD_BUNDLE_URL,
    'https://static.gem.com/scripts/jobBoards.ddgoqUdv.v2.min.js',
  )
  assert.equal(hasura.GEM_BOARD_TRACKING_ID, '4a76acaa-70ac-4e16-bedb-d4426e6a9d3c')
  assert.equal(hasura.VERIFIED_ON, '2026-07-16')
  assert.match(hasura.VERIFIED_SURFACE_SUMMARY, /Forward Deployed Analyst, Bangalore/i)
  assert.match(hasura.LIST_QUERY, /query JobBoardList/i)
  assert.match(hasura.DETAIL_QUERY, /query ExternalJobPostingQuery/i)
  assert.equal(hasura.hasOfficialCareersSignal(careersPage), true)
  assert.equal(hasura.hasOfficialGemBoardSignal(gemBoardPage), true)
  assert.equal(hasura.hasValidJobBoardListPayload(listPayload), true)
  assert.equal(hasura.isTalentCommunityPosting('Join our Talent Community! '), true)
  assert.equal(hasura.isTalentCommunityPosting('Forward Deployed Analyst, Bangalore'), false)
  assert.equal(
    hasura.toJobDetailUrl('am9icG9zdDqFcCqALL3yOrMp6tFzI6t8'),
    'https://jobs.gem.com/promptql/am9icG9zdDqFcCqALL3yOrMp6tFzI6t8',
  )
  assert.equal(
    hasura.toApplyUrl('am9icG9zdDqFcCqALL3yOrMp6tFzI6t8'),
    'https://jobs.gem.com/promptql/am9icG9zdDqFcCqALL3yOrMp6tFzI6t8/application',
  )
})

test('Hasura extracts only actionable India Gem postings and maps detail payloads into shared job fields', async () => {
  const hasura = await loadHasuraModule()
  const stubs = hasura.extractIndiaJobStubs(listPayload)

  assert.deepEqual(
    stubs.map((job) => ({
      title: job.title,
      extId: job.extId,
      department: job.department,
      indiaLocations: job.indiaLocations.map((location) => ({
        name: location.name,
        city: location.city,
        isRemote: location.isRemote,
      })),
    })),
    [
      {
        title: 'Forward Deployed Analyst, Bangalore',
        extId: 'am9icG9zdDqFcCqALL3yOrMp6tFzI6t8',
        department: 'Forward Deployed Engineering',
        indiaLocations: [
          {
            name: 'Bengaluru - Office',
            city: 'Bengaluru',
            isRemote: false,
          },
          {
            name: 'Remote - India',
            city: 'Bengaluru',
            isRemote: true,
          },
        ],
      },
    ],
  )

  const job = hasura.buildJobFromDetail(stubs[0], analystDetailPayload)

  assert.deepEqual(job, {
    title: 'Forward Deployed Analyst, Bangalore',
    company: 'Hasura',
    department: 'Forward Deployed Engineering',
    location: 'Bangalore, India; Remote, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'am9icG9zdDqFcCqALL3yOrMp6tFzI6t8',
    requisitionId: 'R36',
    sourceUrl: 'https://jobs.gem.com/promptql/am9icG9zdDqFcCqALL3yOrMp6tFzI6t8',
    applyUrl: 'https://jobs.gem.com/promptql/am9icG9zdDqFcCqALL3yOrMp6tFzI6t8/application',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2025-12-08T20:59:26.000Z',
    closingDate: null,
    jobDescription:
      'About the team PromptQL’s Forward Deployed Analysts are data scientists, analysts, or biz ops experts who help shape PromptQL into a high-quality AI-analyst.',
    remoteStatus: 'Remote',
  })
})

test('Hasura run validates the redirect, Gem board shell, list query, and detail query before returning India jobs', async () => {
  const hasura = await loadHasuraModule()
  const requestedPages = []
  const requestedBodies = []

  const jobs = await hasura.createHasuraScraper({
    now: () => '2026-07-16T18:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)
      if (url === hasura.CAREERS_URL) return careersPage
      if (url === hasura.GEM_BOARD_URL) return gemBoardPage
      throw new Error(`Unexpected Hasura page URL: ${url}`)
    },
    fetchGraphql: async (body) => {
      requestedBodies.push(body)
      if (body.operationName === 'JobBoardList') return listPayload
      if (body.variables?.extId === 'am9icG9zdDqFcCqALL3yOrMp6tFzI6t8') return analystDetailPayload
      throw new Error(`Unexpected Hasura GraphQL body: ${JSON.stringify(body)}`)
    },
  })

  assert.deepEqual(requestedPages, [
    hasura.CAREERS_URL,
    hasura.GEM_BOARD_URL,
  ])
  assert.deepEqual(
    requestedBodies.map((body) => ({
      operationName: body.operationName,
      boardId: body.variables?.boardId,
      extId: body.variables?.extId ?? null,
    })),
    [
      {
        operationName: 'JobBoardList',
        boardId: 'promptql',
        extId: null,
      },
      {
        operationName: 'ExternalJobPostingQuery',
        boardId: 'promptql',
        extId: 'am9icG9zdDqFcCqALL3yOrMp6tFzI6t8',
      },
    ],
  )
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      link: job.link,
      source: job.source,
      companyCareerPage: job.companyCareerPage,
      companyDomain: job.companyDomain,
      atsPlatform: job.atsPlatform,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Forward Deployed Analyst, Bangalore',
        link: 'https://jobs.gem.com/promptql/am9icG9zdDqFcCqALL3yOrMp6tFzI6t8/application',
        source: 'hasura',
        companyCareerPage: 'https://hasura.io/careers/',
        companyDomain: 'jobs.gem.com',
        atsPlatform: 'gem',
        scrapedAt: '2026-07-16T18:00:00.000Z',
      },
    ],
  )
})

test('Hasura fails closed when the careers redirect, Gem board shell, list payload, or detail payload drift materially', async () => {
  const hasura = await loadHasuraModule()

  await assert.rejects(
    hasura.createHasuraScraper().run({
      fetchPage: async (url) => {
        if (url === hasura.CAREERS_URL) {
          return {
            status: 200,
            url: 'https://hasura.io/careers/',
            html: '<html><body><h1>Unexpected</h1></body></html>',
          }
        }
        throw new Error(`Unexpected Hasura page URL: ${url}`)
      },
    }),
    /careers redirect surface/i,
  )

  await assert.rejects(
    hasura.createHasuraScraper().run({
      fetchPage: async (url) => {
        if (url === hasura.CAREERS_URL) return careersPage
        if (url === hasura.GEM_BOARD_URL) {
          return {
            status: 200,
            url: hasura.GEM_BOARD_URL,
            html: '<html><head><title>PromptQL Careers</title></head><body>No Gem bundle</body></html>',
          }
        }
        throw new Error(`Unexpected Hasura page URL: ${url}`)
      },
    }),
    /Gem board shell no longer matches/i,
  )

  await assert.rejects(
    hasura.createHasuraScraper().run({
      fetchPage: async (url) => {
        if (url === hasura.CAREERS_URL) return careersPage
        if (url === hasura.GEM_BOARD_URL) return gemBoardPage
        throw new Error(`Unexpected Hasura page URL: ${url}`)
      },
      fetchGraphql: async () => ({
        data: {
          oatsExternalJobPostings: { jobPostings: [] },
          oatsExternalJobPostingsFilters: [],
          jobBoardExternal: {
            id: 'other',
            teamDisplayName: 'Other',
            descriptionHtml: '',
            pageTitle: 'Other Careers',
          },
        },
      }),
    }),
    /public job board list payload/i,
  )

  await assert.rejects(
    hasura.createHasuraScraper().run({
      fetchPage: async (url) => {
        if (url === hasura.CAREERS_URL) return careersPage
        if (url === hasura.GEM_BOARD_URL) return gemBoardPage
        throw new Error(`Unexpected Hasura page URL: ${url}`)
      },
      fetchGraphql: async (body) => {
        if (body.operationName === 'JobBoardList') return listPayload
        return {
          data: {
            oatsExternalJobPosting: {
              ...analystDetailPayload.data.oatsExternalJobPosting,
              title: null,
            },
          },
        }
      },
    }),
    /job detail payload/i,
  )
})
