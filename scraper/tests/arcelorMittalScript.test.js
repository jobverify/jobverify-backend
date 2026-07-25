import assert from 'node:assert/strict'
import test from 'node:test'

const loadArcelorModule = async () => {
  try {
    return await import('../arcelormittal/script.js')
  } catch {
    assert.fail('Expected Arcelor Mittal scraper module at ../scraper/arcelormittal/script.js')
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
          Id: '33845',
          Title: 'Automation Engineer',
          Department: 'Engineering',
          PrimaryLocation: 'Pune, Maharashtra, India',
          PrimaryLocationCountry: 'IN',
          PostedDate: '2026-07-01',
          StudyLevel: 'Bachelor degree in engineering',
          ShortDescriptionStr: 'Build automation for steel manufacturing systems.',
          ExternalResponsibilitiesStr: 'Partner with operations and plant teams.',
        },
        {
          Id: '33846',
          Title: 'US Role',
          Department: 'Engineering',
          PrimaryLocation: 'Chicago, Illinois, United States',
          PrimaryLocationCountry: 'US',
          PostedDate: '2026-07-01',
          StudyLevel: 'Bachelor degree',
          ShortDescriptionStr: 'Ignore this role.',
          ExternalResponsibilitiesStr: 'Outside India.',
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

test('buildSearchUrl keeps Arcelor Mittal searches on the public Oracle Cloud careers finder', async () => {
  const { buildSearchUrl } = await loadArcelorModule()

  assert.equal(
    buildSearchUrl(),
    'https://emfg.fa.em4.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_4001,limit=24,offset=0,location=India',
  )
  assert.equal(
    buildSearchUrl({ page: 1, limit: 10, location: 'India' }),
    'https://emfg.fa.em4.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_4001,limit=10,offset=10,location=India',
  )
})

test('buildJobDetailUrl keeps Arcelor Mittal detail links on the public Oracle candidate route', async () => {
  const { buildJobDetailUrl } = await loadArcelorModule()

  assert.equal(
    buildJobDetailUrl('33845'),
    'https://emfg.fa.em4.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_4001/job/33845',
  )
})

test('extractSearchResults normalizes Arcelor Mittal Oracle Cloud requisitions and keeps only India jobs', async () => {
  const { extractSearchResults } = await loadArcelorModule()
  const jobs = extractSearchResults(samplePayload)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Automation Engineer',
    company: 'ArcelorMittal',
    department: 'Engineering',
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    jobId: '33845',
    requisitionId: '33845',
    sourceUrl: 'https://emfg.fa.em4.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_4001/job/33845',
    applyUrl: 'https://emfg.fa.em4.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_4001/job/33845',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: 'Bachelor degree in engineering',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-01',
    closingDate: null,
    jobDescription: 'Build automation for steel manufacturing systems. Partner with operations and plant teams.',
  })
})

test('run returns no jobs when the live Arcelor Mittal India Oracle feed is empty', async () => {
  const { buildSearchUrl, createArcelorMittalScraper } = await loadArcelorModule()
  const requests = []
  const jobs = await createArcelorMittalScraper({
    fetchJson: async (url) => {
      requests.push(url)
      if (url === buildSearchUrl()) return emptyPayload
      throw new Error(`Unexpected Arcelor Mittal URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requests, [buildSearchUrl()])
  assert.deepEqual(jobs, [])
})
