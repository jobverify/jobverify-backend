import assert from 'node:assert/strict'
import test from 'node:test'

const loadDpWorldModule = async () => {
  try {
    return await import('../../scraper/dpworld/script.js')
  } catch {
    assert.fail('Expected DP World scraper module at ../../scraper/dpworld/script.js')
  }
}

const officialCorporateCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>DP World Careers & Jobs | DP World Recruitment | DP World</title>
  </head>
  <body>
    <main>
      <h1>CAREERS</h1>
      <p>Join DP World and help shape the future of global trade.</p>
      <a href="https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs">
        View All Vacancies
      </a>
    </main>
  </body>
</html>
`

const officialCandidateExperienceHtml = `
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta property="og:title" content="DP World Careers" />
    <meta property="og:site_name" content="DP World" />
    <title>DP World</title>
    <base href="/hcmUI/CandidateExperience/en/sites/CX_1" />
    <script data-cx-config>
      var CX_CONFIG = {
        app: {
          apiBaseUrl: 'https://ehpv.fa.em2.oraclecloud.com:443',
          siteName: 'DP World',
          siteCode: 'CX_1',
          siteNumber: 'CX_1'
        }
      };
    </script>
  </head>
  <body>
    <div class="app" data-bind="view: 'layout'"></div>
  </body>
</html>
`

const listingPayload = {
  items: [{
    Limit: 24,
    TotalJobsCount: 133,
    SiteNumber: 'CX_1',
    Location: 'India',
    requisitionList: [
      {
        Id: '24391',
        Title: 'Group Senior Product Support Engineer',
        PostedDate: '2026-07-14',
        PostingEndDate: null,
        PrimaryLocationCountry: 'IN',
        PrimaryLocation: 'Gurgaon, Haryana, India',
        JobFunction: null,
        Department: null,
        Category: null,
        JobFamily: null,
        JobSchedule: null,
        WorkplaceType: '',
        StudyLevel: null,
        ExternalQualificationsStr: null,
        ShortDescriptionStr:
          'As the Senior Product Support Engineer, you will own the customer relationship during and after the onboarding phase.',
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
      {
        Id: '17335',
        Title: 'MCV Technical Superintendent',
        PostedDate: '2026-07-13',
        PostingEndDate: null,
        PrimaryLocationCountry: 'AE',
        PrimaryLocation: 'Dubai, United Arab Emirates',
        JobFunction: null,
        Department: null,
        Category: null,
        JobFamily: null,
        JobSchedule: null,
        WorkplaceType: '',
        StudyLevel: null,
        ExternalQualificationsStr: null,
        ShortDescriptionStr: 'This UAE-only role should be filtered out.',
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
    ],
  }],
}

const detailPayload = {
  items: [{
    Id: '24391',
    Title: 'Group Senior Product Support Engineer',
    Category: null,
    RequisitionType: 'New Position - Budgeted',
    ExternalPostedStartDate: '2026-07-14T05:11:25+00:00',
    ExternalPostedEndDate: '2026-07-29T18:30:00+00:00',
    JobSchedule: 'Full time',
    StudyLevel: "Bachelor's Degree",
    ExternalDescriptionStr: `
      <ul>
        <li>Lead the customer onboarding journey from internal handoff through implementation.</li>
        <li>Use SQL and Office tools to support customer success outcomes.</li>
      </ul>
    `,
    ShortDescriptionStr:
      'As the Senior Product Support Engineer, you will own the customer relationship during and after the onboarding phase.',
    PrimaryLocation: 'Gurgaon, Haryana, India',
    PrimaryLocationCountry: 'IN',
    WorkplaceType: '',
    ExternalQualificationsStr: '',
    ExternalResponsibilitiesStr: '',
    JobFunction: null,
    Department: null,
    JobFamily: null,
    secondaryLocations: [],
    skills: [],
  }],
}

test('DP World helpers keep the verified first-party careers shell and Oracle candidate experience surface stable', async () => {
  const dpWorld = await loadDpWorldModule()

  assert.equal(dpWorld.SOURCE, 'dpworld')
  assert.equal(dpWorld.COMPANY_NAME, 'DP World')
  assert.equal(dpWorld.COMPANY_DOMAIN, 'dpworld.com')
  assert.equal(dpWorld.VERIFIED_AT, '2026-07-15')
  assert.equal(dpWorld.HOMEPAGE_URL, 'https://www.dpworld.com/en')
  assert.equal(dpWorld.CORPORATE_CAREERS_URL, 'https://www.dpworld.com/en/careers')
  assert.equal(
    dpWorld.CANDIDATE_EXPERIENCE_URL,
    'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(dpWorld.WORKSPACE_DOMAIN, 'ehpv.fa.em2.oraclecloud.com')
  assert.equal(dpWorld.SITE_NUMBER, 'CX_1')
  assert.equal(dpWorld.hasOfficialCorporateCareersSignal(officialCorporateCareersHtml), true)
  assert.equal(dpWorld.hasOfficialCandidateExperienceSignal(officialCandidateExperienceHtml), true)
})

test('DP World keeps search and detail URLs on the verified public Oracle Cloud surface with India scoping', async () => {
  const dpWorld = await loadDpWorldModule()

  assert.equal(
    dpWorld.buildSearchUrl(),
    'https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    dpWorld.buildSearchUrl({ page: 2, limit: 10 }),
    'https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=India',
  )
  assert.equal(
    dpWorld.buildJobDetailUrl('24391'),
    'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/24391',
  )
  assert.equal(
    dpWorld.buildJobDetailApiUrl('24391'),
    'https://ehpv.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2224391%22,siteNumber=CX_1',
  )
})

test('extractSearchResults keeps only India requisitions and normalizes DP World listings', async () => {
  const dpWorld = await loadDpWorldModule()
  const jobs = dpWorld.extractSearchResults(listingPayload)

  assert.deepEqual(jobs, [{
    title: 'Group Senior Product Support Engineer',
    company: 'DP World',
    department: null,
    location: 'Gurgaon, Haryana, India',
    city: 'Gurgaon',
    country: 'India',
    jobId: '24391',
    requisitionId: '24391',
    sourceUrl: 'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/24391',
    applyUrl: 'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/24391',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-14',
    closingDate: null,
    jobDescription:
      'As the Senior Product Support Engineer, you will own the customer relationship during and after the onboarding phase.',
    remoteStatus: null,
    siteNumber: 'CX_1',
  }])
})

test('extractJobDetail enriches DP World requisitions from the public Oracle detail API', async () => {
  const dpWorld = await loadDpWorldModule()
  const listing = dpWorld.extractSearchResults(listingPayload)[0]
  const detail = dpWorld.extractJobDetail(detailPayload, listing)

  assert.equal(detail.title, 'Group Senior Product Support Engineer')
  assert.equal(detail.company, 'DP World')
  assert.equal(detail.department, null)
  assert.equal(detail.location, 'Gurgaon, Haryana, India')
  assert.equal(detail.city, 'Gurgaon')
  assert.equal(detail.country, 'India')
  assert.equal(detail.jobId, '24391')
  assert.equal(detail.requisitionId, '24391')
  assert.equal(
    detail.applyUrl,
    'https://ehpv.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/24391',
  )
  assert.equal(detail.employmentType, 'Full time')
  assert.equal(detail.minimumQualification, "Bachelor's Degree")
  assert.equal(detail.preferredQualification, null)
  assert.deepEqual(detail.requiredSkills, [])
  assert.equal(detail.postingDate, '2026-07-14')
  assert.equal(detail.closingDate, '2026-07-29')
  assert.match(detail.jobDescription, /Lead the customer onboarding journey/i)
  assert.match(detail.jobDescription, /SQL and Office tools/i)
})

test('run verifies the official careers handoff before calling the public DP World Oracle APIs', async () => {
  const dpWorld = await loadDpWorldModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await dpWorld.createDpWorldScraper({
    maxPages: 1,
    maxJobs: 1,
    now: () => '2026-07-15T00:00:00.000Z',
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === dpWorld.CORPORATE_CAREERS_URL) return officialCorporateCareersHtml
      if (url === dpWorld.CANDIDATE_EXPERIENCE_URL) return officialCandidateExperienceHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === dpWorld.buildSearchUrl()) return listingPayload
      if (url === dpWorld.buildJobDetailApiUrl('24391')) return detailPayload
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedTextUrls, [
    dpWorld.CORPORATE_CAREERS_URL,
    dpWorld.CANDIDATE_EXPERIENCE_URL,
  ])
  assert.deepEqual(requestedJsonUrls, [
    dpWorld.buildSearchUrl(),
    dpWorld.buildJobDetailApiUrl('24391'),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'dpworld')
  assert.equal(jobs[0].company, 'DP World')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-15T00:00:00.000Z')
})

test('run fails closed when the verified DP World careers page or Oracle candidate experience shell drifts materially', async () => {
  const dpWorld = await loadDpWorldModule()

  await assert.rejects(
    dpWorld.createDpWorldScraper({
      fetchText: async (url) => {
        if (url === dpWorld.CORPORATE_CAREERS_URL) {
          return officialCorporateCareersHtml.replace('View All Vacancies', 'Browse Roles')
        }
        return officialCandidateExperienceHtml
      },
      fetchJson: async () => listingPayload,
    }).run(),
    /verified official DP World careers page/i,
  )

  await assert.rejects(
    dpWorld.createDpWorldScraper({
      fetchText: async (url) => {
        if (url === dpWorld.CORPORATE_CAREERS_URL) return officialCorporateCareersHtml
        return officialCandidateExperienceHtml.replace("siteNumber: 'CX_1'", "siteNumber: 'CX_2'")
      },
      fetchJson: async () => listingPayload,
    }).run(),
    /verified Oracle candidate experience page/i,
  )
})
