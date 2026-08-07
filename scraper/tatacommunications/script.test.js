import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const scriptPath = path.join(currentDir, 'script.js')
const jobsPath = path.join(currentDir, 'jobs.json')

const bootstrapPayload = {
  workflowId: 'wf-live-123',
}

const listingPayload = {
  data: {
    requisitions: [
      {
        displayId: 'TC-001',
        id: 'req-001',
        title: 'Senior Network Engineer',
        department: 'Network Services',
        employmentType: 'Full-time',
        experience: '5-8 years',
        qualification: 'B.E. / B.Tech',
        postedDate: '2026-07-18T00:00:00.000Z',
        locations: [
          {
            city: 'Chennai',
            state: 'Tamil Nadu',
            country: 'India',
          },
        ],
        summary: '<p>Keep global network services resilient.</p>',
      },
    ],
    totalPages: 1,
    totalRecords: 1,
    limit: 25,
  },
}

const detailPayload = {
  data: {
    requisition: {
      displayId: 'TC-001',
      id: 'req-001',
      title: 'Senior Network Engineer',
      department: 'Network Services',
      employmentType: 'Full-time',
      experience: '5-8 years',
      qualification: 'B.E. / B.Tech',
      postedDate: '2026-07-18T00:00:00.000Z',
      description: '<div>Design and operate Tata Communications network infrastructure.</div>',
      responsibilities: '<ul><li>Network design</li></ul>',
      qualifications: '<ul><li>Routing and switching</li></ul>',
      skills: [
        { skill: 'Routing' },
        { skill: 'Switching' },
      ],
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

Job ID 4717498478

Jaipur, Rajasthan, India

security operations center, logrhythm, threat detection and response, incident handling, arcsight siem, threat intelligence

3Y - 5Y

Posted 6 hours ago

Job ID 8839827944

Mumbai, Maharashtra, India

product development, product strategy, pricing, gtm planning, product lifecycle management, sales enablement, sla

1Y - 5Y

Posted 9 hours ago

Job ID 2152350934

Bengaluru, Karnataka, India

network operations, adva dwdm, asset management, change management, automation, incident management

6Y - 10Y

Posted 9 hours ago

Job ID 6115917441

Jaipur, Rajasthan, India

threat hunting, cybersecurity, siem, malware analysis, log hunt, mitre att&ck, log analysis

7Y - 12Y

Posted 11 hours ago

Job ID 1595583992

Singapore, Singapore

enterprise sales, business development, product, negotiation, network services, account management

12Y - 20Y

Posted 17 hours ago

Saved Jobs
EN
Login
We listen more when people root for you
We accept DOC, DOCX, TXT, PDF, WPS less than 5MB Upload Resume
Go
Skill
Role
Skills are extracted from the resume to connect you with the right opportunities
Filters:
Skills
Employment Type
Department
Job Type
Apply Filters
Clear all
Sort By:
Posting Date
AM- Financial Planning & Analysis
financial planning & analysis, budgeting, variance analysis, data analysis, financial models, accounting standards
Apply
Sr Engineer-Captive Operations
security operations center, logrhythm, threat detection and response, incident handling, arcsight siem, threat intelligence
Apply
Analyst - Hybrid Connectivity Services
product development, product strategy, pricing, gtm planning, product lifecycle management, sales enablement, sla
Apply
Assistant Manager - India Operations, New Rollouts and Automation
network operations, adva dwdm, asset management, change management, automation, incident management
Apply
Manager - Captive Operations
threat hunting, cybersecurity, siem, malware analysis, log hunt, mitre att&ck, log analysis
Apply
Sr Manager - Sales- APAC
enterprise sales, business development, product, negotiation, network services, account management
Apply
TATA COMMUNICATIONS
`

const loadModule = async () => import('./script.js')

test('run returns normalized India requisitions from the Spire listing and detail payloads', async () => {
  const tataCommunications = await loadModule()

  const requestedUrls = []
  const jobs = await tataCommunications.run({
    fetchJson: async (url) => {
      requestedUrls.push(String(url))

      if (String(url) === tataCommunications.WORKSPACE_BOOTSTRAP_URL) return bootstrapPayload
      if (String(url) === tataCommunications.buildListingApiUrl()) return listingPayload
      if (String(url) === tataCommunications.buildDetailApiUrl('TC-001')) return detailPayload

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    tataCommunications.WORKSPACE_BOOTSTRAP_URL,
    tataCommunications.buildListingApiUrl(),
    tataCommunications.buildDetailApiUrl('TC-001'),
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
    sourceUrl: tataCommunications.buildDetailApiUrl('TC-001'),
    applyUrl: tataCommunications.buildDetailApiUrl('TC-001'),
    employmentType: 'Full-time',
    experienceRequired: '5-8 years',
    minimumQualification: 'B.E. / B.Tech',
    preferredQualification: null,
    requiredSkills: [
      'Routing',
      'Switching',
    ],
    postingDate: '2026-07-18',
    closingDate: null,
    jobDescription: 'Design and operate Tata Communications network infrastructure. Network design Routing and switching',
    source: 'tatacommunications',
    link: tataCommunications.buildDetailApiUrl('TC-001'),
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
    } else if (requestUrl.endsWith('/requisition/_search')) {
      payload = listingPayload
    } else if (requestUrl.endsWith('/requisition/displayId/TC-001')) {
      payload = detailPayload
    } else {
      throw new Error(`Unexpected URL: ${requestUrl}`)
    }

    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify(payload)
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

test('run falls back to the public rendered careers page when the Spire listing API returns 401', async () => {
  const tataCommunications = await loadModule()

  const jobs = await tataCommunications.run({
    now: () => new Date('2026-08-05T12:00:00.000Z'),
    fetchJson: async (url) => {
      if (String(url) === tataCommunications.WORKSPACE_BOOTSTRAP_URL) {
        return bootstrapPayload
      }

      throw new Error(`HTTP 401 for ${url}`)
    },
    fetchRenderedText: async () => renderedCareersText,
  })

  assert.equal(jobs.length, 5)
  assert.deepEqual(jobs[0], {
    title: 'AM- Financial Planning & Analysis',
    company: 'Tata Communications',
    department: null,
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    jobId: '882635278',
    requisitionId: '882635278',
    sourceUrl: tataCommunications.HOME_URL,
    applyUrl: tataCommunications.HOME_URL,
    employmentType: null,
    experienceRequired: '1Y - 3Y',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'financial planning & analysis',
      'budgeting',
      'variance analysis',
      'data analysis',
      'financial models',
      'accounting standards',
    ],
    postingDate: '2026-08-05',
    closingDate: null,
    jobDescription: 'AM- Financial Planning & Analysis Mumbai, Maharashtra, India Skills: financial planning & analysis, budgeting, variance analysis, data analysis, financial models, accounting standards Experience: 1Y - 3Y Posted 35 minutes ago',
    source: 'tatacommunications',
    link: tataCommunications.HOME_URL,
    scrapedAt: '2026-08-05T12:00:00.000Z',
  })
  assert.deepEqual(jobs.map((job) => job.title), [
    'AM- Financial Planning & Analysis',
    'Sr Engineer-Captive Operations',
    'Analyst - Hybrid Connectivity Services',
    'Assistant Manager - India Operations, New Rollouts and Automation',
    'Manager - Captive Operations',
  ])
})
