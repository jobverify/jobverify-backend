import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-01T00:00:00.000Z'

const officialCareersSurface = {
  url: 'https://www.delhivery.com/careers',
  title: "Build Your Career with Delhivery – Join India's Leading Logistics Innovator",
  text: [
    'Build a career at Delhivery',
    'Join a dynamic team of over 74,000 employees shaping the future of logistics in India',
    'Jobs at Delhivery',
    'Delivery Partner Jobs',
    'Corporate Jobs',
    'Warehouse Jobs',
    'Delivery Jobs',
  ].join(' '),
  links: [
    { text: 'Jobs at Delhivery', href: 'https://delhivery.darwinbox.in/ms/candidate/careers' },
    { text: 'Corporate Jobs', href: 'https://delhivery.darwinbox.in/ms/candidate/careers' },
    { text: 'Delivery Partner Jobs', href: 'https://www.delhivery.com/partner/delivery-partner' },
    { text: 'Apply Now', href: 'https://www.delhivery.com/skills-development-program' },
    { text: 'Warehouse Jobs', href: 'https://www.delhivery.com/skills-development-program' },
    { text: 'Delivery Jobs', href: 'https://www.delhivery.com/partner/delivery-partner' },
  ],
}

const officialCareersSurfaceWithoutVisibleJobsLabel = {
  ...officialCareersSurface,
  text: [
    'Build a career at Delhivery',
    'Join a dynamic team of over 74,000 employees shaping the future of logistics in India',
    'Corporate Jobs',
    'Warehouse Jobs',
    'Delivery Jobs',
  ].join(' '),
}

const publicDarwinboxHomeSurface = {
  url: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home',
  title: 'Delhivery Limited',
  text: 'Thank you for choosing us for your next chapter! We Have 10 Open Jobs Search by role, department or location Powered by: darwinbox | Privacy Policy',
  links: [
    {
      text: 'We Have 10 Open Jobs',
      href: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
    },
  ],
}

const minimalPublicDarwinboxHomeSurface = {
  url: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home',
  title: 'Delhivery Limited',
  text: 'Delhivery Limited -',
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

test('Delhivery scraper keeps the verified first-party careers handoff and public Darwinbox routes explicit', async () => {
  const delhivery = await loadDelhiveryModule()

  assert.equal(delhivery.COMPANY_NAME, 'Delhivery')
  assert.equal(delhivery.SOURCE, 'delhivery')
  assert.equal(delhivery.OFFICIAL_BRAND_NAME, 'Delhivery Limited')
  assert.equal(delhivery.VERIFIED_ON, '2026-08-01')
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
  assert.equal(delhivery.hasOfficialDelhiveryCareersSignals(officialCareersSurface), true)
  assert.equal(
    delhivery.hasOfficialDelhiveryCareersSignals(officialCareersSurfaceWithoutVisibleJobsLabel),
    true,
  )
  assert.equal(delhivery.hasPublicDarwinboxHomeSignal(publicDarwinboxHomeSurface), true)
  assert.equal(delhivery.hasPublicDarwinboxHomeSignal(minimalPublicDarwinboxHomeSurface), true)
  assert.equal(
    delhivery.hasOfficialDelhiveryCareersSignals({
      ...officialCareersSurface,
      links: officialCareersSurface.links.map((link) =>
        link.text === 'Corporate Jobs'
          ? { ...link, href: 'https://example.com/jobs' }
          : link),
    }),
    false,
  )
  assert.equal(
    delhivery.hasPublicDarwinboxHomeSignal({
      ...publicDarwinboxHomeSurface,
      links: [{ text: 'We Have 10 Open Jobs', href: 'https://example.com/allJobs' }],
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

test('Delhivery official surface capture uses a full browser page so the live Nuxt careers content can hydrate', async () => {
  const delhivery = await loadDelhiveryModule()
  const calls = []
  const fakePage = {
    goto: async (url, options) => {
      calls.push(['goto', url, options?.waitUntil])
    },
    waitForFunction: async (...args) => {
      calls.push(['waitForFunction', args[2], args[3]])
    },
    title: async () => officialCareersSurface.title,
    evaluate: async () => officialCareersSurface.text,
    $$eval: async () => officialCareersSurface.links,
    url: () => officialCareersSurface.url,
  }
  const fakeBrowser = {
    newPage: async () => {
      calls.push(['newPage'])
      return fakePage
    },
    close: async () => {
      calls.push(['close'])
    },
  }

  const surface = await delhivery.captureOfficialCareersSurface({
    launchBrowserImpl: async () => fakeBrowser,
  })

  assert.deepEqual(surface, officialCareersSurface)
  assert.deepEqual(calls, [
    ['newPage'],
    ['goto', 'https://www.delhivery.com/careers', 'domcontentloaded'],
    ['waitForFunction', 'Jobs at Delhivery', 'i'],
    ['close'],
  ])
})

test('Delhivery run verifies the careers handoff, verifies the public Darwinbox home shell, and returns normalized India jobs', async () => {
  const delhivery = await loadDelhiveryModule()
  const requestedPages = []
  let closed = false

  const jobs = await delhivery.createDelhiveryScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    getOfficialCareersSurface: async () => officialCareersSurface,
    getBrowserListingContext: async () => ({
      surface: publicDarwinboxHomeSurface,
      fetchListingPage: async ({ page }) => {
        requestedPages.push(page)
        return listingPayload
      },
      close: async () => {
        closed = true
      },
    }),
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(closed, true)
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

test('Delhivery scraper fails closed when the first-party careers surface or public Darwinbox home shell drifts', async () => {
  const delhivery = await loadDelhiveryModule()

  await assert.rejects(
    delhivery.createDelhiveryScraper().run({
      getOfficialCareersSurface: async () => ({
        ...officialCareersSurface,
        links: officialCareersSurface.links.map((link) =>
          link.text === 'Jobs at Delhivery'
            ? { ...link, href: 'https://example.com/jobs' }
            : link),
      }),
      getBrowserListingContext: async () => ({
        surface: publicDarwinboxHomeSurface,
        fetchListingPage: async () => listingPayload,
        close: async () => {},
      }),
    }),
    /official careers page/i,
  )

  await assert.rejects(
    delhivery.createDelhiveryScraper().run({
      getOfficialCareersSurface: async () => officialCareersSurface,
      getBrowserListingContext: async () => ({
        surface: {
          ...publicDarwinboxHomeSurface,
          links: [{ text: 'Broken', href: 'https://example.com/jobs' }],
        },
        fetchListingPage: async () => listingPayload,
        close: async () => {},
      }),
    }),
    /public darwinbox home surface/i,
  )
})
