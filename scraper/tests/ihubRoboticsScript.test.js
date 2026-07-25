import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/ihubrobotics',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const careersShellHtml = readFixture('careers-shell.html')
const appBundleJs = readFixture('app-bundle.js')
const jobsPayload = JSON.parse(readFixture('job-positions.json'))

const loadModule = async () => {
  try {
    return await import('../ihubrobotics/script.js')
  } catch {
    assert.fail('Expected iHUB Robotics scraper module at ../ihubrobotics/script.js')
  }
}

test('iHUB Robotics validates the official careers shell, bundle, and India jobs payload', async () => {
  const ihub = await loadModule()

  assert.equal(ihub.SOURCE, 'ihubrobotics')
  assert.equal(ihub.COMPANY, 'iHUB Robotics')
  assert.equal(ihub.CAREERS_URL, 'https://www.ihubrobotics.com/careers')
  assert.equal(
    ihub.CAREERS_API_URL,
    'https://gwoqjnxfcovagwmpiwob.supabase.co/rest/v1/job_positions?select=*&is_active=eq.true&order=created_at.desc',
  )
  assert.equal(ihub.hasOfficialCareersShell(careersShellHtml), true)
  assert.equal(ihub.extractBundleAssetPath(careersShellHtml), '/assets/index-C9LiAOps.js')
  assert.equal(ihub.hasVerifiedCareersBundle(appBundleJs), true)
  assert.equal(
    ihub.extractSupabaseAnonKey(appBundleJs),
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b3FqbnhmY292YWd3bXBpd29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTQwOTYsImV4cCI6MjA4MDMzMDA5Nn0.m8Buc_ULlm5bb_EJjraEBCz96nn7KPMDAt19iVsSGm4',
  )
  assert.deepEqual(ihub.extractJobs(jobsPayload), [
    {
      title: 'Digital Marketer',
      company: 'iHUB Robotics',
      department: 'Marketing',
      location: 'Kochi, India',
      city: 'Kochi',
      country: 'India',
      jobId: '10eb1a1c-6e74-4a3a-8097-181fd8478dad',
      requisitionId: '10eb1a1c-6e74-4a3a-8097-181fd8478dad',
      sourceUrl: 'https://www.ihubrobotics.com/careers#open-positions',
      applyUrl: 'https://www.ihubrobotics.com/careers#open-positions',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Experience in digital marketing',
        'Knowledge of SEO, SEM, and social media marketing',
      ],
      postingDate: '2025-12-11T04:58:00.819878+00:00',
      closingDate: null,
      jobDescription: 'Plan and execute digital marketing campaigns to promote robotics products and build brand awareness.',
      remoteStatus: 'On-site',
    },
    {
      title: 'BD Executive (North India)',
      company: 'iHUB Robotics',
      department: 'Business Development',
      location: 'Delhi/NCR, India',
      city: 'Delhi/NCR',
      country: 'India',
      jobId: '1d2da86c-245c-49ae-9ae1-be304092ae80',
      requisitionId: '1d2da86c-245c-49ae-9ae1-be304092ae80',
      sourceUrl: 'https://www.ihubrobotics.com/careers#open-positions',
      applyUrl: 'https://www.ihubrobotics.com/careers#open-positions',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Experience in B2B sales in North India',
        'Excellent communication skills',
      ],
      postingDate: '2025-12-11T04:58:00.819878+00:00',
      closingDate: null,
      jobDescription: 'Lead business development efforts in North India region.',
      remoteStatus: 'On-site',
    },
  ])
})

test('iHUB Robotics run validates the shell and bundle, calls the public jobs API, and decorates jobs', async () => {
  const ihub = await loadModule()
  const requestedTextUrls = []
  const requestedJson = []

  const jobs = await ihub.createIhubRoboticsScraper().run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === ihub.CAREERS_URL) return careersShellHtml
      if (url === 'https://www.ihubrobotics.com/assets/index-C9LiAOps.js') return appBundleJs
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url, options) => {
      requestedJson.push([url, options])
      return jobsPayload
    },
    now: () => '2026-07-10T16:47:22.000Z',
  })

  assert.deepEqual(requestedTextUrls, [
    'https://www.ihubrobotics.com/careers',
    'https://www.ihubrobotics.com/assets/index-C9LiAOps.js',
  ])
  assert.deepEqual(requestedJson, [[
    'https://gwoqjnxfcovagwmpiwob.supabase.co/rest/v1/job_positions?select=*&is_active=eq.true&order=created_at.desc',
    {
      headers: {
        'User-Agent': ihub.USER_AGENT,
        Accept: 'application/json,text/plain,*/*',
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b3FqbnhmY292YWd3bXBpd29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTQwOTYsImV4cCI6MjA4MDMzMDA5Nn0.m8Buc_ULlm5bb_EJjraEBCz96nn7KPMDAt19iVsSGm4',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b3FqbnhmY292YWd3bXBpd29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTQwOTYsImV4cCI6MjA4MDMzMDA5Nn0.m8Buc_ULlm5bb_EJjraEBCz96nn7KPMDAt19iVsSGm4',
      },
    },
  ]])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'ihubrobotics')
  assert.equal(jobs[0].link, 'https://www.ihubrobotics.com/careers#open-positions')
  assert.equal(jobs[0].scrapedAt, '2026-07-10T16:47:22.000Z')
})

test('iHUB Robotics fails closed when the official shell, bundle, or jobs API contract changes', async () => {
  const ihub = await loadModule()

  await assert.rejects(
    ihub.createIhubRoboticsScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected shell</h1></body></html>',
      fetchJson: async () => jobsPayload,
    }),
    /verified official careers shell/i,
  )

  await assert.rejects(
    ihub.createIhubRoboticsScraper().run({
      fetchText: async (url) => {
        if (url === ihub.CAREERS_URL) return careersShellHtml
        return 'const route = "/careers";'
      },
      fetchJson: async () => jobsPayload,
    }),
    /client bundle changed materially/i,
  )

  await assert.rejects(
    ihub.createIhubRoboticsScraper().run({
      fetchText: async (url) => {
        if (url === ihub.CAREERS_URL) return careersShellHtml
        return appBundleJs
      },
      fetchJson: async () => ({ data: [] }),
    }),
    /public jobs api no longer returns the verified payload/i,
  )
})
