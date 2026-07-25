import assert from 'node:assert/strict'
import test from 'node:test'

const loadTataCommunicationsModule = async () => {
  try {
    return await import('../tatacommunications/script.js')
  } catch {
    assert.fail('Expected Tata Communications scraper module at ../tatacommunications/script.js')
  }
}

const workflowBootstrapPayload = {
  data: {
    workflowId: 'wf-tcl-42',
  },
}

const listingPageOnePayload = {
  data: {
    page: 1,
    limit: 2,
    totalRecords: 3,
    totalPages: 2,
    aggregations: {
      country: [
        { key: 'India', count: 2 },
        { key: 'Singapore', count: 1 },
      ],
    },
    requisitions: [
      {
        id: 'REQ-1001',
        displayId: 'TC-1001',
        title: 'Lead Engineer - Networks',
        department: 'Engineering',
        employmentType: 'Full Time',
        summary: 'Build carrier network automation.',
        postedDate: '2026-07-07T10:15:00Z',
        locations: [
          {
            city: 'Pune',
            state: 'Maharashtra',
            country: 'India',
          },
        ],
      },
      {
        id: 'REQ-9999',
        displayId: 'TC-9999',
        title: 'Regional Program Manager',
        department: 'Operations',
        locations: [
          {
            city: 'Singapore',
            country: 'Singapore',
          },
        ],
      },
    ],
  },
}

const listingPageTwoPayload = {
  data: {
    page: 2,
    limit: 2,
    totalRecords: 3,
    totalPages: 2,
    aggregations: {
      country: [
        { key: 'India', count: 2 },
        { key: 'Singapore', count: 1 },
      ],
    },
    requisitions: [
      {
        id: 'REQ-1002',
        displayId: 'TC-1002',
        title: 'Platform Engineer',
        department: 'Engineering',
        employmentType: 'Full Time',
        summary: 'Scale internal platform services.',
        postedDate: '2026-07-08T09:00:00Z',
        locations: [
          {
            city: 'Chennai',
            state: 'Tamil Nadu',
            country: 'India',
          },
        ],
      },
    ],
  },
}

const detailPayloadByDisplayId = {
  'TC-1001': {
    data: {
      id: 'REQ-1001',
      displayId: 'TC-1001',
      title: 'Lead Engineer - Networks',
      department: 'Engineering',
      employmentType: 'Full Time',
      minimumQualification: 'Bachelor of Engineering',
      experienceRequired: '6-9 years',
      postedDate: '2026-07-07T10:15:00Z',
      closingDate: '2026-08-01T00:00:00Z',
      description: '<p>Build carrier network automation.</p><ul><li>Design resilient platforms</li></ul>',
      skills: ['Python', 'Network Automation'],
      locations: [
        {
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
        },
      ],
    },
  },
  'TC-1002': {
    data: {
      id: 'REQ-1002',
      displayId: 'TC-1002',
      title: 'Platform Engineer',
      department: 'Engineering',
      employmentType: 'Full Time',
      minimumQualification: 'Bachelor of Technology',
      experienceRequired: '4-7 years',
      postedDate: '2026-07-08T09:00:00Z',
      closingDate: '2026-08-05T00:00:00Z',
      description: '<p>Scale internal platform services.</p><p>Improve reliability.</p>',
      skills: ['Go', 'Kubernetes'],
      locations: [
        {
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
        },
      ],
    },
  },
}

test('Tata Communications scraper builds the Spire2Grow bootstrap, search, detail, and header contract', async () => {
  const tata = await loadTataCommunicationsModule()

  assert.equal(tata.CAREER_PAGE_URL, 'https://jobs.tatacommunications.com/')
  assert.equal(tata.WORKSPACE_DOMAIN, 'jobs.tatacommunications.com')
  assert.equal(tata.WORKSPACE_ID, 'TCLPROD-c62po')
  assert.equal(tata.API_BASE, 'https://io.spire2grow.com/ies/v1/p')
  assert.equal(
    tata.WORKSPACE_BOOTSTRAP_URL,
    'https://io.spire2grow.com/ies/v1/p/workspaceId?domain=jobs.tatacommunications.com',
  )
  assert.equal(
    tata.buildListingApiUrl(),
    'https://io.spire2grow.com/ies/v1/p/TCLPROD-c62po/requisition/_search',
  )
  assert.equal(
    tata.buildDetailApiUrl('TC-1001'),
    'https://io.spire2grow.com/ies/v1/p/TCLPROD-c62po/requisition/displayId/TC-1001',
  )
  assert.deepEqual(tata.buildBootstrapHeaders(), {
    Accept: 'application/json, text/plain, */*',
    WorkspaceId: 'TCLPROD-c62po',
    language: 'en',
    Origin: 'https://jobs.tatacommunications.com',
    Referer: 'https://jobs.tatacommunications.com/',
    'User-Agent': tata.DEFAULT_USER_AGENT,
  })
  assert.deepEqual(tata.buildRequestHeaders({ workflowId: 'wf-tcl-42' }), {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    WorkspaceId: 'TCLPROD-c62po',
    workflowId: 'wf-tcl-42',
    language: 'en',
    Origin: 'https://jobs.tatacommunications.com',
    Referer: 'https://jobs.tatacommunications.com/',
    'User-Agent': tata.DEFAULT_USER_AGENT,
  })
  assert.deepEqual(tata.buildListingRequestBody(), {
    page: 1,
    limit: 25,
    searchText: '',
    filters: {
      country: ['India'],
    },
    aggregations: ['country'],
  })
  assert.deepEqual(tata.buildListingRequestBody({ page: 3, pageSize: 10 }), {
    page: 3,
    limit: 10,
    searchText: '',
    filters: {
      country: ['India'],
    },
    aggregations: ['country'],
  })
  assert.equal(tata.extractWorkflowId(workflowBootstrapPayload), 'wf-tcl-42')
  assert.equal(tata.extractWorkflowId('TCLPROD-c62po'), 'TCLPROD-c62po')
})

test('run bootstraps the Tata Communications workspace, paginates from page 1, filters India roles, and falls back to the detail API URL', async () => {
  const tata = await loadTataCommunicationsModule()
  const scraper = tata.createTataCommunicationsScraper({
    maxPages: 3,
    pageSize: 2,
    maxJobs: 2,
  })
  const requests = []

  const jobs = await scraper.run({
    fetchJson: async (url, options = {}) => {
      requests.push({ url, options })

      if (url === tata.WORKSPACE_BOOTSTRAP_URL) {
        return workflowBootstrapPayload
      }

      if (url === tata.buildListingApiUrl()) {
        if (options.body?.page === 1) return listingPageOnePayload
        if (options.body?.page === 2) return listingPageTwoPayload
      }

      if (url === tata.buildDetailApiUrl('TC-1001')) {
        return detailPayloadByDisplayId['TC-1001']
      }

      if (url === tata.buildDetailApiUrl('TC-1002')) {
        return detailPayloadByDisplayId['TC-1002']
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
      url: tata.buildListingApiUrl(),
      options: {
        method: 'POST',
        headers: tata.buildRequestHeaders({ workflowId: 'wf-tcl-42' }),
        body: tata.buildListingRequestBody({ page: 1, pageSize: 2 }),
      },
    },
    {
      url: tata.buildDetailApiUrl('TC-1001'),
      options: {
        headers: tata.buildRequestHeaders({ workflowId: 'wf-tcl-42' }),
      },
    },
    {
      url: tata.buildListingApiUrl(),
      options: {
        method: 'POST',
        headers: tata.buildRequestHeaders({ workflowId: 'wf-tcl-42' }),
        body: tata.buildListingRequestBody({ page: 2, pageSize: 2 }),
      },
    },
    {
      url: tata.buildDetailApiUrl('TC-1002'),
      options: {
        headers: tata.buildRequestHeaders({ workflowId: 'wf-tcl-42' }),
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
    'https://io.spire2grow.com/ies/v1/p/TCLPROD-c62po/requisition/displayId/TC-1001',
  )
  assert.equal(jobs[0].applyUrl, jobs[0].sourceUrl)
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(jobs[0].minimumQualification, 'Bachelor of Engineering')
  assert.deepEqual(jobs[0].requiredSkills, ['Python', 'Network Automation'])
  assert.equal(jobs[0].postingDate, '2026-07-07')
  assert.equal(jobs[0].closingDate, '2026-08-01')
  assert.match(jobs[0].jobDescription, /Build carrier network automation/i)
  assert.match(jobs[0].jobDescription, /Design resilient platforms/i)
  assert.equal(jobs[1].jobId, 'TC-1002')
  assert.equal(jobs[1].city, 'Chennai')
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

    if (url === tata.buildListingApiUrl()) {
      return Response.json(listingPageOnePayload)
    }

    if (url === tata.buildDetailApiUrl('TC-1001')) {
      return Response.json(detailPayloadByDisplayId['TC-1001'])
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
    assert.equal(requests[1].url, tata.buildListingApiUrl())
    assert.equal(requests[1].options.headers.workflowId, tata.WORKSPACE_ID)
    assert.equal(jobs[0].jobId, 'TC-1001')
  } finally {
    globalThis.fetch = originalFetch
  }
})
