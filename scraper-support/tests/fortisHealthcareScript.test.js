import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Fortis | Fortis Healthcare</title>
    <link rel="canonical" href="https://www.fortishealthcare.com/careers-at-Fortis-basic" />
  </head>
  <body>
    <main>
      <h1>Careers at Fortis</h1>
      <h2>Healthcare for Good</h2>
      <h2>Today. Tomorrow. Always</h2>
      <p>At Fortis, our vision is to create a world-class integrated healthcare delivery system in India, entailing the finest medical skills combined with compassionate patient care.</p>
      <p>Empowered by our values, patient centricity, teamwork, ownership, innovation and integrity, we are transforming care across our hospital network.</p>
      <section>
        <h3>Explore Opportunities</h3>
        <h3>Clinicians</h3>
        <a href="https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?lastSelectedFacet=CATEGORIES&selectedCategoriesFacet=300000787441924">Click Here to Apply</a>
        <h3>Nursing</h3>
        <a href="https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?lastSelectedFacet=CATEGORIES&selectedCategoriesFacet=300000787442029">Click Here to Apply</a>
        <h3>Paramedical</h3>
        <a href="https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?lastSelectedFacet=CATEGORIES&selectedCategoriesFacet=300000787442090">Click Here to Apply</a>
        <h3>Medical Support</h3>
        <a href="https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?lastSelectedFacet=CATEGORIES&selectedCategoriesFacet=300000787442096">Click Here to Apply</a>
        <h3>Other Functions</h3>
        <a href="https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?lastSelectedFacet=CATEGORIES&selectedCategoriesFacet=300000787441932">Click Here to Apply</a>
        <p>Not ready to apply? Sign up to join our Talent Pool for future opportunities - <a href="https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/join-talent-community">Join Us</a></p>
      </section>
      <section>
        <h3>About Fortis</h3>
        <p>Fortis Healthcare Limited - an IHH Healthcare Berhad Company - is a leading integrated healthcare services provider in India.</p>
        <p>Fortis employs ~23,000 people (including Agilus Diagnostics Limited) who share its vision of becoming the world's most trusted healthcare network.</p>
      </section>
      <p>Disclaimer - Fortis follows a formal recruitment process through its HR department that entails on-site or virtual meetings.</p>
    </main>
  </body>
</html>
`

const officialCandidateExperienceHtml = `
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <title>Fortis Career</title>
    <meta property="og:title" content="Fortis Career Careers" />
    <meta property="og:description" content="All for Hope" />
    <meta property="og:image" content="https://www.fortishealthcare.com/static_new/img/fortis-logo.png" />
    <meta property="og:site_name" content="Fortis Career" />
    <base href="/hcmUI/CandidateExperience/en/sites/CX_1" />
    <script data-cx-config>
      var CX_CONFIG = {
        app: {
          apiBaseUrl: 'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com:443',
          siteName: 'Fortis Career',
          siteCode: 'FT01',
          siteNumber: 'CX_1',
          talentCommunitySignUp: {
            title: 'Join Fortis',
            buttonLabel: 'Sign up now'
          },
          images: {
            frontImageUrl: 'https://www.fortishealthcare.com/drupal-data/2023-08/Oracle.png',
            logoImageUrl: 'https://www.fortishealthcare.com/static_new/img/fortis-logo.png'
          }
        }
      };
    </script>
  </head>
  <body>
    <div id="jobSearchPage">Search Fortis jobs</div>
  </body>
</html>
`

const listingPayload = {
  items: [{
    Limit: 24,
    TotalJobsCount: 1147,
    SiteNumber: 'CX_1',
    organizationsFacet: [{
      Id: 1,
      Name: 'Fortis Healthcare Limited',
      TotalCount: 1147,
    }],
    requisitionList: [
      {
        Id: '11751',
        Title: 'Attending Consultant Anaesthesiology',
        PostedDate: '2026-07-14',
        PostingEndDate: null,
        Language: 'US',
        PrimaryLocationCountry: 'IN',
        HotJobFlag: false,
        JobFamily: null,
        JobFunction: null,
        WorkerType: null,
        ContractType: null,
        JobSchedule: null,
        JobType: null,
        StudyLevel: null,
        BusinessUnit: null,
        Department: null,
        Organization: null,
        ShortDescriptionStr: '',
        PrimaryLocation: 'Mumbai, Maharashtra, India',
        WorkplaceType: '',
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
        HotJobFlag: false,
        JobFamily: 'Operations',
        JobFunction: 'Operations',
        WorkerType: null,
        ContractType: null,
        JobSchedule: 'Full time',
        JobType: null,
        StudyLevel: null,
        BusinessUnit: null,
        Department: null,
        Organization: null,
        ShortDescriptionStr: 'Should be filtered out.',
        PrimaryLocation: 'Naples, Florida, United States',
        WorkplaceType: '',
        ExternalQualificationsStr: null,
        ExternalResponsibilitiesStr: null,
        secondaryLocations: [],
      },
    ],
  }],
}

const detailPayload = {
  items: [{
    Id: '11751',
    Title: 'Attending Consultant Anaesthesiology',
    Category: 'CLINICIAN',
    RequisitionType: 'Clinicians',
    RequisitionId: 300008035323336,
    ExternalPostedStartDate: '2026-07-14T04:48:31+00:00',
    JobSchedule: 'Full time',
    StudyLevel: 'Post Graduation',
    ContractType: null,
    ExternalPostedEndDate: null,
    ExternalDescriptionStr: '',
    ShortDescriptionStr: '',
    PrimaryLocation: 'Mumbai, Maharashtra, India',
    PrimaryLocationCountry: 'IN',
    ExternalQualificationsStr: '',
    ExternalResponsibilitiesStr: '',
    WorkplaceType: '',
    Department: null,
    JobFunction: 'Clinician',
    secondaryLocations: [],
    skills: [],
    workLocation: [
      {
        LocationId: 300000003533783,
        LocationName: 'IHL-Mulund',
        TownOrCity: 'Mumbai',
        PostalCode: '400078',
        Country: 'IN',
        Region1: null,
        Region2: 'Maharashtra',
        Region3: 'Maharashtra',
      },
    ],
    otherWorkLocations: [],
  }],
}

const loadFortisModule = async () => {
  try {
    return await import('../../scraper/fortishealthcare/script.js')
  } catch {
    assert.fail('Expected Fortis Healthcare scraper module at ../../scraper/fortishealthcare/script.js')
  }
}

test('Fortis Healthcare keeps the verified first-party careers handoff and Oracle candidate shell pinned', async () => {
  const fortis = await loadFortisModule()

  assert.equal(fortis.SOURCE, 'fortishealthcare')
  assert.equal(fortis.COMPANY_NAME, 'Fortis Healthcare')
  assert.equal(fortis.OFFICIAL_BRAND_NAME, 'Fortis Healthcare Limited')
  assert.equal(fortis.VERIFIED_AT, '2026-07-15')
  assert.equal(fortis.HOMEPAGE_URL, 'https://www.fortishealthcare.com/')
  assert.equal(fortis.OFFICIAL_CAREERS_URL, 'https://www.fortishealthcare.com/careers')
  assert.equal(fortis.OFFICIAL_CAREERS_RESOLVED_URL, 'https://www.fortishealthcare.com/careers-at-Fortis-basic')
  assert.equal(
    fortis.CANDIDATE_EXPERIENCE_URL,
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  )
  assert.equal(fortis.WORKSPACE_DOMAIN, 'fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com')
  assert.equal(fortis.SITE_NUMBER, 'CX_1')
  assert.equal(fortis.hasOfficialCareersPageSignal(officialCareersHtml), true)
  assert.equal(fortis.hasOfficialCandidateExperienceSignal(officialCandidateExperienceHtml), true)
  assert.equal(fortis.hasVerifiedFortisListingSignal(listingPayload), true)
})

test('Fortis Healthcare keeps Oracle finder, detail, and public job URLs pinned to the verified CX_1 surface', async () => {
  const fortis = await loadFortisModule()

  assert.equal(
    fortis.buildSearchUrl(),
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    fortis.buildSearchUrl({ page: 2, limit: 10 }),
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=India',
  )
  assert.equal(
    fortis.buildJobDetailUrl('11751'),
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/11751',
  )
  assert.equal(
    fortis.buildJobDetailApiUrl('11751'),
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2211751%22,siteNumber=CX_1',
  )
})

test('extractSearchResults and extractJobDetail normalize Fortis Healthcare Oracle requisitions', async () => {
  const fortis = await loadFortisModule()
  const listings = fortis.extractSearchResults(listingPayload)

  assert.deepEqual(listings, [{
    title: 'Attending Consultant Anaesthesiology',
    company: 'Fortis Healthcare',
    department: null,
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    country: 'India',
    jobId: '11751',
    requisitionId: '11751',
    sourceUrl: 'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/11751',
    applyUrl: 'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/11751',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-14',
    closingDate: null,
    jobDescription: null,
    remoteStatus: null,
    siteNumber: 'CX_1',
  }])

  const detail = fortis.extractJobDetail(detailPayload, listings[0])

  assert.deepEqual(detail, {
    title: 'Attending Consultant Anaesthesiology',
    company: 'Fortis Healthcare',
    department: 'Clinician',
    location: 'Mumbai, Maharashtra, India',
    city: 'Mumbai',
    country: 'India',
    jobId: '11751',
    requisitionId: '11751',
    sourceUrl: 'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/11751',
    applyUrl: 'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/11751',
    employmentType: 'Full time',
    experienceRequired: null,
    minimumQualification: 'Post Graduation',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-14',
    closingDate: null,
    jobDescription: null,
    remoteStatus: null,
    siteNumber: 'CX_1',
  })
})

test('run verifies the Oracle candidate shell and Fortis listing contract before calling the public detail API', async () => {
  const fortis = await loadFortisModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await fortis.createFortisHealthcareScraper({
    maxPages: 1,
    maxJobs: 1,
    now: () => '2026-07-15T00:00:00.000Z',
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === fortis.CANDIDATE_EXPERIENCE_URL) return officialCandidateExperienceHtml
      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === fortis.buildSearchUrl()) return listingPayload
      if (url === fortis.buildJobDetailApiUrl('11751')) return detailPayload
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedTextUrls, [fortis.CANDIDATE_EXPERIENCE_URL])
  assert.deepEqual(requestedJsonUrls, [
    fortis.buildSearchUrl(),
    fortis.buildJobDetailApiUrl('11751'),
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'fortishealthcare')
  assert.equal(jobs[0].company, 'Fortis Healthcare')
  assert.equal(
    jobs[0].link,
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/11751',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-15T00:00:00.000Z')
})

test('run fails closed when the Fortis Oracle shell or listing contract drifts materially', async () => {
  const fortis = await loadFortisModule()

  await assert.rejects(
    fortis.createFortisHealthcareScraper({
      fetchText: async () => officialCandidateExperienceHtml.replace("siteNumber: 'CX_1'", "siteNumber: 'CX_2'"),
      fetchJson: async () => listingPayload,
    }).run(),
    /verified Oracle candidate experience page/i,
  )

  await assert.rejects(
    fortis.createFortisHealthcareScraper({
      fetchText: async () => officialCandidateExperienceHtml,
      fetchJson: async (url) => {
        if (url === fortis.buildSearchUrl()) {
          return {
            ...listingPayload,
            items: [{
              ...listingPayload.items[0],
              organizationsFacet: [{ Id: 1, Name: 'Other Company', TotalCount: 1147 }],
            }],
          }
        }
        return detailPayload
      },
    }).run(),
    /verified Fortis listing contract/i,
  )
})
