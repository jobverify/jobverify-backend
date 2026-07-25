import assert from 'node:assert/strict'
import test from 'node:test'

const samplePayload = {
  items: [
    {
      TotalJobsCount: 3,
      Limit: 24,
      Offset: 0,
      requisitionList: [
        {
          Id: '26003600',
          Title: 'Director - Software Engineering',
          PostedDate: '2026-07-13',
          PostingEndDate: null,
          PrimaryLocationCountry: 'IN',
          PrimaryLocation: 'Bengaluru, KA, India',
          WorkplaceType: 'Hybrid',
          secondaryLocations: [],
        },
        {
          Id: '26009093',
          Title: 'Apprentice',
          PostedDate: '2026-07-10',
          PostingEndDate: null,
          PrimaryLocationCountry: 'IN',
          PrimaryLocation: 'Gurugram, HR, India',
          WorkplaceType: 'Hybrid',
          secondaryLocations: [
            {
              Name: 'Bengaluru, KA, India',
              CountryCode: 'IN',
            },
          ],
        },
        {
          Id: '99999999',
          Title: 'US Role',
          PostedDate: '2026-07-08',
          PrimaryLocationCountry: 'US',
          PrimaryLocation: 'New York, NY, United States',
          WorkplaceType: 'On-site',
          secondaryLocations: [],
        },
      ],
    },
  ],
}

const loadAmericanExpressModule = async () => {
  try {
    return await import('../americanexpress/script.js')
  } catch {
    assert.fail('Expected American Express scraper module at ../americanexpress/script.js')
  }
}

test('buildSearchUrl keeps American Express requests on the official India Oracle Cloud finder', async () => {
  const americanExpress = await loadAmericanExpressModule()

  assert.equal(
    americanExpress.buildSearchUrl(),
    'https://egug.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
  assert.equal(
    americanExpress.buildSearchUrl({ page: 2, limit: 10 }),
    'https://egug.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=10,offset=20,location=India',
  )
})

test('buildJobDetailUrl uses American Express public Oracle Cloud job detail pages on the branded careers host', async () => {
  const americanExpress = await loadAmericanExpressModule()

  assert.equal(
    americanExpress.buildJobDetailUrl('26003600'),
    'https://careers.americanexpress.com/en/sites/CX_1/job/26003600',
  )
})

test('extractSearchResults normalizes only American Express requisitions available in India', async () => {
  const americanExpress = await loadAmericanExpressModule()
  const jobs = americanExpress.extractSearchResults(samplePayload)

  assert.deepEqual(jobs, [
    {
      title: 'Director - Software Engineering',
      company: 'American Express',
      department: null,
      location: 'Bengaluru, KA, India',
      city: 'Bengaluru',
      jobId: '26003600',
      requisitionId: '26003600',
      sourceUrl: 'https://careers.americanexpress.com/en/sites/CX_1/job/26003600',
      applyUrl: 'https://careers.americanexpress.com/en/sites/CX_1/job/26003600',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-13',
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'Apprentice',
      company: 'American Express',
      department: null,
      location: 'Gurugram, HR, India',
      city: 'Gurugram',
      jobId: '26009093',
      requisitionId: '26009093',
      sourceUrl: 'https://careers.americanexpress.com/en/sites/CX_1/job/26009093',
      applyUrl: 'https://careers.americanexpress.com/en/sites/CX_1/job/26009093',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-10',
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('createAmericanExpressScraper caps returned jobs without calling unofficial surfaces', async () => {
  const americanExpress = await loadAmericanExpressModule()
  const requests = []

  const jobs = await americanExpress.createAmericanExpressScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchJson: async (url) => {
      requests.push(url)
      return samplePayload
    },
  }).run()

  assert.deepEqual(requests, [americanExpress.buildSearchUrl()])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'americanexpress')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
