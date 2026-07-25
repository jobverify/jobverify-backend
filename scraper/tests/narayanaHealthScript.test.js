import assert from 'node:assert/strict'
import test from 'node:test'

const loadNarayanaHealthModule = async () => {
  try {
    return await import('../narayanahealth/script.js')
  } catch {
    assert.fail('Expected Narayana Health scraper module at ../narayanahealth/script.js')
  }
}

const siteMapHtml = `
<html>
  <body>
    <h1>Sitemap</h1>
    <ul>
      <li><a href="https://www.narayanahealth.org/">Home</a></li>
      <li><a href="https://jobs.narayanahealth.org/?locale=en_GB">Careers</a></li>
    </ul>
  </body>
</html>
`

const careersLandingHtml = `
<html>
  <body>
    <h2>About Narayana health</h2>
    <p>Filter jobs as per your area of expertise by clicking on the options below.</p>
    <a href="https://jobs.narayanahealth.org/NH-India/go/Medical-Professionals/681244/">Medical Professionals</a>
    <a href="https://jobs.narayanahealth.org/NH-India/go/Paramedical-%26-Admin-Professionals/681344/">Paramedical &amp; Admin Professionals</a>
    <a href="https://jobs.narayanahealth.org/viewalljobs/">View All Jobs</a>
  </body>
</html>
`

const viewAllJobsHtml = `
<html>
  <body>
    <h1>Search by Category</h1>
    <a href="https://jobs.narayanahealth.org/NH-US/go/Medical-Professionals-US/781244/">Medical Professionals US</a>
    <a href="https://jobs.narayanahealth.org/NH-India/go/Medical-Professionals/681244/">Medical Professionals</a>
    <a href="https://jobs.narayanahealth.org/NH-India/go/Paramedical-%26-Admin-Professionals/681344/">Paramedical &amp; Admin Professionals</a>
    <a href="https://jobs.narayanahealth.org/NH-India/go/Experienced-Jobs/681644/">Experienced Jobs</a>
    <div>SAP as service provider</div>
  </body>
</html>
`

const medicalCategoryPage1Html = `
<html>
  <body>
    <span class="paginationLabel">Results 1 – 2 of 3 Page 1 of 2</span>
    <tr class="data-row">
      <td class="colTitle" headers="hdrTitle">
        <a href="/NH-India/job/Bangalore-Senior-Registrar-KA-560099/58111144/" class="jobTitle-link">Senior Registrar</a>
      </td>
      <td class="colLocation" headers="hdrLocation">
        <span class="jobLocation">Bangalore, KA, IN, 560099</span>
      </td>
      <td class="colDate" headers="hdrDate">
        <span class="jobDate">16 Jul 2026</span>
      </td>
      <td class="colFacility" headers="hdrFacility">
        <span class="jobFacility">14890</span>
      </td>
    </tr>
    <tr class="data-row">
      <td class="colTitle" headers="hdrTitle">
        <a href="/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/" class="jobTitle-link">Resident Doctor</a>
      </td>
      <td class="colLocation" headers="hdrLocation">
        <span class="jobLocation">Bangalore, KA, IN, 560099</span>
      </td>
      <td class="colDate" headers="hdrDate">
        <span class="jobDate">16 Jul 2026</span>
      </td>
      <td class="colFacility" headers="hdrFacility">
        <span class="jobFacility">14891</span>
      </td>
    </tr>
  </body>
</html>
`

const medicalCategoryPage2Html = `
<html>
  <body>
    <span class="paginationLabel">Results 3 – 3 of 3 Page 2 of 2</span>
    <tr class="data-row">
      <td class="colTitle" headers="hdrTitle">
        <a href="/NH-India/job/Bangalore-Student-KA-560099/58133344/" class="jobTitle-link">Student</a>
      </td>
      <td class="colLocation" headers="hdrLocation">
        <span class="jobLocation">Bangalore, KA, IN, 560099</span>
      </td>
      <td class="colDate" headers="hdrDate">
        <span class="jobDate">16 Jul 2026</span>
      </td>
      <td class="colFacility" headers="hdrFacility">
        <span class="jobFacility">14892</span>
      </td>
    </tr>
  </body>
</html>
`

const adminCategoryHtml = `
<html>
  <body>
    <span class="paginationLabel">Results 1 – 1 of 1 Page 1 of 1</span>
    <tr class="data-row">
      <td class="colTitle" headers="hdrTitle">
        <a href="/NH-India/job/Jaipur-Senior-Executive-RJ-302033/58244444/" class="jobTitle-link">Senior Executive</a>
      </td>
      <td class="colLocation" headers="hdrLocation">
        <span class="jobLocation">Jaipur, RJ, IN, 302033</span>
      </td>
      <td class="colDate" headers="hdrDate">
        <span class="jobDate">16 Jul 2026</span>
      </td>
      <td class="colFacility" headers="hdrFacility">
        <span class="jobFacility">14912</span>
      </td>
    </tr>
  </body>
</html>
`

const experiencedCategoryEmptyHtml = `
<html>
  <body>
    <span class="paginationLabel">Results 0 – 0 of 0 Page 1 of 1</span>
    <p>There are currently no open positions matching this category or location.</p>
  </body>
</html>
`

const activeDetailHtml = `
<html>
  <head>
    <meta itemprop="datePosted" content="2026-07-16" />
    <meta itemprop="validThrough" content="2026-08-16" />
  </head>
  <body>
    <h1 itemprop="title">Senior Registrar</h1>
    <div>Requisition Id: 14890</div>
    <span itemprop="description">
      <span class="jobdescription">
        <p>Lead inpatient rounds and support critical care consultants.</p>
        <ul>
          <li>Critical care coordination</li>
          <li>Patient handoff discipline</li>
        </ul>
      </span>
    </span>
    <a class="btn btn-primary btn-large btn-lg apply dialogApplyBtn " href="/talentcommunity/apply/58111144/?locale=en_GB">Apply now</a>
  </body>
</html>
`

const filledDetailHtml = `
<html>
  <body>
    <h1>Resident Doctor</h1>
    <p>Sorry, this position has been filled.</p>
  </body>
</html>
`

const adminDetailHtml = `
<html>
  <head>
    <meta itemprop="datePosted" content="2026-07-16" />
  </head>
  <body>
    <h1 itemprop="title">Senior Executive</h1>
    <div>Requisition Id: 14912</div>
    <span itemprop="description">
      <span class="jobdescription">
        <p>Coordinate patient outreach and marketing activities.</p>
        <ul>
          <li>Program coordination</li>
        </ul>
      </span>
    </span>
  </body>
</html>
`

test('Narayana Health discovery helpers stay pinned to the verified sitemap and jobs board surfaces', async () => {
  const narayanaHealth = await loadNarayanaHealthModule()

  assert.equal(narayanaHealth.SOURCE, 'narayanahealth')
  assert.equal(narayanaHealth.COMPANY, 'Narayana Health')
  assert.equal(narayanaHealth.VERIFIED_ON, '2026-07-16')
  assert.equal(narayanaHealth.OFFICIAL_SITE_MAP_URL, 'https://www.narayanahealth.org/sitemap')
  assert.equal(narayanaHealth.OFFICIAL_CAREERS_URL, 'https://jobs.narayanahealth.org/?locale=en_GB')
  assert.equal(narayanaHealth.VIEW_ALL_JOBS_URL, 'https://jobs.narayanahealth.org/viewalljobs/')
  assert.equal(narayanaHealth.BASE_URL, 'https://jobs.narayanahealth.org')
  assert.equal(
    narayanaHealth.extractOfficialJobsBoardUrl(siteMapHtml),
    'https://jobs.narayanahealth.org/?locale=en_GB',
  )
  assert.equal(narayanaHealth.hasVerifiedSiteMapSignal(siteMapHtml), true)
  assert.equal(narayanaHealth.hasOfficialCareersBoardSignal(careersLandingHtml), true)
  assert.equal(narayanaHealth.hasViewAllJobsSignal(viewAllJobsHtml), true)
  assert.deepEqual(narayanaHealth.extractCategoryUrls(viewAllJobsHtml), [
    'https://jobs.narayanahealth.org/NH-India/go/Medical-Professionals/681244/',
    'https://jobs.narayanahealth.org/NH-India/go/Paramedical-%26-Admin-Professionals/681344/',
    'https://jobs.narayanahealth.org/NH-India/go/Experienced-Jobs/681644/',
  ])
  assert.equal(
    narayanaHealth.buildCategoryPageUrl(
      'https://jobs.narayanahealth.org/NH-India/go/Experienced-Jobs/681644/',
      20,
    ),
    'https://jobs.narayanahealth.org/NH-India/go/Experienced-Jobs/681644/20/',
  )
})

test('extractSearchResults parses Narayana Health HTML rows and requisition ids from NH-India category pages', async () => {
  const narayanaHealth = await loadNarayanaHealthModule()

  assert.deepEqual(narayanaHealth.extractResultsSummary(medicalCategoryPage1Html), {
    totalResults: 3,
    currentPage: 1,
    totalPages: 2,
    pageSize: 2,
  })

  assert.deepEqual(narayanaHealth.extractSearchResults(medicalCategoryPage1Html), [
    {
      title: 'Senior Registrar',
      department: null,
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      jobId: '58111144',
      requisitionId: '14890',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Senior-Registrar-KA-560099/58111144/',
      postingDate: '16 Jul 2026',
    },
    {
      title: 'Resident Doctor',
      department: null,
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      jobId: '58122244',
      requisitionId: '14891',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/',
      postingDate: '16 Jul 2026',
    },
  ])
})

test('extractJobDetail keeps Narayana Health detail enrichment conservative and falls back cleanly for filled roles', async () => {
  const narayanaHealth = await loadNarayanaHealthModule()

  assert.deepEqual(
    narayanaHealth.extractJobDetail(activeDetailHtml, {
      title: 'Senior Registrar',
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      jobId: '58111144',
      requisitionId: '14890',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Senior-Registrar-KA-560099/58111144/',
      postingDate: '16 Jul 2026',
    }),
    {
      title: 'Senior Registrar',
      department: null,
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      jobId: '58111144',
      requisitionId: '14890',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Senior-Registrar-KA-560099/58111144/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Critical care coordination', 'Patient handoff discipline'],
      postingDate: '2026-07-16',
      closingDate: '2026-08-16',
      jobDescription: 'Lead inpatient rounds and support critical care consultants. Critical care coordination Patient handoff discipline',
      applyUrl: 'https://jobs.narayanahealth.org/talentcommunity/apply/58111144/?locale=en_GB',
    },
  )

  assert.deepEqual(
    narayanaHealth.extractJobDetail(filledDetailHtml, {
      title: 'Resident Doctor',
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      jobId: '58122244',
      requisitionId: '14891',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/',
      postingDate: '16 Jul 2026',
    }),
    {
      title: 'Resident Doctor',
      department: null,
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      jobId: '58122244',
      requisitionId: '14891',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16 Jul 2026',
      closingDate: null,
      jobDescription: null,
      applyUrl: null,
    },
  )
})

test('run crawls Narayana Health NH-India categories and preserves filled-role fallbacks', async () => {
  const narayanaHealth = await loadNarayanaHealthModule()
  const requestedUrls = []

  const jobs = await narayanaHealth.createNarayanaHealthScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === narayanaHealth.OFFICIAL_SITE_MAP_URL) return siteMapHtml
      if (url === narayanaHealth.OFFICIAL_CAREERS_URL) return careersLandingHtml
      if (url === narayanaHealth.VIEW_ALL_JOBS_URL) return viewAllJobsHtml
      if (url === 'https://jobs.narayanahealth.org/NH-India/go/Medical-Professionals/681244/') return medicalCategoryPage1Html
      if (url === 'https://jobs.narayanahealth.org/NH-India/go/Medical-Professionals/681244/2/') return medicalCategoryPage2Html
      if (url === 'https://jobs.narayanahealth.org/NH-India/go/Paramedical-%26-Admin-Professionals/681344/') return adminCategoryHtml
      if (url === 'https://jobs.narayanahealth.org/NH-India/go/Experienced-Jobs/681644/') return experiencedCategoryEmptyHtml
      if (url === 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Senior-Registrar-KA-560099/58111144/') return activeDetailHtml
      if (url === 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/') return filledDetailHtml
      if (url === 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Student-KA-560099/58133344/') return filledDetailHtml
      if (url === 'https://jobs.narayanahealth.org/NH-India/job/Jaipur-Senior-Executive-RJ-302033/58244444/') return adminDetailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-16T12:30:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.narayanahealth.org/sitemap',
    'https://jobs.narayanahealth.org/?locale=en_GB',
    'https://jobs.narayanahealth.org/viewalljobs/',
    'https://jobs.narayanahealth.org/NH-India/go/Medical-Professionals/681244/',
    'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Senior-Registrar-KA-560099/58111144/',
    'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/',
    'https://jobs.narayanahealth.org/NH-India/go/Medical-Professionals/681244/2/',
    'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Student-KA-560099/58133344/',
    'https://jobs.narayanahealth.org/NH-India/go/Paramedical-%26-Admin-Professionals/681344/',
    'https://jobs.narayanahealth.org/NH-India/job/Jaipur-Senior-Executive-RJ-302033/58244444/',
    'https://jobs.narayanahealth.org/NH-India/go/Experienced-Jobs/681644/',
  ])

  assert.deepEqual(jobs, [
    {
      jobId: '58111144',
      requisitionId: '14890',
      title: 'Senior Registrar',
      company: 'Narayana Health',
      department: null,
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      link: 'https://jobs.narayanahealth.org/talentcommunity/apply/58111144/?locale=en_GB',
      applyUrl: 'https://jobs.narayanahealth.org/talentcommunity/apply/58111144/?locale=en_GB',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Senior-Registrar-KA-560099/58111144/',
      source: 'narayanahealth',
      employmentType: null,
      experienceRequired: null,
      jobDescription: 'Lead inpatient rounds and support critical care consultants. Critical care coordination Patient handoff discipline',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Critical care coordination', 'Patient handoff discipline'],
      postingDate: '2026-07-16',
      closingDate: '2026-08-16',
      scrapedAt: '2026-07-16T12:30:00.000Z',
    },
    {
      jobId: '58122244',
      requisitionId: '14891',
      title: 'Resident Doctor',
      company: 'Narayana Health',
      department: null,
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      link: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/',
      applyUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Resident-Doctor-KA-560099/58122244/',
      source: 'narayanahealth',
      employmentType: null,
      experienceRequired: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16 Jul 2026',
      closingDate: null,
      scrapedAt: '2026-07-16T12:30:00.000Z',
    },
    {
      jobId: '58133344',
      requisitionId: '14892',
      title: 'Student',
      company: 'Narayana Health',
      department: null,
      location: 'Bangalore, KA, IN, 560099',
      city: 'Bangalore',
      link: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Student-KA-560099/58133344/',
      applyUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Student-KA-560099/58133344/',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Bangalore-Student-KA-560099/58133344/',
      source: 'narayanahealth',
      employmentType: null,
      experienceRequired: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '16 Jul 2026',
      closingDate: null,
      scrapedAt: '2026-07-16T12:30:00.000Z',
    },
    {
      jobId: '58244444',
      requisitionId: '14912',
      title: 'Senior Executive',
      company: 'Narayana Health',
      department: null,
      location: 'Jaipur, RJ, IN, 302033',
      city: 'Jaipur',
      link: 'https://jobs.narayanahealth.org/NH-India/job/Jaipur-Senior-Executive-RJ-302033/58244444/',
      applyUrl: 'https://jobs.narayanahealth.org/NH-India/job/Jaipur-Senior-Executive-RJ-302033/58244444/',
      sourceUrl: 'https://jobs.narayanahealth.org/NH-India/job/Jaipur-Senior-Executive-RJ-302033/58244444/',
      source: 'narayanahealth',
      employmentType: null,
      experienceRequired: null,
      jobDescription: 'Coordinate patient outreach and marketing activities. Program coordination',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Program coordination'],
      postingDate: '2026-07-16',
      closingDate: null,
      scrapedAt: '2026-07-16T12:30:00.000Z',
    },
  ])
})

test('run fails closed when the verified Narayana Health first-party surfaces drift', async () => {
  const narayanaHealth = await loadNarayanaHealthModule()

  await assert.rejects(
    narayanaHealth.createNarayanaHealthScraper().run({
      fetchText: async (url) => {
        if (url === narayanaHealth.OFFICIAL_SITE_MAP_URL) {
          return '<html><body><h1>Sitemap</h1><a href="/careers">Careers</a></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /sitemap no longer matches/i,
  )
})
