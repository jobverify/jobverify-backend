import assert from 'node:assert/strict'
import test from 'node:test'

const loadTataCommunicationsModule = async () => {
  try {
    return await import('../../scraper/tatacommunications/script.js')
  } catch {
    assert.fail('Expected Tata Communications scraper module at ../../scraper/tatacommunications/script.js')
  }
}

const workflowBootstrapPayload = {
  data: {
    workspaceId: 'TCLPROD-c62po',
    workflowId: 'WFU_BOOTSTRAP_42',
  },
}

const plainTextBootstrapPayload = 'TCLPROD-c62po'

const listingPageOnePayload = {
  entities: [
    {
      id: 'REQ-1001',
      displayId: 'TC-1001',
      jobTitle: 'Lead Engineer - Networks',
      departmentName: 'Engineering',
      employmentType: 'Full Time',
      requiredEducation: 'Bachelor of Engineering',
      requiredExperienceInMonths: {
        from: 72,
        to: 108,
      },
      jobStatus: {
        statusCode: 'OPEN',
      },
      jobPosting: {
        startDate: '2026-07-07T10:15:00Z',
        endDate: '2026-08-01T00:00:00Z',
      },
      jobDescription: '<p>Build carrier network automation.</p><ul><li>Design resilient platforms</li></ul>',
      skills: [
        { skill: 'Python' },
        { skill: 'Network Automation' },
      ],
      jobLocation: [
        {
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          fqLocationName: 'Pune, Maharashtra, India',
        },
      ],
    },
    {
      id: 'REQ-9999',
      displayId: 'TC-9999',
      jobTitle: 'Regional Program Manager',
      departmentName: 'Operations',
      jobStatus: {
        statusCode: 'OPEN',
      },
      jobPosting: {
        startDate: '2026-07-08T09:00:00Z',
      },
      jobLocation: [
        {
          city: 'Singapore',
          country: 'Singapore',
          fqLocationName: 'Singapore, Singapore',
        },
      ],
    },
  ],
  total: 3,
}

const listingPageTwoPayload = {
  entities: [
    {
      id: 'REQ-1002',
      displayId: 'TC-1002',
      jobTitle: 'Platform Engineer',
      departmentName: 'Engineering',
      employmentType: 'Full Time',
      requiredEducation: 'Bachelor of Technology',
      requiredExperienceInMonths: {
        from: 48,
        to: 84,
      },
      jobStatus: {
        statusCode: 'OPEN',
      },
      jobPosting: {
        startDate: '2026-07-08T09:00:00Z',
        endDate: '2026-08-05T00:00:00Z',
      },
      jobDescription: '<p>Scale internal platform services.</p><p>Improve reliability.</p>',
      skills: [
        { skill: 'Go' },
        { skill: 'Kubernetes' },
      ],
      jobLocation: [
        {
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          fqLocationName: 'Chennai, Tamil Nadu, India',
        },
      ],
    },
  ],
  total: 3,
}

test('Tata Communications scraper builds the public Spire bootstrap, search, and header contract', async () => {
  const tata = await loadTataCommunicationsModule()

  assert.equal(tata.CAREER_PAGE_URL, 'https://jobs.tatacommunications.com/')
  assert.equal(tata.HOME_URL, 'https://jobs.tatacommunications.com/home')
  assert.equal(tata.WORKSPACE_DOMAIN, 'jobs.tatacommunications.com')
  assert.equal(tata.WORKSPACE_ID, 'TCLPROD-c62po')
  assert.equal(tata.API_BASE, 'https://io.spire2grow.com/ies/v1/p')
  assert.equal(
    tata.WORKSPACE_BOOTSTRAP_URL,
    'https://io.spire2grow.com/ies/v1/p/workspaceId?domain=jobs.tatacommunications.com',
  )
  assert.equal(
    tata.buildJobsCountUrl(),
    'https://io.spire2grow.com/ies/v1/p/requisition/_count',
  )
  assert.equal(
    tata.buildListingApiUrl(),
    'https://io.spire2grow.com/ies/v1/p/requisition/_search?page=1&size=25&selectedSortOrder=desc&selectedSortField=postedOn',
  )
  assert.equal(
    tata.buildListingApiUrl({ page: 3, pageSize: 10 }),
    'https://io.spire2grow.com/ies/v1/p/requisition/_search?page=3&size=10&selectedSortOrder=desc&selectedSortField=postedOn',
  )
  assert.equal(
    tata.buildJobUrl('TC-1001'),
    'https://jobs.tatacommunications.com/jobs/TC-1001?tenantId=TCLPROD-c62po&ref=job-share-direct-link',
  )
  assert.equal(
    tata.buildDetailApiUrl('TC-1001'),
    'https://jobs.tatacommunications.com/jobs/TC-1001?tenantId=TCLPROD-c62po&ref=job-share-direct-link',
  )
  assert.deepEqual(tata.buildBootstrapHeaders(), {
    Accept: 'application/json, text/plain, */*',
    WorkspaceId: 'TCLPROD-c62po',
    language: 'en',
    Origin: 'https://jobs.tatacommunications.com',
    Referer: 'https://jobs.tatacommunications.com/',
    'User-Agent': tata.DEFAULT_USER_AGENT,
  })
  assert.deepEqual(tata.buildRequestHeaders({
    workspaceId: 'TCLPROD-c62po',
    workflowId: 'WFU_BOOTSTRAP_42',
  }), {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    WorkspaceId: 'TCLPROD-c62po',
    workflowId: 'WFU_BOOTSTRAP_42',
    language: 'en',
    Origin: 'https://jobs.tatacommunications.com',
    Referer: 'https://jobs.tatacommunications.com/',
    'User-Agent': tata.DEFAULT_USER_AGENT,
  })
  assert.deepEqual(tata.buildListingRequestBody(), {
    page: 1,
    size: 25,
    selectedSortOrder: 'desc',
    selectedSortField: 'postedOn',
  })
  assert.deepEqual(tata.buildListingRequestBody({ page: 3, pageSize: 10 }), {
    page: 3,
    size: 10,
    selectedSortOrder: 'desc',
    selectedSortField: 'postedOn',
  })
  assert.equal(tata.extractWorkspaceId(workflowBootstrapPayload), 'TCLPROD-c62po')
  assert.equal(tata.extractWorkflowId(workflowBootstrapPayload), 'WFU_BOOTSTRAP_42')
  assert.equal(tata.extractWorkspaceId('TCLPROD-c62po'), 'TCLPROD-c62po')
  assert.equal(tata.generateWorkflowId({ now: 1786730313463000 }), 'WFU_1786730313463000')
})

test('run bootstraps the Tata Communications workspace, paginates from page 1, filters India roles, and emits public job links', async () => {
  const tata = await loadTataCommunicationsModule()
  const scraper = tata.createTataCommunicationsScraper({
    maxPages: 3,
    pageSize: 2,
    maxJobs: 2,
  })
  const requests = []

  const jobs = await scraper.run({
    createWorkflowId: () => 'WFU_1786730313463000',
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })

      if (url === tata.WORKSPACE_BOOTSTRAP_URL) {
        return plainTextBootstrapPayload
      }

      if (url === tata.buildListingApiUrl({ page: 1, pageSize: 2 })) {
        return listingPageOnePayload
      }

      if (url === tata.buildListingApiUrl({ page: 2, pageSize: 2 })) {
        return listingPageTwoPayload
      }

      throw new Error(`Unexpected Tata Communications URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [
    {
      url: tata.WORKSPACE_BOOTSTRAP_URL,
      options: {
        headers: tata.buildBootstrapHeaders(),
      },
    },
    {
      url: tata.buildListingApiUrl({ page: 1, pageSize: 2 }),
      options: {
        method: 'GET',
        headers: tata.buildRequestHeaders({
          workspaceId: tata.WORKSPACE_ID,
          workflowId: 'WFU_1786730313463000',
        }),
      },
    },
    {
      url: tata.buildListingApiUrl({ page: 2, pageSize: 2 }),
      options: {
        method: 'GET',
        headers: tata.buildRequestHeaders({
          workspaceId: tata.WORKSPACE_ID,
          workflowId: 'WFU_1786730313463000',
        }),
      },
    },
  ])

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'tatacommunications')
  assert.equal(jobs[0].company, 'Tata Communications')
  assert.equal(jobs[0].title, 'Lead Engineer - Networks')
  assert.equal(jobs[0].location, 'Pune, Maharashtra, India')
  assert.equal(jobs[0].city, 'Pune')
  assert.equal(jobs[0].jobId, 'TC-1001')
  assert.equal(jobs[0].requisitionId, 'REQ-1001')
  assert.equal(
    jobs[0].sourceUrl,
    'https://jobs.tatacommunications.com/jobs/TC-1001?tenantId=TCLPROD-c62po&ref=job-share-direct-link',
  )
  assert.equal(jobs[0].applyUrl, jobs[0].sourceUrl)
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(jobs[0].minimumQualification, 'Bachelor of Engineering')
  assert.deepEqual(jobs[0].requiredSkills, ['Python', 'Network Automation'])
  assert.equal(jobs[0].experienceRequired, '6-9 years')
  assert.equal(jobs[0].postingDate, '2026-07-07')
  assert.equal(jobs[0].closingDate, '2026-08-01')
  assert.match(jobs[0].jobDescription, /Build carrier network automation/i)
  assert.match(jobs[0].jobDescription, /Design resilient platforms/i)
  assert.equal(jobs[1].jobId, 'TC-1002')
  assert.equal(jobs[1].city, 'Chennai')
  assert.equal(jobs[1].experienceRequired, '4-7 years')
  assert.match(jobs[1].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('run accepts the Tata Communications bootstrap endpoint when it returns the workspace id as plain text', async () => {
  const tata = await loadTataCommunicationsModule()
  const originalFetch = globalThis.fetch
  const requests = []

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options })

    if (url === tata.WORKSPACE_BOOTSTRAP_URL) {
      return new Response(tata.WORKSPACE_ID, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    if (url === tata.buildListingApiUrl({ page: 1, pageSize: 2 })) {
      return Response.json(listingPageOnePayload)
    }

    throw new Error(`Unexpected Tata Communications URL: ${url}`)
  }

  try {
    const jobs = await tata.createTataCommunicationsScraper({
      maxPages: 1,
      pageSize: 2,
      maxJobs: 1,
    }).run()

    assert.equal(jobs.length, 1)
    assert.equal(requests[0].url, tata.WORKSPACE_BOOTSTRAP_URL)
    assert.equal(requests[1].url, tata.buildListingApiUrl({ page: 1, pageSize: 2 }))
    assert.equal(requests[1].options.headers.WorkspaceId, tata.WORKSPACE_ID)
    assert.match(requests[1].options.headers.workflowId, /^WFU_\d+$/)
    assert.equal(jobs[0].jobId, 'TC-1001')
  } finally {
    globalThis.fetch = originalFetch
  }
})
