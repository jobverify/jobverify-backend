import assert from 'node:assert/strict'
import test from 'node:test'

const loadWspIndiaModule = async () => {
  try {
    return await import('../wspindia/script.js')
  } catch {
    assert.fail('Expected WSP India scraper module at ../wspindia/script.js')
  }
}

const indiaSiteHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>We are WSP</h1>
      <p>Lead and grow</p>
      <a href="/en-gl/careers/job-opportunities?country=IN">Search and apply</a>
    </main>
  </body>
</html>
`

const jobsPageOneHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Find your next opportunity</h1>
      <a href="https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85341">
        <span>Principal Engineer - Audio Visual Systems</span>
        <span>Noida | Bengaluru</span>
      </a>
      <a href="https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85342">
        <span>Principal Engineer - RAMS</span>
        <span>Bengaluru | Noida | Mumbai</span>
      </a>
      <a href="/en-gl/careers/job-opportunities?country=IN&page=2">2</a>
      <a href="https://example.com/not-official">Ignore me</a>
    </main>
  </body>
</html>
`

const jobsPageTwoHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Find your next opportunity</h1>
      <a href="https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85343">
        <span>Analyst Consultant - Emissions Inventories</span>
        <span>Other cities in India | Mumbai | Noida</span>
      </a>
    </main>
  </body>
</html>
`

test('WSP India verifies the official India site handoff and builds paginated official jobs URLs', async () => {
  const wspIndia = await loadWspIndiaModule()

  assert.equal(wspIndia.INDIA_SITE_URL, 'https://www.wsp.com/en-gl/sites/india')
  assert.equal(
    wspIndia.JOBS_PAGE_URL,
    'https://www.wsp.com/en-gl/careers/job-opportunities?country=IN',
  )
  assert.equal(wspIndia.hasOfficialIndiaSiteSignal(indiaSiteHtml), true)
  assert.equal(wspIndia.hasOfficialJobsPageSignal(jobsPageOneHtml), true)
  assert.equal(
    wspIndia.buildJobsPageUrl({ page: 1 }),
    'https://www.wsp.com/en-gl/careers/job-opportunities?country=IN',
  )
  assert.equal(
    wspIndia.buildJobsPageUrl({ page: 2 }),
    'https://www.wsp.com/en-gl/careers/job-opportunities?country=IN&page=2',
  )
})

test('extractJobsFromHtml keeps only official Oracle preview links exposed by WSP and normalizes locations', async () => {
  const wspIndia = await loadWspIndiaModule()
  const jobs = wspIndia.extractJobsFromHtml(jobsPageOneHtml)

  assert.deepEqual(jobs, [
    {
      title: 'Principal Engineer - Audio Visual Systems',
      company: 'WSP India',
      location: 'Noida | Bengaluru',
      city: 'Noida',
      sourceUrl: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85341',
      applyUrl: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85341',
      jobId: '85341',
      requisitionId: '85341',
      jobDescription: null,
    },
    {
      title: 'Principal Engineer - RAMS',
      company: 'WSP India',
      location: 'Bengaluru | Noida | Mumbai',
      city: 'Bengaluru',
      sourceUrl: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85342',
      applyUrl: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85342',
      jobId: '85342',
      requisitionId: '85342',
      jobDescription: null,
    },
  ])
})

test('run follows the verified WSP India handoff and paginates the official jobs surface', async () => {
  const wspIndia = await loadWspIndiaModule()
  const requests = []

  const jobs = await wspIndia.createWspIndiaScraper().run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === wspIndia.INDIA_SITE_URL) return indiaSiteHtml
      if (url === wspIndia.buildJobsPageUrl({ page: 1 })) return jobsPageOneHtml
      if (url === wspIndia.buildJobsPageUrl({ page: 2 })) return jobsPageTwoHtml
      throw new Error(`Unexpected WSP India URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requests, [
    wspIndia.INDIA_SITE_URL,
    wspIndia.buildJobsPageUrl({ page: 1 }),
    wspIndia.buildJobsPageUrl({ page: 2 }),
  ])
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      jobId: job.jobId,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Principal Engineer - Audio Visual Systems',
        location: 'Noida | Bengaluru',
        city: 'Noida',
        jobId: '85341',
        source: 'wspindia',
        link: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85341',
        scrapedAt: '2026-07-10T00:00:00.000Z',
      },
      {
        title: 'Principal Engineer - RAMS',
        location: 'Bengaluru | Noida | Mumbai',
        city: 'Bengaluru',
        jobId: '85342',
        source: 'wspindia',
        link: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85342',
        scrapedAt: '2026-07-10T00:00:00.000Z',
      },
      {
        title: 'Analyst Consultant - Emissions Inventories',
        location: 'Other cities in India | Mumbai | Noida',
        city: 'Other cities in India',
        jobId: '85343',
        source: 'wspindia',
        link: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/85343',
        scrapedAt: '2026-07-10T00:00:00.000Z',
      },
    ],
  )
})
