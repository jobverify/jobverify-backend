import assert from 'node:assert/strict'
import test from 'node:test'

const loadHoneywellModule = async () => {
  try {
    return await import('../../scraper/honeywell/script.js')
  } catch {
    assert.fail('Expected Honeywell scraper module at ../../scraper/scraper/honeywell/script.js')
  }
}

const samplePayload = {
  items: [
    {
      TotalJobsCount: 3,
      Limit: 24,
      requisitionList: [
        {
          Id: '145492',
          Title: 'Estimator II',
          PrimaryLocation: 'Pune, Maharashtra, India',
          PrimaryLocationCountry: 'IN',
          PostedDate: '2026-07-07',
          ShortDescriptionStr: 'Develop accurate project estimates.',
          WorkplaceType: 'Hybrid',
          secondaryLocations: [],
        },
        {
          Id: '145493',
          Title: 'Controls Engineer',
          PrimaryLocation: 'Charlotte, North Carolina, United States',
          PrimaryLocationCountry: 'US',
          PostedDate: '2026-07-06',
          ShortDescriptionStr: 'Support global automation programs.',
          secondaryLocations: [
            { Name: 'Bengaluru, Karnataka, India', CountryCode: 'IN' },
          ],
        },
        {
          Id: '145494',
          Title: 'US Role',
          PrimaryLocation: 'Phoenix, Arizona, United States',
          PrimaryLocationCountry: 'US',
          PostedDate: '2026-07-05',
          ShortDescriptionStr: 'Ignore this role.',
          secondaryLocations: [],
        },
      ],
    },
  ],
}

test('buildSearchUrl scopes Honeywell Oracle Cloud requests to the official India jobs finder', async () => {
  const { buildSearchUrl } = await loadHoneywellModule()

  assert.equal(
    buildSearchUrl(),
    'https://ibqbjb.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=24,offset=0,location=India',
  )
})

test('extractSearchResults retains Honeywell jobs with a primary or secondary India location', async () => {
  const { extractSearchResults } = await loadHoneywellModule()
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
      title: 'Estimator II',
      location: 'Pune, Maharashtra, India',
      city: 'Pune',
      jobId: '145492',
      sourceUrl: 'https://ibqbjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/145492',
    },
    {
      title: 'Controls Engineer',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      jobId: '145493',
      sourceUrl: 'https://ibqbjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/145493',
    },
  ])
})

test('run preserves the scraper runner contract for Honeywell jobs', async () => {
  const { buildSearchUrl, createHoneywellScraper } = await loadHoneywellModule()
  const requests = []
  const jobs = await createHoneywellScraper({
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
  assert.equal(jobs[0].source, 'honeywell')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
