import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at eClerx | Technology, Analytics &amp; Digital Jobs Worldwide</title>
    <link rel="canonical" href="https://eclerx.com/careers/" />
  </head>
  <body>
    <main>
      <h1>Careers at eClerx</h1>
      <p>Explore career opportunities at eClerx across technology, analytics, digital, financial markets, customer operations and more.</p>
      <a href="/job-portal" class="exploreMoreBTN" navigationarea="banner">Explore jobs</a>
    </main>
  </body>
</html>
`

const officialJobPortalHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Current Job Openings at eClerx | Search &amp; Apply Online</title>
  </head>
  <body>
    <main>
      <h1>Job portal</h1>
      <p>From first jobs to leadership roles, find your next move.</p>
      <a href="https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs">Explore jobs</a>
      <section>
        <h2>Select your region to apply</h2>
        <a href="https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?location=Chandigarh%2C+India&locationId=300000038318635&locationLevel=state&mode=location">Chandigarh</a>
        <a href="https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?location=Mumbai%2C+Maharashtra%2C+India&locationId=300000038318632&locationLevel=state&mode=location">Mumbai</a>
        <a href="https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?location=Pune%2C+Maharashtra%2C+India&locationId=300000038318634&locationLevel=state&mode=location">Pune</a>
      </section>
      <a href="https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/">Upload resume</a>
    </main>
  </body>
</html>
`

const officialCandidateExperienceHtml = `
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta property="og:title" content="eClerx Career Site Careers" />
    <meta property="og:site_name" content="eClerx Career Site" />
    <title>eClerx Career Site</title>
    <base
      href="/hcmUI/CandidateExperience/en/sites/CX_1"
      data-apibaseurl="https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com:443"
      data-sitenumber="CX_1"
    />
  </head>
  <body>
    <div class="app" data-bind="view: 'layout'"></div>
  </body>
</html>
`

const listingPayload = {
  items: [{
    Limit: 24,
    TotalJobsCount: 261,
    SiteNumber: 'CX_1',
    Location: 'India',
    requisitionList: [
      {
        Id: '81338',
        Title: 'Analyst',
        PostedDate: '2026-07-14',
        PostingEndDate: '2026-09-29T18:30:00+00:00',
        PrimaryLocationCountry: 'IN',
        PrimaryLocation: 'Chandigarh, India',
        JobFunction: 'Operations',
        Department: null,
        Category: null,
        JobFamily: null,
        JobSchedule: null,
        WorkplaceType: '',
        StudyLevel: null,
        ExternalQualificationsStr: null,
        ShortDescriptionStr: 'Support client operations with analytics-led execution.',
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
      {
        Id: '83313',
        Title: 'Senior Analyst',
        PostedDate: '2026-07-14',
        PostingEndDate: null,
        PrimaryLocationCountry: 'IN',
        PrimaryLocation: 'Mumbai, Maharashtra, India',
        JobFunction: 'Operations',
        Department: null,
        Category: null,
        JobFamily: null,
        JobSchedule: null,
        WorkplaceType: '',
        StudyLevel: null,
        ExternalQualificationsStr: null,
        ShortDescriptionStr: 'Lead process improvement across client workflows.',
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
      {
        Id: '70001',
        Title: 'Associate Process Manager',
        PostedDate: '2026-07-10',
        PostingEndDate: null,
        PrimaryLocationCountry: 'US',
        PrimaryLocation: 'New York, New York, United States',
        JobFunction: 'Operations',
        Department: null,
        Category: null,
        JobFamily: null,
        JobSchedule: null,
        WorkplaceType: '',
        StudyLevel: null,
        ExternalQualificationsStr: null,
        ShortDescriptionStr: 'United States role only.',
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
    ],
  }],
}

const detailPayload = {
  items: [{
    Id: '81338',
    Title: 'Analyst',
    Category: null,
    RequisitionType: 'New Position - Budgeted',
    ExternalPostedStartDate: '2026-07-14T02:57:27+00:00',
    ExternalPostedEndDate: '2026-09-29T18:30:00+00:00',
    JobSchedule: 'Full time',
    StudyLevel: "Bachelor's Degree",
    ExternalDescriptionStr: `
      <ul>
        <li>Support operational workflows for global clients.</li>
        <li>Translate business requirements into accurate delivery outputs.</li>
      </ul>
    `,
    ShortDescriptionStr: 'Support client operations with analytics-led execution.',
    ExternalResponsibilitiesStr: 'Coordinate across stakeholders and maintain process quality.',
    PrimaryLocation: 'Chandigarh, India',
    PrimaryLocationCountry: 'IN',
    WorkplaceType: '',
    ExternalQualificationsStr: '',
    JobFunction: 'Operations',
    Department: null,
    JobFamily: null,
    secondaryLocations: [],
    skills: [],
  }],
}

const loadEclerxModule = async () => {
  try {
    return await import('../eclerx/script.js')
  } catch {
    assert.fail('Expected eClerx scraper module at ../eclerx/script.js')
  }
}

test('eClerx helpers keep the verified first-party pages and Oracle candidate experience surface stable', async () => {
  const eclerx = await loadEclerxModule()

  assert.equal(eclerx.SOURCE, 'eclerx')
  assert.equal(eclerx.COMPANY_NAME, 'eClerx')
  assert.equal(eclerx.COMPANY_DOMAIN, 'eclerx.com')
  assert.equal(eclerx.VERIFIED_AT, '2026-07-15')
  assert.equal(eclerx.OFFICIAL_CAREERS_URL, 'https://eclerx.com/careers/')
  assert.equal(eclerx.JOB_PORTAL_URL, 'https://eclerx.com/job-portal/')
  assert.equal(
    eclerx.CANDIDATE_EXPERIENCE_URL,
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(eclerx.WORKSPACE_DOMAIN, 'fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com')
  assert.equal(eclerx.SITE_NUMBER, 'CX_1')
  assert.equal(eclerx.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(eclerx.hasOfficialJobPortalSignal(officialJobPortalHtml), true)
  assert.equal(eclerx.hasOfficialCandidateExperienceSignal(officialCandidateExperienceHtml), true)
})

test('eClerx keeps search and detail URLs on the verified Oracle Cloud surface with India scoping', async () => {
  const eclerx = await loadEclerxModule()

  assert.equal(
    eclerx.buildSearchUrl(),
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    eclerx.buildSearchUrl({ page: 2, limit: 10 }),
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=India',
  )
  assert.equal(
    eclerx.buildJobDetailUrl('81338'),
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/81338',
  )
  assert.equal(
    eclerx.buildJobDetailApiUrl('81338'),
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2281338%22,siteNumber=CX_1',
  )
})

test('extractSearchResults keeps only India requisitions and normalizes eClerx listings', async () => {
  const eclerx = await loadEclerxModule()
  const jobs = eclerx.extractSearchResults(listingPayload)

  assert.deepEqual(jobs, [
    {
      title: 'Analyst',
      company: 'eClerx',
      department: 'Operations',
      location: 'Chandigarh, India',
      city: 'Chandigarh',
      country: 'India',
      jobId: '81338',
      requisitionId: '81338',
      sourceUrl: 'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/81338',
      applyUrl: 'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/81338',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-14',
      closingDate: '2026-09-29',
      jobDescription: 'Support client operations with analytics-led execution.',
      remoteStatus: null,
      siteNumber: 'CX_1',
    },
    {
      title: 'Senior Analyst',
      company: 'eClerx',
      department: 'Operations',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      country: 'India',
      jobId: '83313',
      requisitionId: '83313',
      sourceUrl: 'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/83313',
      applyUrl: 'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/83313',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-14',
      closingDate: null,
      jobDescription: 'Lead process improvement across client workflows.',
      remoteStatus: null,
      siteNumber: 'CX_1',
    },
  ])
})

test('extractJobDetail enriches eClerx requisitions from the public Oracle detail API', async () => {
  const eclerx = await loadEclerxModule()
  const listing = eclerx.extractSearchResults(listingPayload)[0]
  const detail = eclerx.extractJobDetail(detailPayload, listing)

  assert.equal(detail.title, 'Analyst')
  assert.equal(detail.company, 'eClerx')
  assert.equal(detail.department, 'Operations')
  assert.equal(detail.location, 'Chandigarh, India')
  assert.equal(detail.city, 'Chandigarh')
  assert.equal(detail.country, 'India')
  assert.equal(detail.jobId, '81338')
  assert.equal(detail.requisitionId, '81338')
  assert.equal(
    detail.applyUrl,
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/81338',
  )
  assert.equal(detail.employmentType, 'Full time')
  assert.equal(detail.minimumQualification, "Bachelor's Degree")
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, [])
  assert.equal(detail.postingDate, '2026-07-14')
  assert.equal(detail.closingDate, '2026-09-29')
  assert.match(detail.jobDescription, /Support operational workflows/i)
  assert.match(detail.jobDescription, /maintain process quality/i)
})

test('run verifies the first-party careers handoff before calling the public eClerx Oracle APIs', async () => {
  const eclerx = await loadEclerxModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await eclerx.createEclerxScraper({
    maxPages: 1,
    maxJobs: 1,
    now: () => '2026-07-15T00:00:00.000Z',
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === eclerx.OFFICIAL_CAREERS_URL) return officialCareersHtml
      if (url === eclerx.JOB_PORTAL_URL) return officialJobPortalHtml
      if (url === eclerx.CANDIDATE_EXPERIENCE_URL) return officialCandidateExperienceHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === eclerx.buildSearchUrl()) return listingPayload
      if (url === eclerx.buildJobDetailApiUrl('81338')) return detailPayload
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedTextUrls, [
    eclerx.OFFICIAL_CAREERS_URL,
    eclerx.JOB_PORTAL_URL,
    eclerx.CANDIDATE_EXPERIENCE_URL,
  ])
  assert.deepEqual(requestedJsonUrls, [
    eclerx.buildSearchUrl(),
    eclerx.buildJobDetailApiUrl('81338'),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'eclerx')
  assert.equal(jobs[0].company, 'eClerx')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-15T00:00:00.000Z')
})

test('run fails closed when the verified eClerx pages or Oracle shell drift materially', async () => {
  const eclerx = await loadEclerxModule()

  await assert.rejects(
    eclerx.createEclerxScraper({
      fetchText: async (url) => {
        if (url === eclerx.OFFICIAL_CAREERS_URL) {
          return officialCareersHtml.replace('Explore jobs', 'Browse roles')
        }
        if (url === eclerx.JOB_PORTAL_URL) return officialJobPortalHtml
        return officialCandidateExperienceHtml
      },
      fetchJson: async () => listingPayload,
    }).run(),
    /verified eClerx careers landing page/i,
  )

  await assert.rejects(
    eclerx.createEclerxScraper({
      fetchText: async (url) => {
        if (url === eclerx.OFFICIAL_CAREERS_URL) return officialCareersHtml
        if (url === eclerx.JOB_PORTAL_URL) {
          return officialJobPortalHtml.replace(
            'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
            'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2/jobs',
          )
        }
        return officialCandidateExperienceHtml
      },
      fetchJson: async () => listingPayload,
    }).run(),
    /verified eClerx job portal page/i,
  )

  await assert.rejects(
    eclerx.createEclerxScraper({
      fetchText: async (url) => {
        if (url === eclerx.OFFICIAL_CAREERS_URL) return officialCareersHtml
        if (url === eclerx.JOB_PORTAL_URL) return officialJobPortalHtml
        return officialCandidateExperienceHtml.replace('data-sitenumber="CX_1"', 'data-sitenumber="CX_2"')
      },
      fetchJson: async () => listingPayload,
    }).run(),
    /verified Oracle candidate experience page/i,
  )
})
