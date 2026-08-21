import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const scriptPath = path.join(currentDir, 'script.js')
const jobsPath = path.join(currentDir, 'jobs.json')

const bootstrapPayload = 'TCLPROD-c62po'

const listingPayload = {
  entities: [
    {
      id: 'req-001',
      displayId: 'TC-001',
      jobTitle: 'Senior Network Engineer',
      departmentName: 'Network Services',
      employmentType: 'Full-time',
      requiredEducation: 'B.E. / B.Tech',
      requiredExperienceInMonths: {
        from: 60,
        to: 96,
      },
      jobStatus: {
        statusCode: 'OPEN',
      },
      jobPosting: {
        startDate: '2026-07-18T00:00:00.000Z',
        endDate: '2026-08-18T00:00:00.000Z',
      },
      jobLocation: [
        {
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          fqLocationName: 'Chennai, Tamil Nadu, India',
        },
      ],
      jobDescription: '<div>Design and operate Tata Communications network infrastructure.</div>',
      skills: [
        { skill: 'Routing' },
        { skill: 'Switching' },
      ],
    },
  ],
  total: 1,
}

const renderedCareersText = `
Jobs by category
Telecom Network Operations And Maintenance
1 job available
Explore Jobs

Job ID 882635278

Mumbai, Maharashtra, India

financial planning & analysis, budgeting, variance analysis, data analysis, financial models, accounting standards

1Y - 3Y

Posted 35 minutes ago

Posting Date
AM- Financial Planning & Analysis
financial planning & analysis, budgeting, variance analysis, data analysis, financial models, accounting standards
Apply
TATA COMMUNICATIONS
`

const loadModule = async () => import('./script.js')

test('run returns normalized India requisitions from the public Spire search payload', async () => {
  const tataCommunications = await loadModule()

  const requestedUrls = []
  const jobs = await tataCommunications.run({
    fetchJson: async (url) => {
      requestedUrls.push(String(url))

      if (String(url) === tataCommunications.WORKSPACE_BOOTSTRAP_URL) return bootstrapPayload
      if (String(url) === tataCommunications.buildListingApiUrl()) return listingPayload

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    tataCommunications.WORKSPACE_BOOTSTRAP_URL,
    tataCommunications.buildListingApiUrl(),
  ])

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Network Engineer',
    company: 'Tata Communications',
    department: 'Network Services',
    location: 'Chennai, Tamil Nadu, India',
    city: 'Chennai',
    jobId: 'TC-001',
    requisitionId: 'req-001',
    sourceUrl: tataCommunications.buildJobUrl('TC-001', tataCommunications.WORKSPACE_ID),
    applyUrl: tataCommunications.buildJobUrl('TC-001', tataCommunications.WORKSPACE_ID),
    employmentType: 'Full-time',
    experienceRequired: '5-8 years',
    minimumQualification: 'B.E. / B.Tech',
    preferredQualification: null,
    requiredSkills: [
      'Routing',
      'Switching',
    ],
    postingDate: '2026-07-18',
    closingDate: '2026-08-18',
    jobDescription: 'Design and operate Tata Communications network infrastructure.',
    source: 'tatacommunications',
    link: tataCommunications.buildJobUrl('TC-001', tataCommunications.WORKSPACE_ID),
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})

test('CLI dry-run writes jobs.json when the scraper is executed directly', async () => {
  const originalArgv = process.argv.slice()
  const originalFetch = globalThis.fetch
  const hadExistingJobsFile = fs.existsSync(jobsPath)
  const originalJobsFile = hadExistingJobsFile ? fs.readFileSync(jobsPath, 'utf8') : null
  const moduleUrl = `${pathToFileURL(scriptPath).href}?cli-test=${Date.now()}`

  globalThis.fetch = async (url) => {
    const requestUrl = String(url)
    let payload = null

    if (requestUrl.includes('/workspaceId?domain=')) {
      payload = bootstrapPayload
    } else if (requestUrl.includes('/requisition/_search?page=1&size=25')) {
      payload = listingPayload
    } else {
      throw new Error(`Unexpected URL: ${requestUrl}`)
    }

    return {
      ok: true,
      status: 200,
      async text() {
        return typeof payload === 'string' ? payload : JSON.stringify(payload)
      },
      async json() {
        return payload
      },
    }
  }

  process.argv = [process.execPath, scriptPath, '--dry-run']

  try {
    await import(moduleUrl)

    const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'))
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].title, 'Senior Network Engineer')
    assert.equal(jobs[0].source, 'tatacommunications')
  } finally {
    process.argv = originalArgv
    globalThis.fetch = originalFetch

    if (hadExistingJobsFile) {
      fs.writeFileSync(jobsPath, originalJobsFile)
    } else if (fs.existsSync(jobsPath)) {
      fs.rmSync(jobsPath)
    }
  }
})

test('run surfaces a public Spire search authorization failure without opening a rendered-browser fallback', async () => {
  const tataCommunications = await loadModule()

  let renderedFallbackCalled = false
  await assert.rejects(tataCommunications.run({
    fetchJson: async (url) => {
      if (String(url) === tataCommunications.WORKSPACE_BOOTSTRAP_URL) {
        return bootstrapPayload
      }

      throw new Error(`HTTP 401 for ${url}`)
    },
    fetchRenderedText: async () => {
      renderedFallbackCalled = true
      return renderedCareersText
    },
  }), /HTTP 401/)

  assert.equal(renderedFallbackCalled, false)
})
