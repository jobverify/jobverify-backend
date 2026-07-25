import assert from 'node:assert/strict'
import test from 'node:test'

const loadFoodhubModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <html>
    <head>
      <title>Foodhub | Global Ordering Technology</title>
      <meta property="og:url" content="https://global.foodhub.com/">
      <meta property="og:site_name" content="Foodhub">
    </head>
    <body>
      <a href="https://foodhubcareers.com/">Careers</a>
    </body>
  </html>
`

const careersPageHtml = `
  <html>
    <head>
      <title>Careers at Foodhub</title>
      <meta property="og:url" content="https://foodhubcareers.com/">
      <meta property="og:site_name" content="Foodhub Careers">
    </head>
    <body>
      <a href="https://jobs.foodhubcareers.com/jobs/Careers">APPLY FOR JOBS</a>
      <a href="https://jobs.foodhubcareers.com/jobs/Careers">View All Openings</a>
    </body>
  </html>
`

const portalHtml = `
  <html>
    <head>
      <title>Jobs at Foodhub</title>
      <meta property="og:url" content="https://jobs.foodhubcareers.com/jobs/Careers">
      <meta property="og:site_name" content="Foodhub">
    </head>
    <body>
      <input type="hidden" id="pageJson" value="{}">
      <input type="hidden" id="moduleMeta" value="[]">
      <input type="hidden" id="jobs" value="[]">
    </body>
  </html>
`

const salesConsultantUrl =
  'https://jobs.foodhubcareers.com/jobs/Careers/345994000211918254/Sales-Consultant?source=CareerSite'

const ctoUrl =
  'https://jobs.foodhubcareers.com/jobs/Careers/345994000212098417/Chief-Technology-Officer?source=CareerSite'

const detailPageHtml = `
  <html>
    <head>
      <title>Sales Consultant | Jobs at Foodhub</title>
    </head>
    <body>
      <h1>Sales Consultant</h1>
      <a href="${salesConsultantUrl}">Apply</a>
    </body>
  </html>
`

const apiPayload = {
  code: 'success',
  data: [
    {
      id: '345994000211918254',
      Posting_Title: 'Sales Consultant',
      Job_Opening_Name: 'Sales Consultant',
      Job_Type: 'Full time',
      Job_Description: 'Drive pipeline growth for Foodhub partners.',
      Department: 'Sales',
      City: 'Stoke-on-Trent',
      Country: 'United Kingdom',
      Publish: true,
      Job_Opening_Status: 'In-progress',
      Date_Opened: '2026-07-12',
      $url: salesConsultantUrl,
    },
    {
      id: '345994000212098417',
      Posting_Title: 'Chief Technology Officer',
      Job_Opening_Name: 'Chief Technology Officer',
      Job_Type: 'Full time',
      Job_Description: 'Lead Foodhub platform engineering globally.',
      Department: 'Technology',
      Job_Location: 'Remote',
      Remote_Job: true,
      Publish: true,
      Job_Opening_Status: 'Open',
      Date_Opened: '2026-07-12',
      $url: ctoUrl,
    },
    {
      id: '345994000299999998',
      Posting_Title: 'Hidden Role',
      Publish: false,
      Job_Opening_Status: 'Open',
      $url: 'https://jobs.foodhubcareers.com/jobs/Careers/345994000299999998/Hidden-Role?source=CareerSite',
    },
    {
      id: '345994000299999999',
      Posting_Title: 'Locked Role',
      Publish: true,
      Job_Opening_Status: 'Locked',
      $url: 'https://jobs.foodhubcareers.com/jobs/Careers/345994000299999999/Locked-Role?source=CareerSite',
    },
  ],
}

test('Foodhub constants stay pinned to the verified homepage, careers handoff, portal, and jobs API', async () => {
  const foodhub = await loadFoodhubModule()
  assert.ok(foodhub, 'Expected Foodhub scraper module at ./script.js')

  assert.equal(foodhub.HOMEPAGE_URL, 'https://global.foodhub.com/')
  assert.equal(foodhub.CAREERS_PAGE_URL, 'https://foodhubcareers.com/')
  assert.equal(foodhub.CAREERS_PORTAL_URL, 'https://jobs.foodhubcareers.com/jobs/Careers')
  assert.equal(
    foodhub.CAREERS_API_URL,
    'https://jobs.foodhubcareers.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  )
  assert.equal(foodhub.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(foodhub.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(foodhub.hasOfficialPortalSignal(portalHtml), true)
  assert.equal(
    foodhub.hasVerifiedJobDetailPage({
      status: 200,
      url: salesConsultantUrl,
      html: detailPageHtml,
    }, { title: 'Sales Consultant', sourceUrl: salesConsultantUrl }),
    true,
  )
})

test('extractPublishedJobs keeps only published, unlocked Foodhub jobs with stable detail URLs', async () => {
  const foodhub = await loadFoodhubModule()
  assert.ok(foodhub, 'Expected Foodhub scraper module at ./script.js')

  assert.deepEqual(foodhub.extractPublishedJobs(apiPayload), [
    {
      title: 'Sales Consultant',
      company: 'Foodhub',
      department: 'Sales',
      location: 'Stoke-on-Trent, United Kingdom',
      city: 'Stoke-on-Trent',
      state: null,
      country: 'United Kingdom',
      jobId: '345994000211918254',
      requisitionId: '345994000211918254',
      sourceUrl: salesConsultantUrl,
      applyUrl: salesConsultantUrl,
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-12',
      closingDate: null,
      jobDescription: 'Drive pipeline growth for Foodhub partners.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Chief Technology Officer',
      company: 'Foodhub',
      department: 'Technology',
      location: 'Remote',
      city: null,
      state: null,
      country: null,
      jobId: '345994000212098417',
      requisitionId: '345994000212098417',
      sourceUrl: ctoUrl,
      applyUrl: ctoUrl,
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-12',
      closingDate: null,
      jobDescription: 'Lead Foodhub platform engineering globally.',
      remoteStatus: 'Remote',
    },
  ])
})

test('run validates the Foodhub handoff chain and first detail page before decorating jobs', async () => {
  const foodhub = await loadFoodhubModule()
  assert.ok(foodhub, 'Expected Foodhub scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await foodhub.createFoodhubScraper({ maxJobs: 1 }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === foodhub.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === foodhub.CAREERS_PAGE_URL) return { status: 200, url, html: careersPageHtml }
      if (url === foodhub.CAREERS_PORTAL_URL) return { status: 200, url, html: portalHtml }
      if (url === salesConsultantUrl) return { status: 200, url, html: detailPageHtml }

      assert.fail(`Unexpected HTML request: ${url}`)
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, foodhub.CAREERS_API_URL)
      return apiPayload
    },
    now: () => '2026-07-12T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    foodhub.HOMEPAGE_URL,
    foodhub.CAREERS_PAGE_URL,
    foodhub.CAREERS_PORTAL_URL,
    foodhub.CAREERS_API_URL,
    salesConsultantUrl,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'foodhub')
  assert.equal(jobs[0].link, salesConsultantUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-12T00:00:00.000Z')
})

test('run fails closed when the Foodhub portal or API contract changes', async () => {
  const foodhub = await loadFoodhubModule()
  assert.ok(foodhub, 'Expected Foodhub scraper module at ./script.js')

  await assert.rejects(
    foodhub.createFoodhubScraper().run({
      fetchPage: async (url) => {
        if (url === foodhub.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === foodhub.CAREERS_PAGE_URL) return { status: 200, url, html: careersPageHtml }
        return { status: 200, url, html: '<html><body>Unexpected page</body></html>' }
      },
      fetchJson: async () => apiPayload,
    }),
    /official Foodhub careers portal/i,
  )

  await assert.rejects(
    foodhub.createFoodhubScraper().run({
      fetchPage: async (url) => {
        if (url === foodhub.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === foodhub.CAREERS_PAGE_URL) return { status: 200, url, html: careersPageHtml }
        if (url === foodhub.CAREERS_PORTAL_URL) return { status: 200, url, html: portalHtml }
        return { status: 200, url, html: detailPageHtml }
      },
      fetchJson: async () => ({ code: 'error', data: null }),
    }),
    /public jobs api no longer returns the verified success payload/i,
  )
})
