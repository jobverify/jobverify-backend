import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>ProvenTech</title>
  </head>
  <body>
    <section class="innerPage contact career">
      <h3>Careers at ProvenTech</h3>
      <p>If you’re considering ProvenTech or just want more information, simply fill out the form and we’ll be in touch.</p>
      <div class="address">
        <h3>SAP UI5/Fiori Consultant</h3>
        <div><p class="mb-0">Software Engineer<br> Full Time<br> Hyderabad.<br></p></div>
      </div>
      <div class="address mt-4">
        <h3>SAP ABAP Developer</h3>
        <div><p class="mb-0">Software Engineer<br> Full Time<br> Hyderabad.<br></p></div>
      </div>
      <div class="address mt-4">
        <h3>Documentum D2 Administrator</h3>
        <div><p class="mb-0">Software Engineer<br> Full Time<br> Hyderabad.<br></p></div>
      </div>
      <div class="address mt-4">
        <h3>SAP MDG (Master Data Governance) Functional Consultant</h3>
        <div><p class="mb-0">Software Engineer<br> Full Time<br> Hyderabad.<br></p></div>
      </div>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/proventech/script.js')
  } catch {
    assert.fail('Expected Proventech scraper module at ../../scraper/proventech/script.js')
  }
}

test('Proventech helpers stay pinned to the verified first-party careers cards from Friday, July 17, 2026', async () => {
  const proventech = await loadModule()

  assert.equal(proventech.SOURCE, 'proventech')
  assert.equal(proventech.COMPANY, 'Proventech')
  assert.equal(proventech.CAREERS_URL, 'https://new.proventech.in/index?temp=career')
  assert.equal(proventech.APPLY_URL, 'https://new.proventech.in/index?temp=career')
  assert.equal(proventech.VERIFIED_ON, '2026-07-17')
  assert.equal(proventech.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.equal(proventech.hasOfficialCareersSignal('<html><body><h1>Careers</h1></body></html>'), false)
  assert.deepEqual(proventech.extractJobs(verifiedCareersHtml), [
    {
      title: 'SAP UI5/Fiori Consultant',
      company: 'Proventech',
      department: 'Software Engineer',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'sap-ui5-fiori-consultant',
      requisitionId: 'sap-ui5-fiori-consultant',
      sourceUrl: 'https://new.proventech.in/index?temp=career',
      applyUrl: 'https://new.proventech.in/index?temp=career',
      employmentType: 'Full Time',
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
      title: 'SAP ABAP Developer',
      company: 'Proventech',
      department: 'Software Engineer',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'sap-abap-developer',
      requisitionId: 'sap-abap-developer',
      sourceUrl: 'https://new.proventech.in/index?temp=career',
      applyUrl: 'https://new.proventech.in/index?temp=career',
      employmentType: 'Full Time',
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
      title: 'Documentum D2 Administrator',
      company: 'Proventech',
      department: 'Software Engineer',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'documentum-d2-administrator',
      requisitionId: 'documentum-d2-administrator',
      sourceUrl: 'https://new.proventech.in/index?temp=career',
      applyUrl: 'https://new.proventech.in/index?temp=career',
      employmentType: 'Full Time',
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
      title: 'SAP MDG (Master Data Governance) Functional Consultant',
      company: 'Proventech',
      department: 'Software Engineer',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'sap-mdg-master-data-governance-functional-consultant',
      requisitionId: 'sap-mdg-master-data-governance-functional-consultant',
      sourceUrl: 'https://new.proventech.in/index?temp=career',
      applyUrl: 'https://new.proventech.in/index?temp=career',
      employmentType: 'Full Time',
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

test('Proventech run validates the verified careers page before decorating extracted jobs', async () => {
  const proventech = await loadModule()
  const requestedUrls = []

  const jobs = await proventech.createProventechScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === proventech.CAREERS_URL) return verifiedCareersHtml
      throw new Error(`Unexpected Proventech URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [proventech.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'proventech')
  assert.equal(jobs[0].link, 'https://new.proventech.in/index?temp=career')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})

test('Proventech run fails closed when the verified careers surface drifts', async () => {
  const proventech = await loadModule()

  await assert.rejects(
    proventech.createProventechScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified proventech careers surface/i,
  )
})
