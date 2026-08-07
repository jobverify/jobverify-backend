import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>GRC | Governance, Risk and Compliance Software Solutions</title>
  </head>
  <body>
    <main>
      <a href="/about-us/careers.htm">Careers</a>
      <h1>Connected GRC for the enterprise</h1>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers & Job Opportunities - MetricStream</title>
  </head>
  <body>
    <main>
      <h1>Careers at MetricStream</h1>
      <a href="https://career5.successfactors.eu/career?company=metricstre">Search Open Positions</a>
    </main>
  </body>
</html>
`

const searchHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Opportunities</title>
  </head>
  <body>
    <div id="careerJobSearchContainer">
      <h2>Search for Openings</h2>
      <div>3 Jobs matched your search</div>
      <div>Page 1 of 1</div>
      <div>Items per page 10</div>
      <table>
        <tbody>
          <tr class="jobResultItem">
            <td>
              <div role="heading" aria-level="3">
                <a
                  class="jobTitle"
                  href="/career?career_ns=job_listing&company=metricstre&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=3563&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta&_s.crb=abc123"
                >
                  Business Analyst
                </a>
              </div>
              <div class="noteSection" role="note">
                <div>
                  Requisition ID: <span class="jobContentEM">3563</span> -
                  <span class="jobContentEM">Posted on 07/16/2026</span> -
                  <span class="jobContentEM">Professional Services</span> -
                  <span class="jobMFieldContent" onclick="showMFieldDialog(['United Kingdom'])">Country (1)</span> -
                  <span class="jobMFieldContent" onclick="showMFieldDialog(['London'])">City (1)</span>
                </div>
              </div>
            </td>
          </tr>
          <tr class="jobResultItem">
            <td>
              <div role="heading" aria-level="3">
                <a
                  class="jobTitle"
                  href="/career?career_ns=job_listing&company=metricstre&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=3509&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta&_s.crb=abc123"
                >
                  Product Manager
                </a>
              </div>
              <div class="noteSection" role="note">
                <div>
                  Requisition ID: <span class="jobContentEM">3509</span> -
                  <span class="jobContentEM">Posted on 06/24/2026</span> -
                  <span class="jobContentEM">Product Management</span> -
                  <span class="jobMFieldContent" onclick="showMFieldDialog(['India'])">Country (1)</span> -
                  <span class="jobMFieldContent" onclick="showMFieldDialog(['Bangalore'])">City (1)</span>
                </div>
              </div>
            </td>
          </tr>
          <tr class="jobResultItem">
            <td>
              <div role="heading" aria-level="3">
                <a
                  class="jobTitle"
                  href="/career?career_ns=job_listing&company=metricstre&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=3544&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta&_s.crb=abc123"
                >
                  Senior Functional Trainer
                </a>
              </div>
              <div class="noteSection" role="note">
                <div>
                  Requisition ID: <span class="jobContentEM">3544</span> -
                  <span class="jobContentEM">Posted on 06/24/2026</span> -
                  <span class="jobContentEM">Sales</span> -
                  <span class="jobMFieldContent" onclick="showMFieldDialog(['India'])">Country (1)</span> -
                  <span class="jobMFieldContent" onclick="showMFieldDialog(['Bengaluru'])">City (1)</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
</html>
`

const productManagerDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Opportunities: Product Manager (3509)</title>
  </head>
  <body>
    <main>
      <h1>Career Opportunities: Product Manager (3509)</h1>
      <p>Requisition ID 3509 - Posted 06/24/2026 - Product Management - India - Bangalore</p>
      <button
        id="applyButton_top"
        onclick="checkDpcs2AndProceed({isUserLoggedIn: false , jobReqId: 3509, evtSrc:'Apply'}); return false;"
      >
        Apply
      </button>
      <h2>Job Description</h2>
      <p>Drive product strategy, roadmap alignment, and launch readiness across governance workflows.</p>
      <h2>Key Responsibilities</h2>
      <ul>
        <li>Own roadmap planning for core GRC product capabilities.</li>
        <li>Partner with engineering and design on release execution.</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>5+ years of enterprise product management experience.</li>
      </ul>
    </main>
  </body>
</html>
`

const trainerDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Opportunities: Senior Functional Trainer (3544)</title>
  </head>
  <body>
    <main>
      <h1>Career Opportunities: Senior Functional Trainer (3544)</h1>
      <p>Requisition ID 3544 - Posted 06/24/2026 - Sales - India - Bengaluru</p>
      <button
        id="applyButton_top"
        onclick="checkDpcs2AndProceed({isUserLoggedIn: false , jobReqId: 3544, evtSrc:'Apply'}); return false;"
      >
        Apply
      </button>
      <h2>Job Description</h2>
      <p>Deliver product enablement for customer-facing teams and strategic programs.</p>
      <h2>Key Responsibilities</h2>
      <ul>
        <li>Lead functional training for enterprise platform rollouts.</li>
      </ul>
      <h2>Requirements</h2>
      <ul>
        <li>Strong facilitation and SaaS domain expertise.</li>
      </ul>
    </main>
  </body>
</html>
`

const loadMetricStreamModule = async () => {
  try {
    return await import('../../scraper/metricstream/script.js')
  } catch {
    assert.fail('Expected MetricStream scraper module at ../../scraper/metricstream/script.js')
  }
}

test('MetricStream helpers stay pinned to the verified first-party careers handoff and SuccessFactors search shape', async () => {
  const metricStream = await loadMetricStreamModule()

  assert.equal(metricStream.SOURCE, 'metricstream')
  assert.equal(metricStream.COMPANY_NAME, 'MetricStream')
  assert.equal(metricStream.HOMEPAGE_URL, 'https://www.metricstream.com/')
  assert.equal(
    metricStream.CAREERS_PAGE_URL,
    'https://www.metricstream.com/about-us/careers.htm',
  )
  assert.equal(
    metricStream.SUCCESSFACTORS_BOARD_URL,
    'https://career5.successfactors.eu/career?company=metricstre',
  )
  assert.equal(
    metricStream.SUCCESSFACTORS_SEARCH_URL,
    'https://career5.successfactors.eu/career?company=metricstre&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  )
  assert.equal(
    metricStream.buildDetailUrl('3509'),
    'https://career5.successfactors.eu/career?career_ns=job_listing&company=metricstre&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=3509&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  )
  assert.equal(metricStream.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(metricStream.hasOfficialCareersPageSignal(careersHtml), true)
  assert.equal(
    metricStream.extractSuccessFactorsHandoffUrl(careersHtml),
    metricStream.SUCCESSFACTORS_BOARD_URL,
  )
  assert.equal(metricStream.hasSuccessFactorsSearchPageSignal(searchHtml), true)
  assert.deepEqual(metricStream.extractSearchSummary(searchHtml), {
    totalJobs: 3,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
  })
  assert.deepEqual(metricStream.extractSearchResults(searchHtml), [
    {
      title: 'Business Analyst',
      department: 'Professional Services',
      location: 'London, United Kingdom',
      city: 'London',
      country: 'United Kingdom',
      jobId: '3563',
      requisitionId: '3563',
      sourceUrl: metricStream.buildDetailUrl('3563'),
      applyUrl: metricStream.buildDetailUrl('3563'),
      postingDate: '2026-07-16',
    },
    {
      title: 'Product Manager',
      department: 'Product Management',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '3509',
      requisitionId: '3509',
      sourceUrl: metricStream.buildDetailUrl('3509'),
      applyUrl: metricStream.buildDetailUrl('3509'),
      postingDate: '2026-06-24',
    },
    {
      title: 'Senior Functional Trainer',
      department: 'Sales',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '3544',
      requisitionId: '3544',
      sourceUrl: metricStream.buildDetailUrl('3544'),
      applyUrl: metricStream.buildDetailUrl('3544'),
      postingDate: '2026-06-24',
    },
  ])
})

test('MetricStream detail extraction preserves the canonical public detail URL and sectioned description', async () => {
  const metricStream = await loadMetricStreamModule()

  const detail = metricStream.extractJobDetail(productManagerDetailHtml, {
    title: 'Product Manager',
    department: 'Product Management',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '3509',
    requisitionId: '3509',
    sourceUrl: metricStream.buildDetailUrl('3509'),
    applyUrl: metricStream.buildDetailUrl('3509'),
    postingDate: '2026-06-24',
  })

  assert.deepEqual(detail, {
    title: 'Product Manager',
    department: 'Product Management',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '3509',
    requisitionId: '3509',
    employmentType: null,
    experienceRequired: null,
    jobDescription: 'Job Description: Drive product strategy, roadmap alignment, and launch readiness across governance workflows.\n\nKey Responsibilities: Own roadmap planning for core GRC product capabilities. Partner with engineering and design on release execution.\n\nRequirements: 5+ years of enterprise product management experience.',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Own roadmap planning for core GRC product capabilities.',
      'Partner with engineering and design on release execution.',
      '5+ years of enterprise product management experience.',
    ],
    postingDate: '2026-06-24',
    applyUrl: metricStream.buildDetailUrl('3509'),
    sourceUrl: metricStream.buildDetailUrl('3509'),
  })
})

test('MetricStream browser pagination works without locator helpers or waitForTimeout', async () => {
  const metricStream = await loadMetricStreamModule()
  const waitCalls = []
  const searchPages = [searchHtml, searchHtml.replace(/3509/g, '3544')]
  const requisitionIds = ['3563', '3544']
  let pageIndex = 0
  let browserClosed = false

  const fakePage = {
    goto: async () => {},
    waitForFunction: async (_pageFunction, options, ...args) => {
      waitCalls.push({ options, args })
    },
    content: async () => searchPages[pageIndex],
    $: async (selector) => {
      if (selector === 'a[title="Next Page"]') {
        if (pageIndex > 0) return null

        return {
          evaluate: async (callback) => callback({ getAttribute: () => '' }),
          click: async () => {
            pageIndex = 1
          },
          dispose: async () => {},
        }
      }

      if (selector === 'tr.jobResultItem .jobContentEM') {
        return {
          evaluate: async (callback) => callback({ textContent: requisitionIds[pageIndex] }),
          dispose: async () => {},
        }
      }

      return null
    },
  }

  const pages = await metricStream.getLiveSearchPages({
    launchBrowserImpl: async () => ({
      close: async () => {
        browserClosed = true
      },
    }),
    createOptimizedPageImpl: async () => fakePage,
    maxPages: 5,
  })

  assert.deepEqual(pages, searchPages)
  assert.equal(browserClosed, true)
  assert.deepEqual(waitCalls[1], {
    options: { timeout: 120000 },
    args: ['tr.jobResultItem .jobContentEM', '3563'],
  })
})

test('MetricStream run keeps the scraper on the verified first-party careers handoff, public board, and India detail pages only', async () => {
  const metricStream = await loadMetricStreamModule()
  const requestedUrls = []

  const jobs = await metricStream.createMetricStreamScraper({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === metricStream.HOMEPAGE_URL) return homepageHtml
      if (url === metricStream.CAREERS_PAGE_URL) return careersHtml
      if (url === metricStream.buildDetailUrl('3509')) return productManagerDetailHtml
      if (url === metricStream.buildDetailUrl('3544')) return trainerDetailHtml

      throw new Error(`Unexpected MetricStream URL: ${url}`)
    },
    getSearchPages: async () => [searchHtml],
    now: () => '2026-07-16T00:00:00.000Z',
  }).run()

  assert.deepEqual(requestedUrls, [
    metricStream.HOMEPAGE_URL,
    metricStream.CAREERS_PAGE_URL,
    metricStream.buildDetailUrl('3509'),
    metricStream.buildDetailUrl('3544'),
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Product Manager',
      company: 'MetricStream',
      department: 'Product Management',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      link: metricStream.buildDetailUrl('3509'),
      applyUrl: metricStream.buildDetailUrl('3509'),
      sourceUrl: metricStream.buildDetailUrl('3509'),
      source: 'metricstream',
      jobId: '3509',
      requisitionId: '3509',
      employmentType: null,
      experienceRequired: null,
      jobDescription: 'Job Description: Drive product strategy, roadmap alignment, and launch readiness across governance workflows.\n\nKey Responsibilities: Own roadmap planning for core GRC product capabilities. Partner with engineering and design on release execution.\n\nRequirements: 5+ years of enterprise product management experience.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Own roadmap planning for core GRC product capabilities.',
        'Partner with engineering and design on release execution.',
        '5+ years of enterprise product management experience.',
      ],
      postingDate: '2026-06-24',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
    {
      title: 'Senior Functional Trainer',
      company: 'MetricStream',
      department: 'Sales',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      link: metricStream.buildDetailUrl('3544'),
      applyUrl: metricStream.buildDetailUrl('3544'),
      sourceUrl: metricStream.buildDetailUrl('3544'),
      source: 'metricstream',
      jobId: '3544',
      requisitionId: '3544',
      employmentType: null,
      experienceRequired: null,
      jobDescription: 'Job Description: Deliver product enablement for customer-facing teams and strategic programs.\n\nKey Responsibilities: Lead functional training for enterprise platform rollouts.\n\nRequirements: Strong facilitation and SaaS domain expertise.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [
        'Lead functional training for enterprise platform rollouts.',
        'Strong facilitation and SaaS domain expertise.',
      ],
      postingDate: '2026-06-24',
      scrapedAt: '2026-07-16T00:00:00.000Z',
    },
  ])
})

test('MetricStream fails closed when the verified careers handoff or public search surface drifts', async () => {
  const metricStream = await loadMetricStreamModule()

  await assert.rejects(
    metricStream.createMetricStreamScraper({
      fetchText: async (url) => {
        if (url === metricStream.HOMEPAGE_URL) return homepageHtml
        if (url === metricStream.CAREERS_PAGE_URL) {
          return careersHtml.replace(
            'https://career5.successfactors.eu/career?company=metricstre',
            'https://boards.greenhouse.io/metricstream',
          )
        }

        throw new Error(`Unexpected MetricStream URL: ${url}`)
      },
      getSearchPages: async () => [searchHtml],
    }).run(),
    /verified official careers page/i,
  )

  await assert.rejects(
    metricStream.createMetricStreamScraper({
      fetchText: async (url) => {
        if (url === metricStream.HOMEPAGE_URL) return homepageHtml
        if (url === metricStream.CAREERS_PAGE_URL) return careersHtml

        throw new Error(`Unexpected MetricStream URL: ${url}`)
      },
      getSearchPages: async () => ['<html><body><h1>Career Opportunities</h1></body></html>'],
    }).run(),
    /verified public successfactors search surface/i,
  )
})
