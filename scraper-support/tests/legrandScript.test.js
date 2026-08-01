import assert from 'node:assert/strict'
import test from 'node:test'

const searchPayload = {
  items: [{
    Limit: 24,
    TotalJobsCount: 16,
    requisitionList: [
      {
        Id: '164',
        Title: 'Senior Automation Engineer',
        Department: 'Engineering',
        PrimaryLocation: 'India',
        PrimaryLocationCountry: 'IN',
        PostedDate: '2026-07-09',
        StudyLevel: "Bachelor's Degree",
        ShortDescriptionStr: 'Build digital power and automation systems.',
        secondaryLocations: [
          {
            Name: 'Noida, Uttar Pradesh, India',
            CountryCode: 'IN',
          },
        ],
      },
      {
        Id: '999',
        Title: 'France role',
        Department: 'Engineering',
        PrimaryLocation: 'Lyon, France',
        PrimaryLocationCountry: 'FR',
        PostedDate: '2026-07-09',
        ShortDescriptionStr: 'Should be filtered out.',
        secondaryLocations: [],
      },
    ],
  }],
}

const detailPayload = {
  items: [{
    Id: '164',
    Title: 'Senior Automation Engineer',
    Department: 'Engineering',
    RequisitionType: 'Regular',
    JobSchedule: 'Full time',
    PrimaryLocation: 'India',
    PrimaryLocationCountry: 'IN',
    ExternalPostedStartDate: '2026-07-09T00:00:00+00:00',
    ExternalPostedEndDate: '2026-08-09T00:00:00+00:00',
    StudyLevel: "Bachelor's Degree",
    ExternalDescriptionStr: '<p>Build digital power and automation systems.</p>',
    ExternalResponsibilitiesStr: '<ul><li>Design controls</li><li>Support plants</li></ul>',
    ExternalQualificationsStr: '<p>PLC and controls experience.</p>',
    secondaryLocations: [
      {
        Name: 'Noida, Uttar Pradesh, India',
        CountryCode: 'IN',
      },
    ],
    skills: [
      { Skill: 'PLC' },
      { Skill: 'Controls' },
    ],
  }],
}

test('Legrand scraper normalizes India Oracle CE requisitions and enriches them end to end', async () => {
  const legrand = await import('../../scraper/legrand/script.js')
  const requestedUrls = []

  assert.equal(
    legrand.LISTING_API_BASE_URL,
    'https://iadugs.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    legrand.DETAIL_API_BASE_URL,
    'https://iadugs.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    legrand.PUBLIC_JOBS_BASE_URL,
    'https://careers.legrand.com/en/sites/CX_1001/job/',
  )
  assert.equal(legrand.SITE_NUMBER, 'CX_1001')
  assert.equal(typeof legrand.extractSearchResults, 'function')
  assert.equal(typeof legrand.extractJobDetail, 'function')
  assert.equal(typeof legrand.createLegrandScraper, 'function')
  assert.equal(typeof legrand.run, 'function')

  assert.equal(
    legrand.buildSearchUrl(),
    'https://iadugs.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1001,limit=24,offset=0,location=India',
  )
  assert.equal(
    legrand.buildJobDetailUrl('164'),
    'https://careers.legrand.com/en/sites/CX_1001/job/164',
  )

  const listings = legrand.extractSearchResults(searchPayload)
  assert.deepEqual(listings, [{
    title: 'Senior Automation Engineer',
    company: 'Legrand',
    department: 'Engineering',
    location: 'Noida, Uttar Pradesh, India',
    city: 'Noida',
    jobId: '164',
    requisitionId: '164',
    sourceUrl: 'https://careers.legrand.com/en/sites/CX_1001/job/164',
    applyUrl: 'https://careers.legrand.com/en/sites/CX_1001/job/164',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: "Bachelor's Degree",
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09',
    closingDate: null,
    jobDescription: 'Build digital power and automation systems.',
  }])

  const detail = legrand.extractJobDetail(detailPayload, listings[0])
  assert.equal(detail.title, 'Senior Automation Engineer')
  assert.equal(detail.location, 'Noida, Uttar Pradesh, India')
  assert.equal(detail.city, 'Noida')
  assert.equal(detail.employmentType, 'Full time')
  assert.equal(detail.minimumQualification, "Bachelor's Degree")
  assert.deepEqual(detail.requiredSkills, ['PLC', 'Controls'])
  assert.equal(detail.postingDate, '2026-07-09')
  assert.equal(detail.closingDate, '2026-08-09')
  assert.match(detail.jobDescription, /digital power and automation systems/i)
  assert.match(detail.jobDescription, /Design controls/i)
  assert.match(detail.jobDescription, /Support plants/i)

  const jobs = await legrand.createLegrandScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === legrand.buildSearchUrl({ page: 0 })) return searchPayload
      if (url === `${legrand.DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${listings[0].jobId}%22,siteNumber=CX_1001`) {
        return detailPayload
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedUrls, [
    legrand.buildSearchUrl({ page: 0 }),
    `${legrand.DETAIL_API_BASE_URL}?expand=all&onlyData=true&finder=ById;Id=%22${listings[0].jobId}%22,siteNumber=CX_1001`,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'legrand')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(jobs[0].title, 'Senior Automation Engineer')
})
