import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const careersHtml = `
<html>
  <head><title>E2logy Careers | Join a Dynamic Team of IT Professionals</title></head>
  <body>
    <section class="current_opening">
      <div id="rec_job_listing_div"></div>
      <script>
        rec_embed_js.load({
          widget_id:"rec_job_listing_div",
          page_name:"Careers",
          source:"CareerSite",
          site:"https://e2logy.zohorecruit.com",
          empty_job_msg:"No current Openings"
        });
      </script>
    </section>
  </body>
</html>
`

const jobsPayload = {
  code: 'success',
  data: [
    {
      Industry: 'IT Services',
      Job_Type: 'Full time',
      Job_Opening_Name: 'Java SpringBoot Developer (ASE)',
      Posting_Title: 'Java SpringBoot Developer (ASE)',
      Country: 'India',
      City: 'Noida Sector 73',
      id: '424443000011051040',
      $url: 'https://e2logy.zohorecruit.com/jobs/Careers/424443000011051040/Java-SpringBoot-Developer-ASE?source=CareerSite',
    },
  ],
}

const loadE2logyModule = async () => import('./script.js')

test('E2logy Software Solutions builds the verified Zoho Recruit public jobs URL and maps openings', async () => {
  const e2logy = await loadE2logyModule()

  assert.equal(
    e2logy.buildZohoJobsApiUrl(),
    'https://e2logy.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.equal(e2logy.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(e2logy.extractZohoJobs(jobsPayload), [
    {
      title: 'Java SpringBoot Developer (ASE)',
      company: 'E2logy Software Solutions',
      department: 'IT Services',
      location: 'Noida Sector 73, India',
      city: 'Noida Sector 73',
      country: 'India',
      jobId: '424443000011051040',
      requisitionId: '424443000011051040',
      sourceUrl: 'https://e2logy.zohorecruit.com/jobs/Careers/424443000011051040/Java-SpringBoot-Developer-ASE?source=CareerSite',
      applyUrl: 'https://e2logy.zohorecruit.com/jobs/Careers/424443000011051040/Java-SpringBoot-Developer-ASE?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('E2logy Software Solutions run uses the official careers page plus embedded Zoho API', async () => {
  const e2logy = await loadE2logyModule()
  const urls = []
  const jobs = await e2logy.createE2logySoftwareSolutionsScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async () => careersHtml,
    fetchJson: async (url) => {
      urls.push(url)
      return jobsPayload
    },
  })

  assert.deepEqual(urls, [
    'https://e2logy.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'e2logysoftwaresolutions')
})

const currentCareersHtml = readFileSync(new URL('./fixtures/current-careers.html', import.meta.url), 'utf8')

test('E2logy verifies the redesigned first-party empty careers inventory without querying the detached Zoho feed', async () => {
  const { run } = await loadE2logyModule()
  const jobs = await run({
    fetchText: async () => currentCareersHtml,
    fetchJson: async () => assert.fail('The redesigned careers page no longer links to this Zoho feed'),
  })
  assert.deepEqual(jobs, [])
})

for (const [name, html] of [
  ['careers branding changes', currentCareersHtml.replace('<title>Careers at E2logy | Join Our AI and Software Team</title>', '<title>Other Employer</title>')],
  ['explicit all-roles-filled evidence disappears', currentCareersHtml.replaceAll('All our roles are filled at the moment.', 'We are expanding our team.')],
  ['a public job appears', currentCareersHtml.replace('No current openings</h3>', 'Full Stack Developer</h3>')],
  ['a public application link appears beside the empty state', currentCareersHtml.replace('Jobs open right now</h2>', 'Jobs open right now</h2><a href="/careers/full-stack-developer">Apply now</a>')],
  ['resume handoff changes', currentCareersHtml.replaceAll('mailto:careers@e2logy.com', 'mailto:careers@other.example')],
]) {
  test('E2logy fails closed on the redesigned careers page when ' + name, async () => {
    const { run } = await loadE2logyModule()
    await assert.rejects(run({ fetchText: async () => html }), /verified first-party/i)
  })
}

test('E2logy propagates HTTP 503 even when the error body resembles the verified empty careers page', async (t) => {
  const { run } = await loadE2logyModule()
  t.mock.method(globalThis, 'fetch', async () => new Response(currentCareersHtml, { status: 503 }))
  await assert.rejects(run(), /HTTP 503/i)
})
