import assert from 'node:assert/strict'
import test from 'node:test'

const loadDnvModule = async () => {
  try {
    return await import('../../scraper/dnv/script.js')
  } catch {
    assert.fail('Expected DNV scraper module at ../../scraper/scraper/dnv/script.js')
  }
}

const samplePayload = {
  items: [
    {
      TotalJobsCount: 3,
      Limit: 24,
      requisitionList: [
        {
          Id: '6410',
          Title: 'Principal Consultant',
          PrimaryLocation: 'Bangalore, India',
          PrimaryLocationCountry: 'IN',
          PostedDate: '2026-07-06',
          ShortDescriptionStr: 'Advance safety and performance.',
          WorkplaceType: 'Hybrid',
          secondaryLocations: [],
        },
        {
          Id: '6555',
          Title: 'Oracle HCM Cloud Solution Architect',
          PrimaryLocation: 'Gdynia, Poland',
          PrimaryLocationCountry: 'PL',
          PostedDate: '2026-06-23',
          ShortDescriptionStr: 'Deliver global shared services.',
          secondaryLocations: [
            { Name: 'Pune, India', CountryCode: 'IN' },
          ],
        },
        {
          Id: '8001',
          Title: 'US Role',
          PrimaryLocation: 'Houston, United States',
          PrimaryLocationCountry: 'US',
          PostedDate: '2026-07-01',
          ShortDescriptionStr: 'Ignore this role.',
          secondaryLocations: [],
        },
      ],
    },
  ],
}

test('buildSearchUrl scopes DNV Oracle Cloud requests to the official India jobs finder', async () => {
  const { buildSearchUrl } = await loadDnvModule()

  assert.equal(
    buildSearchUrl(),
    'https://ecyq.fa.em2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
})

test('extractSearchResults retains DNV jobs with a primary or secondary India location', async () => {
  const { extractSearchResults } = await loadDnvModule()
  const jobs = extractSearchResults(samplePayload)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs.map((job) => ({
    title: job.title,
    location: job.location,
    city: job.city,
    jobId: job.jobId,
    sourceUrl: job.sourceUrl,
  })), [
    {
      title: 'Principal Consultant',
      location: 'Bangalore, India',
      city: 'Bangalore',
      jobId: '6410',
      sourceUrl: 'https://ecyq.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/6410',
    },
    {
      title: 'Oracle HCM Cloud Solution Architect',
      location: 'Pune, India',
      city: 'Pune',
      jobId: '6555',
      sourceUrl: 'https://ecyq.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/6555',
    },
  ])
})

test('run preserves the scraper runner contract for DNV jobs', async () => {
  const { buildSearchUrl, createDnvScraper } = await loadDnvModule()
  const requests = []
  const jobs = await createDnvScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchJson: async (url) => {
      requests.push(url)
      assert.equal(url, buildSearchUrl())
      return samplePayload
    },
  }).run()

  assert.deepEqual(requests, [buildSearchUrl()])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'dnv')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
