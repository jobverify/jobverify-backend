import assert from 'node:assert/strict'
import test from 'node:test'

const loadCatalog = async () => import('../veehealthtek/catalog.js')
const loadScript = async () => import('../veehealthtek/script.js')

const currentOpeningsHtml = `
<!doctype html>
<html>
  <head><title>Current Openings - Vee Healthtek</title></head>
  <body>
    <h1>Current Openings</h1>
    <p>Vee Healthtek</p>
    <table class="yajra-datatable" id="technology_jobs"></table>
    <script>
      const tables = {
        medicalCoding: initTable('jobs_table', 'https://careers.veehealthtek.com/jobs/MedicalCoding'),
        medicalBilling: initTable('medical_coding', 'https://careers.veehealthtek.com/jobs/MedicalBilling'),
        technologyJobs: initTable('technology_jobs', 'https://careers.veehealthtek.com/jobs/technology_jobs'),
        philippinesJobs: initTable('philippines_jobs', 'https://careers.veehealthtek.com/jobs/philippines_jobs')
      };
    </script>
  </body>
</html>
`

const otherOpeningsHtml = `
<!doctype html>
<html>
  <body>
    <h3>IT Support</h3>
    <table class="yajra-datatable" id="ITsupport"></table>
    <script>
      $('#ITsupport').DataTable({
        ajax: { url: 'https://careers.veehealthtek.com/jobs/ITsupport' }
      });
    </script>
  </body>
</html>
`

const technologyPayload = {
  data: [
    {
      job_id: 339,
      title: 'Agentic AI Lead',
      description: '<a href="https://careers.veehealthtek.com/current-openings/healthcare-job-openings/339/job-opening-for-agentic-ai-lead-internal-project">View</a>',
      action: '<a href="https://careers.veehealthtek.com/register/user?339">Apply</a>',
      domain: 'Internal Project',
      hiring_category: '6-8 Years',
      location: 'Bangalore',
    },
  ],
}

const otherPayload = {
  data: [
    {
      job_id: 256,
      title: 'Experienced System Admin L2 &amp; Tech. Support Engineer',
      description: '<a href="https://careers.veehealthtek.com/current-openings/other-job-openings/256/job-opening-for-experienced-system-admin-l2-tech-support-engineer-system-admin">View</a>',
      action: '<a href="https://careers.veehealthtek.com/register/user?256">Apply</a>',
      domain: 'System Admin',
      hiring_category: '2-4 years',
      location: 'Bangalore &amp; Pune',
    },
  ],
}

test('Vee Healthtek catalog captures the verified first-party jobs endpoint contract', async () => {
  const { VEE_HEALTHTEK_CATALOG } = await loadCatalog()

  assert.equal(VEE_HEALTHTEK_CATALOG.source, 'veehealthtek')
  assert.equal(VEE_HEALTHTEK_CATALOG.atsPlatform, 'first-party-datatables-json')
  assert.match(VEE_HEALTHTEK_CATALOG.verifiedSurfaceSummary, /Agentic AI Lead/i)
  assert.match(VEE_HEALTHTEK_CATALOG.verifiedSurfaceSummary, /AR Caller Trainee/i)
})

test('Vee Healthtek discovers first-party jobs endpoints and maps India job rows', async () => {
  const vee = await loadScript()

  assert.equal(vee.hasOfficialCareersSignal(currentOpeningsHtml), true)
  assert.deepEqual(vee.extractEndpointUrls(currentOpeningsHtml), [
    'https://careers.veehealthtek.com/jobs/MedicalCoding',
    'https://careers.veehealthtek.com/jobs/MedicalBilling',
    'https://careers.veehealthtek.com/jobs/technology_jobs',
  ])

  assert.deepEqual(vee.mapJob(technologyPayload.data[0]), {
    title: 'Agentic AI Lead',
    company: 'Vee Healthtek',
    department: 'Internal Project',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '339',
    requisitionId: '339',
    sourceUrl: 'https://careers.veehealthtek.com/current-openings/healthcare-job-openings/339/job-opening-for-agentic-ai-lead-internal-project',
    applyUrl: 'https://careers.veehealthtek.com/register/user?339',
    employmentType: 'Full Time',
    experienceRequired: '6-8 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Internal Project',
  })
})

test('Vee Healthtek run aggregates first-party endpoint payloads and fails closed on drift', async () => {
  const vee = await loadScript()

  const jobs = await vee.run({
    fetchText: async (url) => {
      if (url === vee.CAREER_PAGE_URLS[0]) return currentOpeningsHtml
      if (url === vee.CAREER_PAGE_URLS[1]) return otherOpeningsHtml
      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url) => {
      if (url.includes('/technology_jobs?')) return technologyPayload
      if (url.includes('/ITsupport?')) return otherPayload
      return { data: [] }
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'veehealthtek')
  assert.equal(jobs[0].scrapedAt, '2026-07-18T00:00:00.000Z')

  await assert.rejects(
    vee.run({
      fetchText: async () => '<html><body>Unexpected</body></html>',
      fetchJson: async () => ({ data: [] }),
    }),
    /verified vee healthtek careers page/i,
  )
})
