import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Tecnics</title>
  </head>
  <body>
    <div class="pp-tab-title">APAC</div>
    <section class="job-card">
      <h2 class="heading-title"><span class="title-text pp-primary-title">Sr. SAP ABAP Developer</span></h2>
      <h5 class="heading-title"><span class="title-text pp-primary-title">Location: Hyderabad</span></h5>
      <p><strong>Send resume to:</strong> <a href="mailto:careers@tecnics.com">careers@tecnics.com</a></p>
    </section>
    <section class="job-card">
      <h2 class="heading-title"><span class="title-text pp-primary-title">Senior DevOps Engineer</span></h2>
      <h5 class="heading-title"><span class="title-text pp-primary-title">Location: Hyderabad</span></h5>
      <p><strong>Send resume to:</strong> <a href="mailto:careers@tecnics.com">careers@tecnics.com</a></p>
    </section>
    <section class="job-card">
      <h2 class="heading-title"><span class="title-text pp-primary-title">Sr Software Sales Resource</span></h2>
      <h5 class="heading-title"><span class="title-text pp-primary-title">Location: Hyderabad</span></h5>
      <p><strong>Send resume to:</strong> <a href="mailto:careers@tecnics.com">careers@tecnics.com</a></p>
    </section>
    <section class="job-card">
      <h2 class="heading-title"><span class="title-text pp-primary-title">Business Systems Analyst</span></h2>
      <h5 class="heading-title"><span class="title-text pp-primary-title">Location: Houston</span></h5>
      <p><strong>Send resume to:</strong> <a href="mailto:praveen_taduri@tecnics.com">praveen_taduri@tecnics.com</a></p>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../tecnicsintegrationtechnologies/script.js')
  } catch {
    assert.fail('Expected Tecnics Integration Technologies scraper module at ../tecnicsintegrationtechnologies/script.js')
  }
}

test('Tecnics Integration Technologies helpers stay pinned to the verified APAC roles from Friday, July 17, 2026', async () => {
  const tecnics = await loadModule()

  assert.equal(tecnics.SOURCE, 'tecnicsintegrationtechnologies')
  assert.equal(tecnics.COMPANY, 'Tecnics Integration Technologies')
  assert.equal(tecnics.CAREERS_URL, 'https://tecnics.com/careers/')
  assert.equal(tecnics.APPLY_URL, 'mailto:careers@tecnics.com')
  assert.equal(tecnics.VERIFIED_ON, '2026-07-17')
  assert.equal(tecnics.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.equal(tecnics.hasOfficialCareersSignal('<html><body><h1>Careers</h1></body></html>'), false)
  assert.deepEqual(tecnics.extractJobs(verifiedCareersHtml), [
    {
      title: 'Sr. SAP ABAP Developer',
      company: 'Tecnics Integration Technologies',
      department: null,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'sr-sap-abap-developer',
      requisitionId: 'sr-sap-abap-developer',
      sourceUrl: 'https://tecnics.com/careers/',
      applyUrl: 'mailto:careers@tecnics.com',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Senior DevOps Engineer',
      company: 'Tecnics Integration Technologies',
      department: null,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'senior-devops-engineer',
      requisitionId: 'senior-devops-engineer',
      sourceUrl: 'https://tecnics.com/careers/',
      applyUrl: 'mailto:careers@tecnics.com',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
    {
      title: 'Sr Software Sales Resource',
      company: 'Tecnics Integration Technologies',
      department: null,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'sr-software-sales-resource',
      requisitionId: 'sr-software-sales-resource',
      sourceUrl: 'https://tecnics.com/careers/',
      applyUrl: 'mailto:careers@tecnics.com',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('Tecnics Integration Technologies run validates the verified careers page before decorating extracted jobs', async () => {
  const tecnics = await loadModule()
  const requestedUrls = []

  const jobs = await tecnics.createTecnicsIntegrationTechnologiesScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === tecnics.CAREERS_URL) return verifiedCareersHtml
      throw new Error(`Unexpected Tecnics URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [tecnics.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'tecnicsintegrationtechnologies')
  assert.equal(jobs[0].link, 'mailto:careers@tecnics.com')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Tecnics Integration Technologies run fails closed when the verified careers surface drifts', async () => {
  const tecnics = await loadModule()

  await assert.rejects(
    tecnics.createTecnicsIntegrationTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified tecnics integration technologies careers surface/i,
  )
})
