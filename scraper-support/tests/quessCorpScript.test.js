import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Quess Careers</title>
  </head>
  <body>
    <main>
      <a href="https://www.quesscorp.com/">About Quess</a>
      <h1>Opportunity to be the best version of yourself</h1>
      <a href="https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions">
        Search for jobs
      </a>
      <a href="https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions">
        Jobs
      </a>
    </main>
  </body>
</html>
`

const OFFICIAL_CANDIDATE_EXPERIENCE_HTML = `
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta property="og:title" content="Quess Career site Careers" />
    <meta property="og:description" content="Join Our Team" />
    <meta property="og:site_name" content="Quess Career site" />
    <title>Quess Career site</title>
    <base
      href="/hcmUI/CandidateExperience/en/sites/CX_1"
      data-apibaseurl="https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com:443"
      data-sitenumber="CX_1"
    />
  </head>
  <body>
    <div id="jobSearchPage">Search Quess jobs</div>
  </body>
</html>
`

const LISTING_PAYLOAD = {
  items: [{
    Limit: 24,
    TotalJobsCount: 2421,
    SiteNumber: 'CX_1',
    organizationsFacet: [
      { Id: 1, Name: 'Quess Enterprise', TotalCount: 1185 },
      { Id: 300000003435595, Name: 'Quess IT Staffing', TotalCount: 185 },
    ],
    workplaceTypesFacet: [
      { Id: 'ORA_ON_SITE', Name: 'On-site', TotalCount: 2361 },
      { Id: 'ORA_HYBRID', Name: 'Hybrid', TotalCount: 25 },
    ],
    requisitionList: [
      {
        Id: '12103',
        Title: 'Consultant - Recruitment',
        PostedDate: '2026-07-14',
        PostingEndDate: null,
        Language: 'US',
        PrimaryLocationCountry: 'IN',
        JobFamily: null,
        JobFunction: null,
        WorkerType: null,
        ContractType: null,
        JobSchedule: null,
        JobType: null,
        StudyLevel: null,
        Department: null,
        Organization: null,
        ShortDescriptionStr: '',
        PrimaryLocation: 'Bangalore, Karnataka, India',
        WorkplaceType: 'On-site',
        ExternalQualificationsStr: null,
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
      {
        Id: '99999',
        Title: 'US-only Role',
        PostedDate: '2026-07-14',
        PostingEndDate: null,
        Language: 'US',
        PrimaryLocationCountry: 'US',
        JobFamily: 'Operations',
        JobFunction: 'Operations',
        WorkerType: null,
        ContractType: null,
        JobSchedule: 'Full time',
        JobType: null,
        StudyLevel: null,
        Department: null,
        Organization: null,
        ShortDescriptionStr: 'Should be filtered out.',
        PrimaryLocation: 'Atlanta, Georgia, United States',
        WorkplaceType: 'Remote',
        ExternalQualificationsStr: null,
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
    ],
  }],
}

const DETAIL_PAYLOAD = {
  items: [{
    Id: '12103',
    Title: 'Consultant - Recruitment',
    Category: 'Business Delivery',
    RequisitionType: 'Permanent',
    ExternalPostedStartDate: '2026-07-14T15:20:20+00:00',
    JobSchedule: 'Full time',
    StudyLevel: 'Some College',
    ContractType: null,
    ExternalPostedEndDate: null,
    ExternalDescriptionStr: '',
    ShortDescriptionStr: '',
    PrimaryLocation: 'Bangalore, Karnataka, India',
    PrimaryLocationCountry: 'IN',
    ExternalQualificationsStr: '',
    ExternalResponsibilitiesStr: '',
    WorkplaceType: 'On-site',
    Department: null,
    JobFunction: 'Managerial',
    secondaryLocations: [],
    skills: [],
    workLocation: [{
      LocationId: 300001823959957,
      LocationName: 'Quess Tower - Sky Walk Avenue - Bangalore',
      TownOrCity: 'Bangalore',
      PostalCode: '560068',
      Country: 'IN',
      Region1: null,
      Region2: 'Karnataka',
      Region3: null,
    }],
    otherWorkLocations: [],
  }],
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/quesscorp/script.js')
  } catch {
    assert.fail('Expected Quess Corp scraper module at ../../scraper/quesscorp/script.js')
  }
}

test('Quess Corp keeps the verified first-party careers handoff and Oracle candidate shell pinned', async () => {
  const quessCorp = await loadScriptModule()

  assert.equal(quessCorp.SOURCE, 'quesscorp')
  assert.equal(quessCorp.COMPANY_NAME, 'Quess Corp')
  assert.equal(quessCorp.OFFICIAL_BRAND_NAME, 'Quess Corp')
  assert.equal(quessCorp.VERIFIED_AT, '2026-07-17')
  assert.equal(quessCorp.HOMEPAGE_URL, 'https://www.quesscorp.com/')
  assert.equal(quessCorp.OFFICIAL_CAREERS_URL, 'https://careers.quesscorp.com/')
  assert.equal(
    quessCorp.OFFICIAL_JOBS_HANDOFF_URL,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions',
  )
  assert.equal(
    quessCorp.CANDIDATE_EXPERIENCE_URL,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(quessCorp.WORKSPACE_DOMAIN, 'fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com')
  assert.equal(quessCorp.SITE_NUMBER, 'CX_1')
  assert.equal(quessCorp.hasOfficialCareersPageSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(
    quessCorp.hasOfficialCandidateExperienceSignal(OFFICIAL_CANDIDATE_EXPERIENCE_HTML),
    true,
  )
  assert.equal(quessCorp.hasVerifiedQuessListingSignal(LISTING_PAYLOAD), true)
})

test('Quess Corp keeps Oracle finder, detail, and public job URLs pinned to the verified CX_1 surface', async () => {
  const quessCorp = await loadScriptModule()

  assert.equal(
    quessCorp.buildSearchUrl(),
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    quessCorp.buildSearchUrl({ page: 2, limit: 10 }),
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=India',
  )
  assert.equal(
    quessCorp.buildJobDetailUrl('12103'),
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12103',
  )
  assert.equal(
    quessCorp.buildJobDetailApiUrl('12103'),
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2212103%22,siteNumber=CX_1',
  )
})

test('extractSearchResults and extractJobDetail normalize Quess Corp Oracle requisitions', async () => {
  const quessCorp = await loadScriptModule()
  const listings = quessCorp.extractSearchResults(LISTING_PAYLOAD)

  assert.deepEqual(listings, [{
    title: 'Consultant - Recruitment',
    company: 'Quess Corp',
    department: null,
    location: 'Bangalore, Karnataka, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '12103',
    requisitionId: '12103',
    sourceUrl: 'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12103',
    applyUrl: 'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12103',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-14',
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
    siteNumber: 'CX_1',
  }])

  const detail = quessCorp.extractJobDetail(DETAIL_PAYLOAD, listings[0])

  assert.deepEqual(detail, {
    title: 'Consultant - Recruitment',
    company: 'Quess Corp',
    department: 'Managerial',
    location: 'Bangalore, Karnataka, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '12103',
    requisitionId: '12103',
    sourceUrl: 'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12103',
    applyUrl: 'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12103',
    employmentType: 'Full time',
    experienceRequired: null,
    minimumQualification: 'Some College',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-14',
    closingDate: null,
    jobDescription: null,
    remoteStatus: 'On-site',
    siteNumber: 'CX_1',
  })
})

test('run verifies the official careers handoff, Oracle shell, and Quess listing contract before calling the public detail API', async () => {
  const quessCorp = await loadScriptModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await quessCorp.createQuessCorpScraper({
    maxPages: 1,
    maxJobs: 1,
    now: () => '2026-07-17T00:00:00.000Z',
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === quessCorp.OFFICIAL_CAREERS_URL) return OFFICIAL_CAREERS_HTML
      if (url === quessCorp.CANDIDATE_EXPERIENCE_URL) return OFFICIAL_CANDIDATE_EXPERIENCE_HTML
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === quessCorp.buildSearchUrl()) return LISTING_PAYLOAD
      if (url === quessCorp.buildJobDetailApiUrl('12103')) return DETAIL_PAYLOAD
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedTextUrls, [
    quessCorp.OFFICIAL_CAREERS_URL,
    quessCorp.CANDIDATE_EXPERIENCE_URL,
  ])
  assert.deepEqual(requestedJsonUrls, [
    quessCorp.buildSearchUrl(),
    quessCorp.buildJobDetailApiUrl('12103'),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'quesscorp')
  assert.equal(jobs[0].company, 'Quess Corp')
  assert.equal(
    jobs[0].link,
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/12103',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-17T00:00:00.000Z')
})

test('run fails closed when the Quess first-party handoff, Oracle shell, or listing contract drifts materially', async () => {
  const quessCorp = await loadScriptModule()

  await assert.rejects(
    quessCorp.createQuessCorpScraper({
      fetchText: async (url) => {
        if (url === quessCorp.OFFICIAL_CAREERS_URL) {
          return OFFICIAL_CAREERS_HTML.replace('Search for jobs', 'Browse roles')
        }
        return OFFICIAL_CANDIDATE_EXPERIENCE_HTML
      },
      fetchJson: async () => LISTING_PAYLOAD,
    }).run(),
    /verified official Quess careers page/i,
  )

  await assert.rejects(
    quessCorp.createQuessCorpScraper({
      fetchText: async (url) => {
        if (url === quessCorp.OFFICIAL_CAREERS_URL) return OFFICIAL_CAREERS_HTML
        return OFFICIAL_CANDIDATE_EXPERIENCE_HTML.replace('data-sitenumber="CX_1"', 'data-sitenumber="CX_2"')
      },
      fetchJson: async () => LISTING_PAYLOAD,
    }).run(),
    /verified Oracle candidate experience page/i,
  )

  await assert.rejects(
    quessCorp.createQuessCorpScraper({
      fetchText: async (url) => {
        if (url === quessCorp.OFFICIAL_CAREERS_URL) return OFFICIAL_CAREERS_HTML
        return OFFICIAL_CANDIDATE_EXPERIENCE_HTML
      },
      fetchJson: async (url) => {
        if (url === quessCorp.buildSearchUrl()) {
          return {
            ...LISTING_PAYLOAD,
            items: [{
              ...LISTING_PAYLOAD.items[0],
              organizationsFacet: [{ Id: 1, Name: 'Other Company', TotalCount: 2421 }],
            }],
          }
        }
        return DETAIL_PAYLOAD
      },
    }).run(),
    /verified Quess listing contract/i,
  )
})
