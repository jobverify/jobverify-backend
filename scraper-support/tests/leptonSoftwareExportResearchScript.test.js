import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
  <html>
    <head><title>Careers at Lepton Software, Build Geospatial Intelligence | Lepton Software</title></head>
    <body>
      <p>For job-related queries email us at hr@leptonmaps.com</p>
      <script>fetch('https://leptonsoftware.keka.com/careers/api/jobs/default/active')</script>
    </body>
  </html>
`

const jobsPayload = [
  {
    id: 64107,
    title: "EXECUTIVE ASSISTANT - FOUNDER'S OFFICE",
    description: '<p>Support leadership.</p>',
    departmentName: 'ADMIN.',
    jobLocations: [{ city: 'Gurgaon', state: 'HR', countryCode: 'IN', countryName: 'India' }],
    jobType: 2,
    jobNumber: 'LEP-64107',
    publishedOn: '2026-03-27T00:00:00Z',
    skillNames: ['Calendar Management'],
    experience: '1 - 2 YEARS',
  },
]

test('Lepton Software Export & Research recognizes the verified careers page and maps the public Keka jobs payload', async () => {
  const lepton = await import('../../scraper/leptonsoftwareexportresearch/script.js')

  assert.equal(lepton.hasOfficialLeptonCareersSignals(officialCareersHtml), true)
  assert.deepEqual(lepton.extractJobs(jobsPayload), [
    {
      title: "EXECUTIVE ASSISTANT - FOUNDER'S OFFICE",
      company: 'Lepton Software Export & Research',
      department: 'ADMIN.',
      location: 'Gurgaon, HR, India',
      city: 'Gurgaon',
      country: 'India',
      jobId: '64107',
      requisitionId: 'LEP-64107',
      sourceUrl: 'https://leptonsoftware.keka.com/careers/jobdetails/64107',
      applyUrl: 'https://leptonsoftware.keka.com/careers/jobdetails/64107',
      employmentType: 'Full Time',
      experienceRequired: '1 - 2 YEARS',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Calendar Management'],
      postingDate: '2026-03-27',
      closingDate: null,
      jobDescription: 'Support leadership.',
    },
  ])
})

test('Lepton Software Export & Research scraper returns public India Keka jobs', async () => {
  const lepton = await import('../../scraper/leptonsoftwareexportresearch/script.js')

  const jobs = await lepton.createLeptonSoftwareExportResearchScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async () => officialCareersHtml,
    fetchJson: async () => jobsPayload,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'leptonsoftwareexportresearch')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
