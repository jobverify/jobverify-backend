import assert from 'node:assert/strict'
import test from 'node:test'

const loadLandmarkModule = async () => {
  try {
    return await import('../../scraper/landmarkgroup/script.js')
  } catch {
    assert.fail('Expected Landmark Group scraper module at ../../scraper/scraper/landmarkgroup/script.js')
  }
}

const samplePayload = {
  items: [
    {
      TotalJobsCount: 1,
      Limit: 24,
      Offset: 0,
      requisitionList: [
        {
          Id: '109999',
          Title: 'Software Engineer',
          Department: 'Technology',
          PrimaryLocation: 'India',
          PrimaryLocationCountry: 'IN',
          PostedDate: '2026-07-10',
          StudyLevel: "Bachelor's Degree",
          ShortDescriptionStr: 'Build omnichannel retail platforms.',
          ExternalResponsibilitiesStr: 'Ship backend services for Landmark Group brands.',
          secondaryLocations: [
            {
              Name: 'Bengaluru, Karnataka, India',
              CountryCode: 'IN',
            },
          ],
        },
        {
          Id: '110000',
          Title: 'Outside India Role',
          Department: 'Technology',
          PrimaryLocation: 'United Arab Emirates',
          PrimaryLocationCountry: 'AE',
          PostedDate: '2026-07-10',
          ShortDescriptionStr: 'Filtered out.',
          ExternalResponsibilitiesStr: 'Outside India.',
          secondaryLocations: [],
        },
      ],
    },
  ],
}

const emptyPayload = {
  items: [
    {
      TotalJobsCount: 0,
      Limit: 24,
      Offset: 0,
      requisitionList: [],
    },
  ],
}

test('buildSearchUrl keeps Landmark Group searches on the public Oracle Cloud careers finder with India scoping', async () => {
  const landmark = await loadLandmarkModule()

  assert.equal(
    landmark.buildSearchUrl(),
    'https://efhi.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    landmark.buildSearchUrl({ page: 1, limit: 10, location: 'Bengaluru, Karnataka, India' }),
    'https://efhi.fa.em3.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=10,location=Bengaluru, Karnataka, India',
  )
})

test('buildJobDetailUrl keeps Landmark Group detail links on the public Oracle candidate route', async () => {
  const landmark = await loadLandmarkModule()

  assert.equal(
    landmark.buildJobDetailUrl('109999'),
    'https://efhi.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/109999',
  )
})

test('extractSearchResults normalizes Landmark Group Oracle Cloud requisitions and keeps only India jobs', async () => {
  const landmark = await loadLandmarkModule()
  const jobs = landmark.extractSearchResults(samplePayload)

  assert.deepEqual(jobs, [{
    title: 'Software Engineer',
    company: 'Landmark Group',
    department: 'Technology',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    jobId: '109999',
    requisitionId: '109999',
    sourceUrl: 'https://efhi.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/109999',
    applyUrl: 'https://efhi.fa.em3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/109999',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: "Bachelor's Degree",
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-10',
    closingDate: null,
    jobDescription: 'Build omnichannel retail platforms. Ship backend services for Landmark Group brands.',
  }])
})

test('run returns no jobs when the live Landmark Group India Oracle feed is empty', async () => {
  const landmark = await loadLandmarkModule()
  const requests = []
  const jobs = await landmark.createLandmarkGroupScraper({
    fetchJson: async (url) => {
      requests.push(url)
      if (url === landmark.buildSearchUrl()) return emptyPayload
      throw new Error(`Unexpected Landmark Group URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requests, [landmark.buildSearchUrl()])
  assert.deepEqual(jobs, [])
})
