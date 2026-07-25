import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Instasafe Careers | Instasafe Jobs</title>
    <link rel="canonical" href="https://instasafe.com/careers/" />
  </head>
  <body>
    <h1>Grow with InstaSafe</h1>
    <h2>Our Openings</h2>
    <div class="embed_jobs_head embed_jobs_with_style_3">
      <div id="rec_job_listing_div"></div>
    </div>
  </body>
</html>
`

const portalHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at Instasafe Technologies Pvt Ltd</title>
    <meta property="og:url" content="https://instasafe.zohorecruit.com/jobs/Careers">
  </head>
  <body>
    <input type="hidden" id="pageJson" value="{}">
    <input type="hidden" id="moduleMeta" value="[]">
    <input type="hidden" id="jobs" value="[]">
  </body>
</html>
`

const apiPayload = {
  code: 'success',
  data: [
    {
      Posting_Title: 'Backend Developer - Golang',
      Job_Opening_Name: 'Backend Developer - Golang',
      City: 'Bangalore North',
      State: 'Karnataka',
      Country: 'India',
      Job_Type: 'Full time',
      Work_Experience: '3-6 years',
      Job_Description: 'Build secure backend systems for cybersecurity products.',
      id: '435765000016075043',
      $url: 'https://instasafe.zohorecruit.com/jobs/Careers/435765000016075043/Backend-Developer---Golang?source=CareerSite',
      Date_Opened: '10/03/2025',
      Remote_Job: false,
    },
    {
      Posting_Title: 'Tech Support',
      Job_Opening_Name: 'Tech Support',
      City: 'Mumbai',
      State: 'Maharashtra',
      Country: 'India',
      Job_Type: 'Full time',
      Work_Experience: '1-3 years',
      Job_Description: 'Provide first-line technical support for Zero Trust deployments.',
      id: '435765000016781001',
      $url: 'https://instasafe.zohorecruit.com/jobs/Careers/435765000016781001/Tech-Support?source=CareerSite',
      Date_Opened: '10/15/2025',
      Remote_Job: true,
    },
    {
      Posting_Title: 'Regional Sales Lead',
      Job_Opening_Name: 'Regional Sales Lead',
      City: 'Dubai',
      State: null,
      Country: 'United Arab Emirates',
      Job_Type: 'Full time',
      Job_Description: 'Ignore this non-India role.',
      id: '435765000099999999',
      $url: 'https://instasafe.zohorecruit.com/jobs/Careers/435765000099999999/Regional-Sales-Lead?source=CareerSite',
      Date_Opened: '10/10/2025',
      Remote_Job: false,
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../instasafe/script.js')
  } catch {
    assert.fail('Expected InstaSafe scraper module at ../instasafe/script.js')
  }
}

test('InstaSafe constants stay pinned to the verified careers page and public Zoho Recruit surfaces', async () => {
  const instasafe = await loadModule()

  assert.equal(instasafe.SOURCE, 'instasafe')
  assert.equal(instasafe.COMPANY, 'InstaSafe')
  assert.equal(instasafe.OFFICIAL_BRAND_NAME, 'Instasafe Technologies Pvt Ltd')
  assert.equal(instasafe.VERIFIED_ON, '2026-07-16')
  assert.equal(instasafe.HOMEPAGE_URL, 'https://instasafe.com/')
  assert.equal(instasafe.CAREERS_PAGE_URL, 'https://instasafe.com/careers/')
  assert.equal(instasafe.CAREERS_PORTAL_URL, 'https://instasafe.zohorecruit.com/jobs/Careers/')
  assert.equal(
    instasafe.CAREERS_API_URL,
    'https://instasafe.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.match(instasafe.VERIFIED_SURFACE_SUMMARY, /public Zoho Recruit portal/i)
  assert.equal(instasafe.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(instasafe.hasOfficialPortalSignal(portalHtml), true)
})

test('extractIndiaJobs maps InstaSafe public Zoho Recruit records and excludes non-India roles', async () => {
  const instasafe = await loadModule()
  const jobs = instasafe.extractIndiaJobs(apiPayload)

  assert.deepEqual(jobs, [
    {
      title: 'Backend Developer - Golang',
      company: 'InstaSafe',
      department: null,
      location: 'Bangalore North, Karnataka, India',
      city: 'Bangalore North',
      state: 'Karnataka',
      country: 'India',
      jobId: '435765000016075043',
      requisitionId: '435765000016075043',
      sourceUrl: 'https://instasafe.zohorecruit.com/jobs/Careers/435765000016075043/Backend-Developer---Golang?source=CareerSite',
      applyUrl: 'https://instasafe.zohorecruit.com/jobs/Careers/435765000016075043/Backend-Developer---Golang?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: '3-6 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '10/03/2025',
      closingDate: null,
      jobDescription: 'Build secure backend systems for cybersecurity products.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Tech Support',
      company: 'InstaSafe',
      department: null,
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      jobId: '435765000016781001',
      requisitionId: '435765000016781001',
      sourceUrl: 'https://instasafe.zohorecruit.com/jobs/Careers/435765000016781001/Tech-Support?source=CareerSite',
      applyUrl: 'https://instasafe.zohorecruit.com/jobs/Careers/435765000016781001/Tech-Support?source=CareerSite',
      employmentType: 'Full-time',
      experienceRequired: '1-3 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '10/15/2025',
      closingDate: null,
      jobDescription: 'Provide first-line technical support for Zero Trust deployments.',
      remoteStatus: 'Remote',
    },
  ])
})

test('run validates the verified InstaSafe surface before fetching and decorating India jobs', async () => {
  const instasafe = await loadModule()
  const requestedUrls = []

  const jobs = await instasafe.createInstaSafeScraper({
    maxJobs: 1,
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === instasafe.CAREERS_PAGE_URL) return careersPageHtml
      if (url === instasafe.CAREERS_PORTAL_URL) return portalHtml

      assert.fail(`Unexpected InstaSafe HTML request: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)

      if (url === instasafe.CAREERS_API_URL) return apiPayload

      assert.fail(`Unexpected InstaSafe JSON request: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    instasafe.CAREERS_PAGE_URL,
    instasafe.CAREERS_PORTAL_URL,
    instasafe.CAREERS_API_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'instasafe')
  assert.equal(
    jobs[0].link,
    'https://instasafe.zohorecruit.com/jobs/Careers/435765000016075043/Backend-Developer---Golang?source=CareerSite',
  )
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('run fails closed when the verified InstaSafe surface markers drift', async () => {
  const instasafe = await loadModule()

  await assert.rejects(
    instasafe.createInstaSafeScraper().run({
      fetchText: async (url) => {
        if (url === instasafe.CAREERS_PAGE_URL) {
          return '<html><body>Broken careers page</body></html>'
        }

        return portalHtml
      },
      fetchJson: async () => apiPayload,
    }),
    /official InstaSafe careers page/i,
  )

  await assert.rejects(
    instasafe.createInstaSafeScraper().run({
      fetchText: async (url) => {
        if (url === instasafe.CAREERS_PAGE_URL) return careersPageHtml
        return '<html><body>Broken portal</body></html>'
      },
      fetchJson: async () => apiPayload,
    }),
    /official InstaSafe careers portal/i,
  )
})
