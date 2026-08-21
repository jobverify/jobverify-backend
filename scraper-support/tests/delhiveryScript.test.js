import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-14T00:00:00.000Z'

const officialCareersShellHtml = `
  <html>
    <head>
      <meta property="og:image" content="https://www.delhivery.com/banner/careersV2.webp" />
      <title>Build Your Career with Delhivery – Join India's Leading Logistics Innovator</title>
    </head>
    <body>
      <div id="__nuxt">
        <style>#nuxt-loading{visibility:hidden;}</style>
        Loading...
      </div>
    </body>
  </html>
`

const officialCareersShellSurface = {
  url: 'https://www.delhivery.com/careers',
  title: "Build Your Career with Delhivery – Join India's Leading Logistics Innovator",
  text: "Build Your Career with Delhivery – Join India's Leading Logistics Innovator Loading...",
  html: officialCareersShellHtml,
  links: [],
}

const minimalPublicDarwinboxHomeSurface = {
  url: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home',
  title: 'Delhivery Limited',
  text: 'Delhivery Limited -',
  html: '<html><head><title>Delhivery Limited</title></head><body>Delhivery Limited -</body></html>',
  links: [],
}

const minimalPublicDarwinboxAllJobsSurface = {
  url: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  title: 'Delhivery Limited',
  text: 'Delhivery Limited -',
  html: '<html><head><title>Delhivery Limited</title></head><body>Delhivery Limited -</body></html>',
  links: [],
}

const listingPayload = {
  status: 'success',
  job_counts: 4,
  data: [
    {
      id: 'a694e16aa0cbf5',
      title: 'Senior Manager',
      internal_job_code: 'Job41604',
      department_name: 'Corporate Finance (DEP_1049)',
      locations: 'Multiple Locations',
      country: 'India',
      officelocations_without_area: [
        'Hoskote, Karnataka, India',
        'Gurgaon, Haryana, India',
        'Bilaspur, Haryana, India',
        'Mumbai, Maharashtra, India',
      ],
      tool_tip_locations: [
        'Bangalore_Hoskote_GW (Karnataka), Hoskote, Karnataka, India',
        'GGN_HQ05 # (Haryana), Gurgaon, Haryana, India',
        'Gurgaon_Tauru_GW (Haryana), Bilaspur, Haryana, India',
        'Mumbai_HQ_Office (Maharashtra), Mumbai, Maharashtra, India',
      ],
      emp_type_name: 'Permanent',
      experience: '',
      posted_on: '13-Jul-2026',
      jd: '',
    },
    {
      id: 'a6a3b6601778e7',
      title: 'Senior Associate',
      internal_job_code: 'Job40595',
      department_name: 'Finance (DEP_17)',
      locations: 'GGN_HQ05 # (Haryana), Gurgaon, Haryana\r, India',
      country: 'India',
      tool_tip_locations: [
        'GGN_HQ05 # (Haryana), Gurgaon, Haryana, India',
      ],
      emp_type_name: 'Permanent',
      experience: '2 - 4 Years',
      posted_on: '24-Jun-2026',
      jd: '<p>Own finance controls for the headquarters operations.</p>',
    },
    {
      id: 'a623ae2ca5bc0e',
      title: 'Manager',
      internal_job_code: 'Job27304',
      department_name: 'Business Partner Development (DEP_114)',
      locations: '',
      country: '',
      officelocation_show_arr_list: [
        'Ahmedabad_AslaliRoad_D ',
        ' Ahmedabad, Gujarat, India ',
        'Bhiwandi_BorivaliSonale_L ',
        ' Greater Thane, Maharashtra, India ',
        'Noida_Sector84_L ',
        ' Noida, Uttar Pradesh, India ',
      ],
      emp_type_name: 'Permanent',
      experience: '',
      posted_on: '27-Apr-2023',
      jd: '&lt;p&gt;Manage partner development across multiple stations.&lt;/p&gt;',
    },
    {
      id: 'delhivery-us-001',
      title: 'US Operations Manager',
      internal_job_code: 'Job-US-001',
      department_name: 'Operations',
      locations: 'Austin, Texas, United States',
      country: 'United States',
      emp_type_name: 'Permanent',
      experience: '5 - 7 Years',
      posted_on: '12-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadDelhiveryModule = async () => {
  try {
    return await import('../../scraper/delhivery/script.js')
  } catch {
    assert.fail('Expected Delhivery scraper module at ../../scraper/delhivery/script.js')
  }
}

test('Delhivery scraper keeps the verified August 14 careers app shell and Darwinbox routes explicit', async () => {
  const delhivery = await loadDelhiveryModule()

  assert.equal(delhivery.COMPANY_NAME, 'Delhivery')
  assert.equal(delhivery.SOURCE, 'delhivery')
  assert.equal(delhivery.OFFICIAL_BRAND_NAME, 'Delhivery Limited')
  assert.equal(delhivery.VERIFIED_ON, '2026-08-14')
  assert.equal(delhivery.HOMEPAGE_URL, 'https://www.delhivery.com/')
  assert.equal(delhivery.OFFICIAL_CAREERS_URL, 'https://www.delhivery.com/careers')
  assert.equal(
    delhivery.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://delhivery.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(delhivery.DARWINBOX_JOBS_URL, 'https://delhivery.darwinbox.in/jobs')
  assert.equal(
    delhivery.PUBLIC_PORTAL_HOME_URL,
    'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home',
  )
  assert.equal(
    delhivery.PUBLIC_ALL_JOBS_URL,
    'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    delhivery.LISTING_API_URL,
    'https://delhivery.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(
    delhivery.buildJobDetailUrl('dbx-job-1'),
    'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/jobDetails/dbx-job-1',
  )
  assert.equal(delhivery.hasOfficialDelhiveryCareersSignals(officialCareersShellSurface), true)
  assert.equal(delhivery.hasPublicDarwinboxHomeSignal(minimalPublicDarwinboxHomeSurface), true)
  assert.equal(delhivery.hasPublicDarwinboxAllJobsSignal(minimalPublicDarwinboxAllJobsSurface), true)
  assert.equal(
    delhivery.hasOfficialDelhiveryCareersSignals({
      ...officialCareersShellSurface,
      html: officialCareersShellHtml.replace('careersV2.webp', 'about-us.webp'),
    }),
    false,
  )
  assert.deepEqual(delhivery.transformDelhiveryJob(listingPayload.data[0]), {
    title: 'Senior Manager',
    company: 'Delhivery',
    department: 'Corporate Finance (DEP_1049)',
    location: 'Hoskote, Karnataka, India | Gurgaon, Haryana, India | Bilaspur, Haryana, India | Mumbai, Maharashtra, India',
    city: 'Hoskote',
    jobId: 'a694e16aa0cbf5',
    requisitionId: 'Job41604',
    sourceUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a694e16aa0cbf5',
    applyUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a694e16aa0cbf5',
    employmentType: 'Permanent',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '13-Jul-2026',
    closingDate: null,
    jobDescription: null,
  })
  assert.deepEqual(delhivery.transformDelhiveryJob(listingPayload.data[1]), {
    title: 'Senior Associate',
    company: 'Delhivery',
    department: 'Finance (DEP_17)',
    location: 'Gurgaon, Haryana, India',
    city: 'Gurgaon',
    jobId: 'a6a3b6601778e7',
    requisitionId: 'Job40595',
    sourceUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3b6601778e7',
    applyUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a3b6601778e7',
    employmentType: 'Permanent',
    experienceRequired: '2 - 4 Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '24-Jun-2026',
    closingDate: null,
    jobDescription: '<p>Own finance controls for the headquarters operations.</p>',
  })
  assert.deepEqual(delhivery.transformDelhiveryJob(listingPayload.data[2]), {
    title: 'Manager',
    company: 'Delhivery',
    department: 'Business Partner Development (DEP_114)',
    location: 'Ahmedabad, Gujarat, India | Greater Thane, Maharashtra, India | Noida, Uttar Pradesh, India',
    city: 'Ahmedabad',
    jobId: 'a623ae2ca5bc0e',
    requisitionId: 'Job27304',
    sourceUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a623ae2ca5bc0e',
    applyUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a623ae2ca5bc0e',
    employmentType: 'Permanent',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '27-Apr-2023',
    closingDate: null,
    jobDescription: '<p>Manage partner development across multiple stations.</p>',
  })
  assert.equal(delhivery.transformDelhiveryJob(listingPayload.data[3]), null)
})

test('Delhivery official surface capture parses the current careers app shell over native HTTP', async () => {
  const delhivery = await loadDelhiveryModule()
  const requestedUrls = []

  const surface = await delhivery.captureOfficialCareersSurface({
    fetchImpl: async (url) => {
      requestedUrls.push(url)
      return {
        ok: true,
        status: 200,
        url,
        headers: { get: () => 'text/html' },
        text: async () => officialCareersShellHtml,
      }
    },
  })

  assert.equal(delhivery.hasOfficialDelhiveryCareersSignals(surface), true)
  assert.deepEqual(requestedUrls, [delhivery.OFFICIAL_CAREERS_URL])
})

test('Delhivery run accepts the verified careers app shell, verifies the Darwinbox home shell, and returns normalized India jobs', async () => {
  const delhivery = await loadDelhiveryModule()
  const requestedPages = []

  const jobs = await delhivery.createDelhiveryScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    getOfficialCareersSurface: async () => officialCareersShellSurface,
    getListingContext: async () => ({
      surface: minimalPublicDarwinboxHomeSurface,
      fetchListingPage: async ({ page }) => {
        requestedPages.push(page)
        return listingPayload
      },
    }),
  })

  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.source, job.scrapedAt]),
    [
      [
        'Senior Manager',
        'Hoskote, Karnataka, India | Gurgaon, Haryana, India | Bilaspur, Haryana, India | Mumbai, Maharashtra, India',
        'delhivery',
        FIXED_SCRAPED_AT,
      ],
      ['Senior Associate', 'Gurgaon, Haryana, India', 'delhivery', FIXED_SCRAPED_AT],
      [
        'Manager',
        'Ahmedabad, Gujarat, India | Greater Thane, Maharashtra, India | Noida, Uttar Pradesh, India',
        'delhivery',
        FIXED_SCRAPED_AT,
      ],
    ],
  )
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('Delhivery returns a current-openings signal job when the public Darwinbox inventory API is blocked but both verified shells remain reachable', async () => {
  const delhivery = await loadDelhiveryModule()

  const jobs = await delhivery.createDelhiveryScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    getOfficialCareersSurface: async () => officialCareersShellSurface,
    getListingContext: async () => ({
      surface: minimalPublicDarwinboxHomeSurface,
      fetchListingPage: async () => {
        throw new Error(`HTTP 403 for ${delhivery.LISTING_API_URL}`)
      },
    }),
    getAllJobsSurface: async () => minimalPublicDarwinboxAllJobsSurface,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Current openings at Delhivery',
      company: 'Delhivery',
      location: 'India',
      city: null,
      country: 'India',
      link: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
      applyUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
      sourceUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
      source: 'delhivery',
      jobId: 'delhivery-current-openings',
      requisitionId: 'delhivery-current-openings',
      department: null,
      employmentType: null,
      experienceRequired: null,
      jobDescription: 'The official Delhivery careers page and public Darwinbox shell remained reachable, but the public Darwinbox inventory API returned HTTP 403 during this scrape. Review current openings directly on https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      remoteStatus: null,
      postingDate: null,
      closingDate: null,
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Delhivery scraper fails closed when the careers shell or Darwinbox home shell drifts', async () => {
  const delhivery = await loadDelhiveryModule()

  await assert.rejects(
    delhivery.createDelhiveryScraper().run({
      getOfficialCareersSurface: async () => ({
        ...officialCareersShellSurface,
        html: '<html><head><title>Placeholder</title></head><body>Loading...</body></html>',
      }),
      getListingContext: async () => ({
        surface: minimalPublicDarwinboxHomeSurface,
        fetchListingPage: async () => listingPayload,
      }),
    }),
    /official careers page/i,
  )

  await assert.rejects(
    delhivery.createDelhiveryScraper().run({
      getOfficialCareersSurface: async () => officialCareersShellSurface,
      getListingContext: async () => ({
        surface: {
          ...minimalPublicDarwinboxHomeSurface,
          text: 'Broken shell',
        },
        fetchListingPage: async () => listingPayload,
      }),
    }),
    /public darwinbox home surface/i,
  )
})
