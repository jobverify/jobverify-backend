import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../spsoftware/script.js')
  } catch {
    assert.fail('Expected SP Software scraper module at ../spsoftware/script.js')
  }
}

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>SPSoft</title>
  </head>
  <body>
    <app-root></app-root>
    <script src="runtime.js"></script>
    <script src="polyfills.js"></script>
    <script src="app-career-career-module.js"></script>
  </body>
</html>
`

const careersBundleText = `
careers@spsoftglobal.com
#001582-
Java Developer: 5-8 Yrs, Location: Hyderabad (WFO)
Rest APIs
API development & Application Deployment
#001585-
.NET Developer: 3-6 Yrs, Location: Hyderabad (WFO)
Web API
SQL Server
`

test('SP Software constants stay pinned to the verified first-party careers route and Angular bundle', async () => {
  const spSoftware = await loadModule()

  assert.equal(spSoftware.SOURCE, 'spsoftware')
  assert.equal(spSoftware.COMPANY, 'SP Software')
  assert.equal(spSoftware.CAREERS_URL, 'https://www.spsoftglobal.com/career')
  assert.equal(
    spSoftware.CAREERS_BUNDLE_URL,
    'https://www.spsoftglobal.com/app-career-career-module.js',
  )
  assert.equal(spSoftware.CAREERS_EMAIL, 'careers@spsoftglobal.com')
  assert.equal(spSoftware.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(spSoftware.hasVerifiedCareerBundleSignal(careersBundleText), true)
})

test('SP Software extracts India roles from the compiled careers bundle', async () => {
  const spSoftware = await loadModule()

  assert.deepEqual(spSoftware.extractIndiaJobs(careersBundleText), [
    {
      title: 'Java Developer',
      company: 'SP Software',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      state: null,
      country: 'India',
      jobId: '001582',
      requisitionId: '001582',
      sourceUrl: 'https://www.spsoftglobal.com/career',
      applyUrl: 'mailto:careers@spsoftglobal.com',
      employmentType: null,
      experienceRequired: '5-8 Yrs',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Rest APIs', 'API development & Application Deployment'],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Rest APIs API development & Application Deployment',
      remoteStatus: 'On-site',
    },
    {
      title: '.NET Developer',
      company: 'SP Software',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      state: null,
      country: 'India',
      jobId: '001585',
      requisitionId: '001585',
      sourceUrl: 'https://www.spsoftglobal.com/career',
      applyUrl: 'mailto:careers@spsoftglobal.com',
      employmentType: null,
      experienceRequired: '3-6 Yrs',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Web API', 'SQL Server'],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Web API SQL Server',
      remoteStatus: 'On-site',
    },
  ])
})

test('SP Software run validates the first-party careers shell and decorates bundle-derived India jobs', async () => {
  const spSoftware = await loadModule()
  const requestedUrls = []

  const jobs = await spSoftware.createSpSoftwareScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === spSoftware.CAREERS_URL) return careersPageHtml
      if (url === spSoftware.CAREERS_BUNDLE_URL) return careersBundleText
      throw new Error(`Unexpected text URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.spsoftglobal.com/career',
    'https://www.spsoftglobal.com/app-career-career-module.js',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'spsoftware')
  assert.equal(jobs[0].link, 'mailto:careers@spsoftglobal.com')
  assert.equal(jobs[0].scrapedAt, '2026-07-18T00:00:00.000Z')
})

test('SP Software fails closed when the verified bundle signal disappears', async () => {
  const spSoftware = await loadModule()

  await assert.rejects(
    spSoftware.createSpSoftwareScraper().run({
      fetchText: async (url) => {
        if (url === spSoftware.CAREERS_URL) return careersPageHtml
        return 'unexpected bundle content'
      },
    }),
    /verified SP Software careers bundle/i,
  )
})
