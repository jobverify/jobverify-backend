import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T12:00:00.000Z'
const CAREERS_PAGE_URL = 'https://www.latticesemi.com/About/Jobs'
const SEARCH_INTRO_URL = 'https://careers-latticesemi.icims.com/jobs/intro?bga=true&hashed=-625919477&height=500&jan1offset=-480&jun1offset=-420&mobile=false&needsRedirect=false&width=1378'
const SEARCH_WRAPPER_URL = 'https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1'
const SEARCH_IFRAME_URL = 'https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1&in_iframe=1'
const SEARCH_PAGE_URL_PAGE_2 = 'https://careers-latticesemi.icims.com/jobs/search?pr=1&in_iframe=1&searchRelation=keyword_all'
const DETAIL_URL = 'https://careers-latticesemi.icims.com/jobs/3678/senior-director%2C-global-facilities/job'
const DETAIL_FETCH_URL = `${DETAIL_URL}?in_iframe=1`
const APPLY_URL = 'https://careers-latticesemi.icims.com/jobs/3678/senior-director%2C-global-facilities/job?apply=yes&hashed=-1834388451&mode=apply'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Lattice Semiconductor | Careers | Join the FPGA Leader</title>
  </head>
  <body>
    <main>
      <h1>Lattice Careers</h1>
      <a href="https://careers-latticesemi.icims.com/jobs/intro?hashed=-625919477&amp;mobile=false&amp;width=1378&amp;height=500&amp;bga=true&amp;needsRedirect=false&amp;jan1offset=-480&amp;jun1offset=-420">Search Job Openings</a>
      <a href="https://latticesemi.wd5.myworkdayjobs.com/Lattice_Careers">Apply Today</a>
    </main>
  </body>
</html>
`

const introHtml = `
<!doctype html>
<html>
  <head>
    <title>Lattice Semiconductor Corp. | Careers Center | Welcome</title>
  </head>
  <body>
    <h1>Welcome</h1>
    <p>You can <a href="https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1">view all open positions</a> or use the following search form.</p>
    <div>MH Pune IN</div>
  </body>
</html>
`

const introShellHtml = `
<!doctype html>
<html>
  <head>
    <title>iCIMS Careers Portal</title>
  </head>
  <body>
    <div id="portal"></div>
  </body>
</html>
`

const listingPageOneHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Listings at Lattice Semiconductor Corp.</title>
    <link rel="canonical" href="https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1" />
    <link rel="next" href="https://careers-latticesemi.icims.com/jobs/search?pr=1&amp;in_iframe=1&amp;searchRelation=keyword_all" />
  </head>
  <body>
    <div id="iCIMS_Header"><h1 class="iCIMS_Header">Job Listings</h1></div>
    <div>Search Results Page 1 of 2</div>
    <ul class="iCIMS_JobsTable">
      <li class="iCIMS_JobCardItem">
        <div class="row">
          <div class="col-xs-12 title">
            <a href="https://careers-latticesemi.icims.com/jobs/3678/senior-director%2C-global-facilities/job?in_iframe=1" class="iCIMS_Anchor" title="3678 - Senior Director, Global Facilities">
              <h3>Senior Director, Global Facilities</h3>
            </a>
          </div>
          <div class="col-xs-12 description">
            Drive workplace strategy and facilities operations for the Pune site.
          </div>
          <div class="col-xs-12 additionalFields">
            <dl class="iCIMS_JobHeaderGroup">
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">Category</dt>
                <dd class="iCIMS_JobHeaderData"><span>Facilities</span></dd>
              </div>
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">ID</dt>
                <dd class="iCIMS_JobHeaderData"><span>2026-3678</span></dd>
              </div>
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField"><span class="sr-only field-label">Job Locations</span></dt>
                <dd class="iCIMS_JobHeaderData"><span>IN-MH-Pune</span></dd>
              </div>
            </dl>
          </div>
        </div>
      </li>
      <li class="iCIMS_JobCardItem">
        <div class="row">
          <div class="col-xs-12 title">
            <a href="https://careers-latticesemi.icims.com/jobs/3684/field-applications-engineering/job?in_iframe=1" class="iCIMS_Anchor" title="3684 - Field Applications Engineering">
              <h3>Field Applications Engineering</h3>
            </a>
          </div>
          <div class="col-xs-12 description">Non-India role.</div>
          <div class="col-xs-12 additionalFields">
            <dl class="iCIMS_JobHeaderGroup">
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">Category</dt>
                <dd class="iCIMS_JobHeaderData"><span>Sales</span></dd>
              </div>
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">ID</dt>
                <dd class="iCIMS_JobHeaderData"><span>2026-3684</span></dd>
              </div>
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField"><span class="sr-only field-label">Job Locations</span></dt>
                <dd class="iCIMS_JobHeaderData"><span>DE</span></dd>
              </div>
            </dl>
          </div>
        </div>
      </li>
    </ul>
  </body>
</html>
`

const listingPageTwoHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Listings at Lattice Semiconductor Corp.</title>
    <link rel="canonical" href="https://careers-latticesemi.icims.com/jobs/search?pr=1" />
  </head>
  <body>
    <div id="iCIMS_Header"><h1 class="iCIMS_Header">Job Listings</h1></div>
    <div>Search Results Page 2 of 2</div>
    <ul class="iCIMS_JobsTable">
      <li class="iCIMS_JobCardItem">
        <div class="row">
          <div class="col-xs-12 title">
            <a href="https://careers-latticesemi.icims.com/jobs/3548/ip-design-engineer/job?in_iframe=1" class="iCIMS_Anchor" title="3548 - IP Design Engineer">
              <h3>IP Design Engineer</h3>
            </a>
          </div>
          <div class="col-xs-12 description">
            Build programmable logic IP for next-generation semiconductor platforms.
          </div>
          <div class="col-xs-12 additionalFields">
            <dl class="iCIMS_JobHeaderGroup">
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">Category</dt>
                <dd class="iCIMS_JobHeaderData"><span>Engineering</span></dd>
              </div>
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">ID</dt>
                <dd class="iCIMS_JobHeaderData"><span>2026-3548</span></dd>
              </div>
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField"><span class="sr-only field-label">Job Locations</span></dt>
                <dd class="iCIMS_JobHeaderData"><span>IN-MH-Pune</span></dd>
              </div>
            </dl>
          </div>
        </div>
      </li>
    </ul>
  </body>
</html>
`

const listingPageHeaderLocationHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Listings at Lattice Semiconductor Corp.</title>
  </head>
  <body>
    <div id="iCIMS_Header"><h1 class="iCIMS_Header">Job Listings</h1></div>
    <ul class="iCIMS_JobsTable">
      <li class="iCIMS_JobCardItem">
        <div class="row">
          <div class="col-xs-6 header left">
            <span class="sr-only field-label">Job Locations</span>
            <span> | IN-MH-Pune</span>
          </div>
          <div class="col-xs-6 header right"></div>
          <div class="col-xs-12 title">
            <a href="https://careers-latticesemi.icims.com/jobs/3674/sr-staff-qa-test-eng/job?in_iframe=1" class="iCIMS_Anchor" title="3674 - Sr Staff QA/Test Eng">
              <span class="sr-only field-label">Title</span>
              <h3>Sr Staff QA/Test Eng</h3>
            </a>
          </div>
          <div class="col-xs-12 description">
            Validate programmable logic products with automated and manual test coverage.
          </div>
          <div class="col-xs-12 additionalFields">
            <dl class="iCIMS_JobHeaderGroup">
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">Category</dt>
                <dd class="iCIMS_JobHeaderData"><span>Engineering</span></dd>
              </div>
              <div class="iCIMS_JobHeaderTag">
                <dt class="iCIMS_JobHeaderField">ID</dt>
                <dd class="iCIMS_JobHeaderData"><span>2026-3674</span></dd>
              </div>
            </dl>
          </div>
        </div>
      </li>
    </ul>
  </body>
</html>
`

const detailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Senior Director, Global Facilities | Lattice Semiconductor Corp.</title>
    <script type="application/ld+json">
      {
        "@context": "http://schema.org",
        "@type": "JobPosting",
        "title": "Senior Director, Global Facilities",
        "datePosted": "2026-07-10T00:00:00.000Z",
        "description": "<h2>Overview</h2><p>Drive workplace strategy and facilities operations for the Pune site.</p><h2>Responsibilities</h2><ul><li>Lead site operations and vendor management</li><li>Partner with global leaders on workplace planning</li></ul><h2>Qualifications</h2><ul><li>Experience leading facilities programs in semiconductor or electronics environments</li></ul>"
      }
    </script>
  </head>
  <body>
    <div class="iCIMS_JobContainer">
      <div class="iCIMS_JobContent">
        <div class="container-fluid iCIMS_JobsTable">
          <div class="row">
            <div class="col-xs-12 title">
              <div id="iCIMS_Header" tabindex="-1">
                <h1 class="iCIMS_Header">Senior Director, Global Facilities</h1>
              </div>
            </div>
            <div class="col-xs-12 additionalFields">
              <dl class="iCIMS_JobHeaderGroup">
                <div class="iCIMS_JobHeaderTag">
                  <dt class="iCIMS_JobHeaderField"><span class="sr-only field-label">Job Locations</span></dt>
                  <dd class="iCIMS_JobHeaderData"><span>PH-Alabang Muntinlupa City</span></dd>
                </div>
                <div class="iCIMS_JobHeaderTag">
                  <dt class="iCIMS_JobHeaderField">Category</dt>
                  <dd class="iCIMS_JobHeaderData"><span>Facilities</span></dd>
                </div>
                <div class="iCIMS_JobHeaderTag">
                  <dt class="iCIMS_JobHeaderField">Position Type</dt>
                  <dd class="iCIMS_JobHeaderData"><span>Regular Full-Time</span></dd>
                </div>
                <div class="iCIMS_JobHeaderTag">
                  <dt class="iCIMS_JobHeaderField">ID</dt>
                  <dd class="iCIMS_JobHeaderData"><span>2026-3678</span></dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <div class="iCIMS_JobOptions">
          <a
            href="https://careers-latticesemi.icims.com/jobs/3678/senior-director%2C-global-facilities/job?mode=apply&amp;apply=yes&amp;in_iframe=1&amp;hashed=-1834388451"
            class="iCIMS_Anchor iCIMS_Action_Button iCIMS_ApplyOnlineButton iCIMS_PrimaryButton"
            title="Apply now"
          >
            Apply now
          </a>
        </div>
      </div>
    </div>
  </body>
</html>
`

const loadLatticeModule = async () => {
  try {
    return await import('../../scraper/latticesemiconductorindia/script.js')
  } catch {
    assert.fail('Expected Lattice Semiconductor India scraper module at ../../scraper/latticesemiconductorindia/script.js')
  }
}

test('Lattice Semiconductor India helpers stay pinned to the verified official careers and iCIMS handoff surfaces', async () => {
  const lattice = await loadLatticeModule()

  assert.equal(lattice.SOURCE, 'latticesemiconductorindia')
  assert.equal(lattice.COMPANY_NAME, 'Lattice Semiconductor India')
  assert.equal(lattice.OFFICIAL_BRAND_NAME, 'Lattice Semiconductor')
  assert.equal(lattice.HOMEPAGE_URL, 'https://www.latticesemi.com/en')
  assert.equal(lattice.OFFICIAL_CAREERS_PAGE_URL, CAREERS_PAGE_URL)
  assert.equal(lattice.SEARCH_INTRO_URL, SEARCH_INTRO_URL)
  assert.equal(lattice.SEARCH_WRAPPER_URL, SEARCH_WRAPPER_URL)
  assert.equal(lattice.SEARCH_IFRAME_URL, SEARCH_IFRAME_URL)
  assert.equal(lattice.VERIFIED_ON, '2026-08-02')
  assert.equal(lattice.buildSearchUrl(), SEARCH_IFRAME_URL)
  assert.equal(lattice.buildSearchUrl(1), SEARCH_PAGE_URL_PAGE_2)
  assert.equal(
    lattice.buildDetailUrl({ jobId: '3678', slug: 'senior-director%2C-global-facilities' }),
    DETAIL_URL,
  )
  assert.equal(
    lattice.buildDetailFetchUrl({ jobId: '3678', slug: 'senior-director%2C-global-facilities' }),
    DETAIL_FETCH_URL,
  )
  assert.equal(lattice.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(lattice.extractSearchIntroUrl(officialCareersHtml), SEARCH_INTRO_URL)
  assert.equal(lattice.hasOfficialSearchIntroSignal(introHtml), true)
  assert.equal(lattice.hasOfficialSearchIntroSignal(introShellHtml), true)
  assert.equal(lattice.extractSearchWrapperUrl(introHtml), SEARCH_WRAPPER_URL)
  assert.equal(lattice.hasOfficialListingsPageSignal(listingPageOneHtml), true)
  assert.equal(lattice.extractNextPageUrl(listingPageOneHtml), SEARCH_PAGE_URL_PAGE_2)
})

test('extractJobCards keeps only India jobs from the verified Lattice iCIMS listings surface', async () => {
  const lattice = await loadLatticeModule()
  const jobs = lattice.extractJobCards(listingPageOneHtml)

  assert.deepEqual(jobs, [
    {
      title: 'Senior Director, Global Facilities',
      company: 'Lattice Semiconductor India',
      department: 'Facilities',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '3678',
      requisitionId: '2026-3678',
      sourceUrl: DETAIL_URL,
      applyUrl: DETAIL_URL,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Drive workplace strategy and facilities operations for the Pune site.',
    },
  ])
})

test('extractJobCards supports the current header-style India location markup on Lattice iCIMS cards', async () => {
  const lattice = await loadLatticeModule()
  const jobs = lattice.extractJobCards(listingPageHeaderLocationHtml)

  assert.deepEqual(jobs, [
    {
      title: 'Sr Staff QA/Test Eng',
      company: 'Lattice Semiconductor India',
      department: 'Engineering',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '3674',
      requisitionId: '2026-3674',
      sourceUrl: 'https://careers-latticesemi.icims.com/jobs/3674/sr-staff-qa-test-eng/job',
      applyUrl: 'https://careers-latticesemi.icims.com/jobs/3674/sr-staff-qa-test-eng/job',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Validate programmable logic products with automated and manual test coverage.',
    },
  ])
})

test('extractJobDetail trusts the India listing location over the inconsistent detail location and builds the canonical apply URL', async () => {
  const lattice = await loadLatticeModule()
  const detail = lattice.extractJobDetail(detailHtml, {
    title: 'Senior Director, Global Facilities',
    company: 'Lattice Semiconductor India',
    department: 'Facilities',
    location: 'Pune, India',
    city: 'Pune',
    country: 'India',
    jobId: '3678',
    requisitionId: '2026-3678',
    sourceUrl: DETAIL_URL,
    applyUrl: DETAIL_URL,
    employmentType: null,
    jobDescription: 'Drive workplace strategy and facilities operations for the Pune site.',
  })

  assert.deepEqual(detail, {
    title: 'Senior Director, Global Facilities',
    company: 'Lattice Semiconductor India',
    department: 'Facilities',
    location: 'Pune, India',
    city: 'Pune',
    country: 'India',
    jobId: '3678',
    requisitionId: '2026-3678',
    sourceUrl: DETAIL_URL,
    applyUrl: APPLY_URL,
    employmentType: 'Regular Full-Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Experience leading facilities programs in semiconductor or electronics environments',
    ],
    postingDate: '2026-07-10T00:00:00.000Z',
    closingDate: null,
    jobDescription: 'Drive workplace strategy and facilities operations for the Pune site. Lead site operations and vendor management Partner with global leaders on workplace planning Experience leading facilities programs in semiconductor or electronics environments',
  })
})

test('run validates the official Lattice handoff, paginates the India iCIMS listings, and decorates jobs', async () => {
  const lattice = await loadLatticeModule()
  const requestedUrls = []

  const jobs = await lattice.createLatticeSemiconductorIndiaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_PAGE_URL) return officialCareersHtml
      if (url === SEARCH_INTRO_URL) return introHtml
      if (url === SEARCH_IFRAME_URL) return listingPageOneHtml
      if (url === SEARCH_PAGE_URL_PAGE_2) return listingPageTwoHtml
      if (url === DETAIL_FETCH_URL) return detailHtml
      if (url === 'https://careers-latticesemi.icims.com/jobs/3548/ip-design-engineer/job?in_iframe=1') {
        return detailHtml
          .replaceAll('Senior Director, Global Facilities', 'IP Design Engineer')
          .replaceAll('2026-3678', '2026-3548')
          .replaceAll('/jobs/3678/senior-director%2C-global-facilities/', '/jobs/3548/ip-design-engineer/')
          .replaceAll('Facilities', 'Engineering')
          .replaceAll('Drive workplace strategy and facilities operations for the Pune site.', 'Build programmable logic IP for next-generation semiconductor platforms.')
          .replaceAll('Lead site operations and vendor management', 'Design and verify programmable logic IP blocks')
          .replaceAll('Partner with global leaders on workplace planning', 'Collaborate with cross-functional hardware and software teams')
          .replaceAll('Experience leading facilities programs in semiconductor or electronics environments', 'Experience in RTL design and semiconductor product development')
          .replaceAll('2026-07-10T00:00:00.000Z', '2026-06-17T00:00:00.000Z')
          .replaceAll('hashed=-1834388451', 'hashed=-1000000000')
      }
      throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_PAGE_URL,
    SEARCH_INTRO_URL,
    SEARCH_IFRAME_URL,
    DETAIL_FETCH_URL,
    SEARCH_PAGE_URL_PAGE_2,
    'https://careers-latticesemi.icims.com/jobs/3548/ip-design-engineer/job?in_iframe=1',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      jobId: job.jobId,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Senior Director, Global Facilities',
        location: 'Pune, India',
        city: 'Pune',
        jobId: '3678',
        sourceUrl: DETAIL_URL,
        applyUrl: APPLY_URL,
        source: 'latticesemiconductorindia',
        link: APPLY_URL,
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'IP Design Engineer',
        location: 'Pune, India',
        city: 'Pune',
        jobId: '3548',
        sourceUrl: 'https://careers-latticesemi.icims.com/jobs/3548/ip-design-engineer/job',
        applyUrl: 'https://careers-latticesemi.icims.com/jobs/3548/ip-design-engineer/job?apply=yes&hashed=-1000000000&mode=apply',
        source: 'latticesemiconductorindia',
        link: 'https://careers-latticesemi.icims.com/jobs/3548/ip-design-engineer/job?apply=yes&hashed=-1000000000&mode=apply',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('run falls back to a browser-aware fetch when the first-party careers page rejects the default request with HTTP 403', async () => {
  const lattice = await loadLatticeModule()
  const requestedUrls = []
  const browserRequestedUrls = []

  const jobs = await lattice.createLatticeSemiconductorIndiaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_PAGE_URL) {
        throw new Error(`HTTP 403 for ${url}`)
      }
      if (url === SEARCH_INTRO_URL) return introHtml
      if (url === SEARCH_IFRAME_URL) return listingPageOneHtml
      if (url === DETAIL_FETCH_URL) return detailHtml
      throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
    },
    fetchBrowserText: async (url) => {
      browserRequestedUrls.push(url)
      if (url === CAREERS_PAGE_URL) return officialCareersHtml
      throw new Error(`Unexpected browser fallback URL: ${url}`)
    },
    maxJobs: 1,
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_PAGE_URL,
    SEARCH_INTRO_URL,
    SEARCH_IFRAME_URL,
    DETAIL_FETCH_URL,
  ])
  assert.deepEqual(browserRequestedUrls, [CAREERS_PAGE_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, '3678')
  assert.equal(jobs[0].applyUrl, APPLY_URL)
})

test('run accepts the current generic iCIMS intro shell when the pinned listings wrapper still validates', async () => {
  const lattice = await loadLatticeModule()

  const jobs = await lattice.createLatticeSemiconductorIndiaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === CAREERS_PAGE_URL) return officialCareersHtml
      if (url === SEARCH_INTRO_URL) return introShellHtml
      if (url === SEARCH_IFRAME_URL) return listingPageOneHtml
      if (url === DETAIL_FETCH_URL) return detailHtml
      throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
    },
    maxJobs: 1,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, '3678')
})

test('run tolerates punctuation-only title drift between the India listing card and iCIMS detail page', async () => {
  const lattice = await loadLatticeModule()

  const jobs = await lattice.createLatticeSemiconductorIndiaScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === CAREERS_PAGE_URL) return officialCareersHtml
      if (url === SEARCH_INTRO_URL) return introShellHtml
      if (url === SEARCH_IFRAME_URL) {
        return listingPageHeaderLocationHtml
          .replaceAll('3674', '3558')
          .replaceAll('Sr Staff QA/Test Eng', 'Staff EDA Engineer - RTL Front-End Tools & Methodologies')
          .replaceAll('2026-3674', '2026-3558')
          .replaceAll(
            'https://careers-latticesemi.icims.com/jobs/3674/sr-staff-qa-test-eng/job?in_iframe=1',
            'https://careers-latticesemi.icims.com/jobs/3558/staff-eda-engineer-%e2%80%93-rtl-front-end-tools-%26-methodologies/job?in_iframe=1',
          )
      }
      if (
        url === 'https://careers-latticesemi.icims.com/jobs/3558/staff-eda-engineer-%e2%80%93-rtl-front-end-tools-%26-methodologies/job?in_iframe=1'
        || url === 'https://careers-latticesemi.icims.com/jobs/3558/sr-staff-qa-test-eng/job?in_iframe=1'
      ) {
        return detailHtml
          .replaceAll('Senior Director, Global Facilities', 'Staff EDA Engineer – RTL Front End Tools & Methodologies')
          .replaceAll('2026-3678', '2026-3558')
          .replaceAll('/jobs/3678/senior-director%2C-global-facilities/', '/jobs/3558/staff-eda-engineer-%e2%80%93-rtl-front-end-tools-%26-methodologies/')
          .replaceAll('Facilities', 'Engineering')
          .replaceAll('Drive workplace strategy and facilities operations for the Pune site.', 'Build and maintain RTL front-end tools and methodologies.')
          .replaceAll('Lead site operations and vendor management', 'Develop automation for RTL design flows')
          .replaceAll('Partner with global leaders on workplace planning', 'Collaborate with CAD and design teams on methodology improvements')
          .replaceAll('Experience leading facilities programs in semiconductor or electronics environments', 'Experience with RTL flows and EDA tooling')
          .replaceAll('2026-07-10T00:00:00.000Z', '2026-05-05T04:00:00.000Z')
      }
      throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
    },
    maxJobs: 1,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, '3558')
  assert.equal(jobs[0].title, 'Staff EDA Engineer – RTL Front End Tools & Methodologies')
})

test('Lattice Semiconductor India fails closed when the official careers page, intro handoff, listings surface, or detail contract drift', async () => {
  const lattice = await loadLatticeModule()

  await assert.rejects(
    lattice.createLatticeSemiconductorIndiaScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_PAGE_URL) {
          return officialCareersHtml.replace('Search Job Openings', 'Explore Roles')
        }
        throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
      },
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    lattice.createLatticeSemiconductorIndiaScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_PAGE_URL) return officialCareersHtml
        if (url === SEARCH_INTRO_URL) {
          return '<html><head><title>Unexpected</title></head><body>Not iCIMS</body></html>'
        }
        throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
      },
    }),
    /verified iCIMS intro/i,
  )

  await assert.rejects(
    lattice.createLatticeSemiconductorIndiaScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_PAGE_URL) return officialCareersHtml
        if (url === SEARCH_INTRO_URL) return introHtml
        if (url === SEARCH_IFRAME_URL) {
          return listingPageOneHtml.replace('iCIMS_JobsTable', 'JobsTable')
        }
        throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
      },
    }),
    /verified India iCIMS listings page/i,
  )

  await assert.rejects(
    lattice.createLatticeSemiconductorIndiaScraper().run({
      fetchText: async (url) => {
        if (url === CAREERS_PAGE_URL) return officialCareersHtml
        if (url === SEARCH_INTRO_URL) return introHtml
        if (url === SEARCH_IFRAME_URL) return listingPageOneHtml
        if (url === DETAIL_FETCH_URL) {
          return detailHtml.replace('mode=apply&amp;apply=yes', 'mode=view')
        }
        throw new Error(`Unexpected Lattice Semiconductor India fixture URL: ${url}`)
      },
    }),
    /verified Lattice Semiconductor India iCIMS detail page/i,
  )
})
