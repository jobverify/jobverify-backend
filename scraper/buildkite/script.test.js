import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  GREENHOUSE_BOARD_URL,
  GREENHOUSE_JOBS_API_URL,
  SOURCE,
  buildGreenhouseJobsApiUrl,
  createBuildkiteScraper,
  extractIndiaJobsFromGreenhousePayload,
  hasOfficialCareersPageSignal,
  normalizeGreenhouseJobUrl,
} from './script.js'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Work at Buildkite | Remote-first since 2013 | Buildkite</title>
  </head>
  <body>
    <main>
      <h1>Work at Buildkite</h1>
      <p>Remote-first since 2013.</p>
      <section>
        <h2>Open roles</h2>
      </section>
      <section>
        <h2>Join our talent community</h2>
        <a href="https://job-boards.greenhouse.io/buildkite-talent-community">Stay in touch</a>
      </section>
    </main>
  </body>
</html>
`

test('Buildkite constants and official careers page validation match the verified public surface', () => {
  assert.equal(SOURCE, 'buildkite')
  assert.equal(CAREERS_URL, 'https://buildkite.com/about/careers/')
  assert.equal(GREENHOUSE_BOARD_URL, 'https://job-boards.greenhouse.io/buildkite')
  assert.equal(GREENHOUSE_JOBS_API_URL, 'https://boards-api.greenhouse.io/v1/boards/buildkite/jobs')
  assert.equal(buildGreenhouseJobsApiUrl(), 'https://boards-api.greenhouse.io/v1/boards/buildkite/jobs?content=true')
  assert.equal(hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(hasOfficialCareersPageSignal('<html><body><h1>Buildkite jobs</h1></body></html>'), false)
  assert.equal(
    normalizeGreenhouseJobUrl('https://job-boards.greenhouse.io/buildkite/jobs/9876543210?gh_src=ref', '9876543210'),
    'https://job-boards.greenhouse.io/buildkite/jobs/9876543210',
  )
})

test('Buildkite Greenhouse extraction keeps only India jobs and maps canonical detail URLs', () => {
  const jobs = extractIndiaJobsFromGreenhousePayload({
    jobs: [
      {
        id: 111,
        title: 'Senior Developer Relations Engineer',
        company_name: 'Buildkite',
        absolute_url: 'https://job-boards.greenhouse.io/buildkite/jobs/111',
        location: { name: 'Americas Region' },
        departments: [{ name: 'Marketing' }],
        updated_at: '2026-07-24T10:00:00Z',
        content: '<p>Non-India role.</p>',
      },
      {
        id: 222,
        title: 'Solutions Engineer',
        company_name: 'Buildkite',
        absolute_url: 'https://job-boards.greenhouse.io/buildkite/jobs/222',
        location: { name: 'Bengaluru, India' },
        departments: [{ name: 'Sales' }],
        requisition_id: 'REQ-222',
        updated_at: '2026-07-25T08:30:00Z',
        content: '<p>Help customers adopt CI/CD pipelines.</p>',
      },
    ],
  }, { scrapedAt: '2026-07-25T09:00:00.000Z' })

  assert.deepEqual(jobs, [{
    title: 'Solutions Engineer',
    company: 'Buildkite',
    location: 'Bengaluru, India',
    city: 'Bengaluru',
    country: 'India',
    link: 'https://job-boards.greenhouse.io/buildkite/jobs/222',
    applyUrl: 'https://job-boards.greenhouse.io/buildkite/jobs/222',
    sourceUrl: 'https://job-boards.greenhouse.io/buildkite/jobs/222',
    source: 'buildkite',
    jobId: '222',
    requisitionId: 'REQ-222',
    department: 'Sales',
    employmentType: null,
    experienceRequired: null,
    jobDescription: 'Help customers adopt CI/CD pipelines.',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-25T08:30:00Z',
    closingDate: null,
    scrapedAt: '2026-07-25T09:00:00.000Z',
  }])
})

test('Buildkite scraper returns an honest empty India slice when the verified feed has no India roles', async () => {
  const jobs = await createBuildkiteScraper().run({
    fetchText: async (url) => {
      assert.equal(url, CAREERS_URL)
      return careersHtml
    },
    fetchJson: async (url) => {
      assert.equal(url, 'https://boards-api.greenhouse.io/v1/boards/buildkite/jobs?content=true')
      return {
        jobs: [
          {
            id: 1,
            title: 'Senior Product Manager',
            company_name: 'Buildkite',
            absolute_url: 'https://job-boards.greenhouse.io/buildkite/jobs/1',
            location: { name: 'ANZ Region' },
            content: '<p>Own product outcomes.</p>',
          },
          {
            id: 2,
            title: 'Senior Site Reliability Engineer',
            company_name: 'Buildkite',
            absolute_url: 'https://job-boards.greenhouse.io/buildkite/jobs/2',
            location: { name: 'Australia' },
            content: '<p>Keep the platform reliable.</p>',
          },
        ],
      }
    },
    now: () => '2026-07-25T09:00:00.000Z',
  })

  assert.deepEqual(jobs, [])
})

test('Buildkite scraper fails closed when the verified first-party page or Greenhouse identity changes', async () => {
  await assert.rejects(
    createBuildkiteScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected page</h1></body></html>',
      fetchJson: async () => ({ jobs: [] }),
    }),
    /verified official careers page/i,
  )

  assert.throws(
    () => extractIndiaJobsFromGreenhousePayload({
      jobs: [{
        id: 3,
        title: 'Solutions Engineer',
        company_name: 'Someone Else',
        absolute_url: 'https://job-boards.greenhouse.io/buildkite/jobs/3',
        location: { name: 'Bengaluru, India' },
      }],
    }),
    /verified company identity/i,
  )
})
