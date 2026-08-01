import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - BUDDI.AI</title>
  </head>
  <body>
    <h1>Careers</h1>
    <p>You're in good company</p>

    <section class="role">
      <h3>Healthcare</h3>
      <h2>Team Leader</h2>
      <p>Specializations: Surgery, ED, EM, Pathology, Radiology.</p>
      <p>Location: Chennai,India</p>
      <p>No. of openings: 1</p>
    </section>

    <section class="role">
      <h3>Healthcare</h3>
      <h2>Manager</h2>
      <p>Specializations: Radiology, Pathology, ED, EM, HCC</p>
      <p>Location: Chennai,India</p>
      <p>No. of openings: 1</p>
    </section>

    <section class="role">
      <h3>Healthcare</h3>
      <h2>Medical Coders</h2>
      <p>Specializations: Pathology, Radiology, Surgery, IVR, EM UAE, HCC</p>
      <p>Location: Chennai,India</p>
    </section>

    <section class="role">
      <h3>Engineering</h3>
      <h2>Principle Software Application Architect</h2>
      <p>San Francisco, California, United States of America</p>
      <a href="/roles/principle-software-application-architect">Learn more</a>
    </section>

    <p>Hello Automation, Goodbye Complexity.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/buddiai/script.js')
  } catch {
    assert.fail('Expected BUDDI.AI scraper module at ../../scraper/buddiai/script.js')
  }
}

test('BUDDI.AI helpers stay pinned to the verified first-party static careers page and India role filter', async () => {
  const buddi = await loadModule()

  assert.equal(buddi.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(buddi.extractJobs(careersHtml), [
    {
      title: 'Team Leader',
      company: 'BUDDI.AI',
      department: 'Healthcare',
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'team-leader',
      requisitionId: 'team-leader',
      sourceUrl: 'https://buddi.ai/careers.html#team-leader',
      applyUrl: 'https://buddi.ai/careers.html#team-leader',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Specializations: Surgery, ED, EM, Pathology, Radiology.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Manager',
      company: 'BUDDI.AI',
      department: 'Healthcare',
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'manager',
      requisitionId: 'manager',
      sourceUrl: 'https://buddi.ai/careers.html#manager',
      applyUrl: 'https://buddi.ai/careers.html#manager',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Specializations: Radiology, Pathology, ED, EM, HCC',
      remoteStatus: 'On-site',
    },
    {
      title: 'Medical Coders',
      company: 'BUDDI.AI',
      department: 'Healthcare',
      location: 'Chennai, India',
      city: 'Chennai',
      country: 'India',
      jobId: 'medical-coders',
      requisitionId: 'medical-coders',
      sourceUrl: 'https://buddi.ai/careers.html#medical-coders',
      applyUrl: 'https://buddi.ai/careers.html#medical-coders',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Specializations: Pathology, Radiology, Surgery, IVR, EM UAE, HCC',
      remoteStatus: 'On-site',
    },
  ])
})

test('BUDDI.AI run validates the verified careers page and emits only India roles', async () => {
  const buddi = await loadModule()
  const jobs = await buddi.createBuddiAiScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      assert.equal(url, buddi.CAREERS_URL)
      return careersHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'buddiai')
  assert.match(jobs[0].scrapedAt, /^2026-07-18T00:00:00\.000Z$/)
  assert.equal(jobs.some((job) => /San Francisco/i.test(job.location)), false)
})

test('BUDDI.AI fails closed when the verified careers surface drifts materially', async () => {
  const buddi = await loadModule()

  await assert.rejects(
    buddi.createBuddiAiScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified buddi\.ai careers surface/i,
  )
})
