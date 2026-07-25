import assert from 'node:assert/strict'
import test from 'node:test'

const careersPageHtml = `
<!doctype html>
<html>
  <head>
    <title>Aditya Birla Capital Careers: Explore Career Opportunities Now!</title>
    <link rel="canonical" href="https://www.adityabirlacapital.com/careers" />
  </head>
  <body>
    <h1>ABC Careers</h1>
    <nav>
      <a class="nav-item nav-link" href="/careers/jobs" aria-current="page">Jobs</a>
    </nav>
  </body>
</html>
`

const jobsPageHtml = `
<!doctype html>
<html>
  <head>
    <title>Job Search, Employment, Job Vacancies &amp; Opportunities - Aditya Birla Capital</title>
    <link rel="canonical" href="https://www.adityabirlacapital.com/careers/jobs" />
  </head>
  <body>
    <h1>Search Jobs at Aditya Birla Capital</h1>
    <input type="hidden" id="jobTitleEndpoint" value="/ABCareers/api/JobSearch/JobTitleSuggestions" />
    <input type="hidden" id="locationEndpoint" value="/ABCareers/api/JobSearch/LocationSuggestions" />
    <div
      class="job-hunt-card-section"
      onclick="window.location='/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975';"
      data-job-code="abcl_job-33975"
    >
      <a
        href="/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975"
        class="job-hunt-cmpname-section"
        data-job-code="abcl_job-33975"
      >
        <h3>Valuation Officer</h3>
      </a>
    </div>
    <button class="upload-link" onclick="location.href='https://abgcareers.peoplestrong.com/register'">
      UPLOAD RESUME
    </button>
  </body>
</html>
`

const ionaDetailHtml = `
<!doctype html>
<html>
  <head>
    <title>valuation officer sales Jobs in varanasi | Aditya Birla Capital</title>
  </head>
  <body>
    <h2 class="job-description-heading">Job Description</h2>
    <div class="join-team-description">Location: N-VAR, Varanasi</div>
    <button
      type="button"
      class="btn btn-danger p-3 exploreBtn"
      onclick="location.href = 'https://abccareers.iona.ai/job-details/referral/abcl_job-33975?source=ABCCareers&amp;subsource=ABCCareer-Jobs'"
    >
      Apply now
    </button>
  </body>
</html>
`

const peopleStrongDetailHtml = `
<!doctype html>
<html>
  <head>
    <title>branch manager retail gold loan merta city Jobs in rajasthan | Aditya Birla Capital</title>
  </head>
  <body>
    <h2 class="job-description-heading">Job Description</h2>
    <div class="join-team-description">Location: Merta City, Rajasthan</div>
    <button
      type="button"
      class="btn btn-danger p-3 exploreBtn"
      onclick="location.href = 'https://abgcareers.peoplestrong.com/job/detail/abg107672?source=ABCCareers&amp;subsource=ABCCareer-Jobs'"
    >
      Apply now
    </button>
  </body>
</html>
`

const pageZeroPayload = {
  Results: [
    {
      JobCode: 'abcl_job-33975',
      JobTitle: 'Valuation Officer',
      Designation: 'Valuation Officer',
      MinYearsOfExp: 0,
      MaxYearsOfExp: 4,
      FunctionalArea: 'Sales',
      BusinessLine: 'Retail',
      Department: 'Sales',
      Location1: 'N-VAR',
      Location2: 'Varanasi',
      Location3: 'India',
      EndDate: '2026-09-27T18:30:00Z',
      DemandCreatedDate: '2026-06-30T18:30:00Z',
      Url: '/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975',
    },
    {
      JobCode: 'abg107672',
      JobTitle: 'Branch Manager - Retail Gold Loan - Merta City',
      Designation: 'NA',
      MinYearsOfExp: 1,
      MaxYearsOfExp: 15,
      FunctionalArea: 'Sales',
      BusinessLine: 'Aditya Birla Capital Limited',
      Department: 'Retail - Gold Loan',
      Location1: 'Merta City',
      Location2: 'Rajasthan',
      Location3: 'India',
      EndDate: '2027-01-05T18:30:00Z',
      DemandCreatedDate: '2026-07-02T18:30:00Z',
      Url: '/sitecore/content/abcl/abcareers/home/jobs/job-details/branch-manager-retail-gold-loan-merta-city-retail-gold-loan-in-rajasthan-jobs-abg107672',
    },
  ],
  TotalResults: 2,
  Pages: 1,
}

const loadModule = async () => {
  try {
    return await import('../adityabirlacapital/script.js')
  } catch {
    assert.fail('Expected Aditya Birla Capital scraper module at ../adityabirlacapital/script.js')
  }
}

test('Aditya Birla Capital scraper constants stay pinned to the verified official careers surfaces', async () => {
  const adityaBirlaCapital = await loadModule()

  assert.equal(
    adityaBirlaCapital.CAREERS_PAGE_URL,
    'https://www.adityabirlacapital.com/careers',
  )
  assert.equal(
    adityaBirlaCapital.JOBS_PAGE_URL,
    'https://www.adityabirlacapital.com/careers/jobs',
  )
  assert.equal(
    adityaBirlaCapital.RESUME_HANDOFF_URL,
    'https://abgcareers.peoplestrong.com/register',
  )
  assert.equal(
    adityaBirlaCapital.buildJobsApiUrl(),
    'https://www.adityabirlacapital.com/careers/jobs?blogAjax=1&jobTitle=&location=&businessline=&function=&experience=&page=0',
  )
  assert.equal(
    adityaBirlaCapital.buildJobsApiUrl({
      page: 1,
      jobTitle: 'Sales Manager',
      location: 'Mumbai',
    }),
    'https://www.adityabirlacapital.com/careers/jobs?blogAjax=1&jobTitle=Sales+Manager&location=Mumbai&businessline=&function=&experience=&page=1',
  )
  assert.equal(
    adityaBirlaCapital.buildDetailUrl(
      '/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975',
    ),
    'https://www.adityabirlacapital.com/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975',
  )
  assert.equal(
    adityaBirlaCapital.buildApplyUrl('abcl_job-33975'),
    'https://abccareers.iona.ai/job-details/referral/abcl_job-33975?source=ABCCareers&subsource=ABCCareer-Jobs',
  )
  assert.equal(
    adityaBirlaCapital.buildApplyUrl('abg107672'),
    'https://abgcareers.peoplestrong.com/job/detail/abg107672?source=ABCCareers&subsource=ABCCareer-Jobs',
  )
  assert.equal(
    adityaBirlaCapital.extractResumeHandoffUrl(jobsPageHtml),
    'https://abgcareers.peoplestrong.com/register',
  )
  assert.equal(adityaBirlaCapital.hasOfficialCareersPageSignals(careersPageHtml), true)
  assert.equal(adityaBirlaCapital.hasOfficialJobsPageSignals(jobsPageHtml), true)
  assert.deepEqual(
    adityaBirlaCapital.extractServerRenderedDetailUrls(jobsPageHtml),
    [
      'https://www.adityabirlacapital.com/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975',
    ],
  )
})

test('extractSearchResults maps the first-party Aditya Birla Capital jobs payload into the shared job shape', async () => {
  const adityaBirlaCapital = await loadModule()

  const jobs = adityaBirlaCapital.extractSearchResults(pageZeroPayload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Valuation Officer',
    company: 'Aditya Birla Capital',
    department: 'Sales',
    businessLine: 'Retail',
    team: 'Sales',
    location: 'Varanasi, India',
    city: 'Varanasi',
    country: 'India',
    sourceUrl: 'https://www.adityabirlacapital.com/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975',
    applyUrl: 'https://abccareers.iona.ai/job-details/referral/abcl_job-33975?source=ABCCareers&subsource=ABCCareer-Jobs',
    jobId: 'abcl_job-33975',
    requisitionId: 'abcl_job-33975',
    employmentType: null,
    experienceRequired: '0 - 4 years',
    postingDate: '2026-06-30T18:30:00Z',
    closingDate: '2026-09-27T18:30:00Z',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    jobDescription: null,
    remoteStatus: null,
  })
  assert.deepEqual(jobs[1], {
    title: 'Branch Manager - Retail Gold Loan - Merta City',
    company: 'Aditya Birla Capital',
    department: 'Sales',
    businessLine: 'Aditya Birla Capital Limited',
    team: 'Retail - Gold Loan',
    location: 'Merta City, Rajasthan, India',
    city: 'Merta City',
    country: 'India',
    sourceUrl: 'https://www.adityabirlacapital.com/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/branch-manager-retail-gold-loan-merta-city-retail-gold-loan-in-rajasthan-jobs-abg107672',
    applyUrl: 'https://abgcareers.peoplestrong.com/job/detail/abg107672?source=ABCCareers&subsource=ABCCareer-Jobs',
    jobId: 'abg107672',
    requisitionId: 'abg107672',
    employmentType: null,
    experienceRequired: '1 - 15 years',
    postingDate: '2026-07-02T18:30:00Z',
    closingDate: '2027-01-05T18:30:00Z',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    jobDescription: null,
    remoteStatus: null,
  })
})

test('Aditya Birla Capital detail-page helpers decode both verified public apply handoffs', async () => {
  const adityaBirlaCapital = await loadModule()

  assert.equal(adityaBirlaCapital.hasOfficialJobDetailSignals(ionaDetailHtml), true)
  assert.equal(adityaBirlaCapital.hasOfficialJobDetailSignals(peopleStrongDetailHtml), true)
  assert.equal(
    adityaBirlaCapital.extractApplyUrlFromDetailHtml(ionaDetailHtml),
    'https://abccareers.iona.ai/job-details/referral/abcl_job-33975?source=ABCCareers&subsource=ABCCareer-Jobs',
  )
  assert.equal(
    adityaBirlaCapital.extractApplyUrlFromDetailHtml(peopleStrongDetailHtml),
    'https://abgcareers.peoplestrong.com/job/detail/abg107672?source=ABCCareers&subsource=ABCCareer-Jobs',
  )
})

test('run validates the official Aditya Birla Capital careers surfaces and decorates jobs for the shared runner', async () => {
  const adityaBirlaCapital = await loadModule()
  const textRequests = []
  const jsonRequests = []

  const jobs = await adityaBirlaCapital.createAdityaBirlaCapitalScraper({
    now: () => '2026-07-14T09:30:00.000Z',
  }).run({
    maxPages: 1,
    fetchText: async (url) => {
      textRequests.push(url)

      if (url === adityaBirlaCapital.CAREERS_PAGE_URL) return careersPageHtml
      if (url === adityaBirlaCapital.JOBS_PAGE_URL) return jobsPageHtml
      if (url === adityaBirlaCapital.buildDetailUrl(pageZeroPayload.Results[0].Url)) return ionaDetailHtml
      if (url === adityaBirlaCapital.buildDetailUrl(pageZeroPayload.Results[1].Url)) return peopleStrongDetailHtml

      throw new Error(`Unexpected Aditya Birla Capital text URL: ${url}`)
    },
    fetchJson: async (url) => {
      jsonRequests.push(url)
      return pageZeroPayload
    },
  })

  assert.deepEqual(textRequests, [
    'https://www.adityabirlacapital.com/careers',
    'https://www.adityabirlacapital.com/careers/jobs',
    'https://www.adityabirlacapital.com/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/valuation-officer-sales-in-varanasi-jobs-abcl_job-33975',
    'https://www.adityabirlacapital.com/careers/sitecore/content/abcl/abcareers/home/jobs/job-details/branch-manager-retail-gold-loan-merta-city-retail-gold-loan-in-rajasthan-jobs-abg107672',
  ])
  assert.deepEqual(jsonRequests, [
    'https://www.adityabirlacapital.com/careers/jobs?blogAjax=1&jobTitle=&location=&businessline=&function=&experience=&page=0',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'adityabirlacapital')
  assert.equal(jobs[0].company, 'Aditya Birla Capital')
  assert.equal(
    jobs[0].link,
    'https://abccareers.iona.ai/job-details/referral/abcl_job-33975?source=ABCCareers&subsource=ABCCareer-Jobs',
  )
  assert.equal(
    jobs[1].link,
    'https://abgcareers.peoplestrong.com/job/detail/abg107672?source=ABCCareers&subsource=ABCCareer-Jobs',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-14T09:30:00.000Z')
  assert.equal(jobs[1].scrapedAt, '2026-07-14T09:30:00.000Z')
})

test('Aditya Birla Capital fails closed when the verified public apply handoff drifts', async () => {
  const adityaBirlaCapital = await loadModule()

  await assert.rejects(
    adityaBirlaCapital.createAdityaBirlaCapitalScraper().run({
      maxPages: 1,
      fetchText: async (url) => {
        if (url === adityaBirlaCapital.CAREERS_PAGE_URL) return careersPageHtml
        if (url === adityaBirlaCapital.JOBS_PAGE_URL) return jobsPageHtml
        if (url === adityaBirlaCapital.buildDetailUrl(pageZeroPayload.Results[0].Url)) {
          return ionaDetailHtml.replace(
            'https://abccareers.iona.ai/job-details/referral/abcl_job-33975?source=ABCCareers&amp;subsource=ABCCareer-Jobs',
            'https://example.com/job-details/referral/abcl_job-33975',
          )
        }
        if (url === adityaBirlaCapital.buildDetailUrl(pageZeroPayload.Results[1].Url)) {
          return peopleStrongDetailHtml
        }

        throw new Error(`Unexpected Aditya Birla Capital text URL: ${url}`)
      },
      fetchJson: async () => pageZeroPayload,
    }),
    /verified apply handoff/i,
  )
})
