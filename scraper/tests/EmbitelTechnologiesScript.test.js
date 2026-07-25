import assert from 'node:assert/strict'
import test from 'node:test'

const LISTING_PAGE_HTML = String.raw`<!DOCTYPE html><html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"jobsData":{"rows":[{"id":55737,"created_on":1752105600000,"job_status":"OPEN","department":"CARIAD","title":"Security Lead -Incident Management","location":"Bangalore","description_external":"<p>Lead security incident response for CARIAD.</p><p><strong>Skills :</strong> SIEM, Incident Management</p>","job_type":"FULLTIME","code":"55737"},{"id":55731,"created_on":1752019200000,"job_status":"OPEN","department":"ATC","title":"Software Architect - Adaptive Autosar","location":"Bangalore","description_external":"<p>Design Adaptive Autosar solutions.</p><p><strong>Skills :</strong> Autosar, C++</p>","job_type":"FULLTIME","code":"55731"},{"id":55369,"created_on":1751932800000,"job_status":"CLOSED","department":"VW Brands","title":"Front End Engineer","location":"Bangalore","description_external":"<p>Closed role.</p>","job_type":"FULLTIME","code":"55369"}],"count":11}}},"page":"/","query":{},"buildId":"embitel-build","isFallback":false,"gssp":true}</script></body></html>`

const loadModule = async () => {
  try {
    return await import('../embiteltechnologies/script.js')
  } catch {
    assert.fail('Expected Embitel Technologies scraper module at ../embiteltechnologies/script.js')
  }
}

test('Embitel Technologies helpers keep the verified public SenseHQ board contract stable', async () => {
  const embitel = await loadModule()

  assert.equal(embitel.SOURCE, 'embiteltechnologies')
  assert.equal(embitel.COMPANY, 'Embitel Technologies')
  assert.equal(embitel.PUBLIC_BOARD_URL, 'https://embitel.sensehq.com/careers')
  assert.equal(embitel.VERIFIED_ON, '2026-07-18')
  assert.equal(embitel.buildListingUrl(), 'https://embitel.sensehq.com/careers')
  assert.equal(embitel.buildJobUrl(55737), 'https://embitel.sensehq.com/careers/jobs/55737')
})

test('extractSearchResults keeps only open India jobs from the Embitel Technologies public SenseHQ board payload', async () => {
  const embitel = await loadModule()
  const jobs = embitel.extractSearchResults(LISTING_PAGE_HTML)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Security Lead -Incident Management',
    company: 'Embitel Technologies',
    department: 'CARIAD',
    location: 'Bangalore, India',
    city: 'Bangalore',
    jobId: '55737',
    requisitionId: '55737',
    sourceUrl: 'https://embitel.sensehq.com/careers/jobs/55737',
    applyUrl: 'https://embitel.sensehq.com/careers/jobs/55737',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'SIEM',
      'Incident Management',
    ],
    postingDate: '2025-07-10',
    closingDate: null,
    jobDescription: 'Lead security incident response for CARIAD. Skills : SIEM, Incident Management',
  })

  assert.deepEqual(embitel.extractBoardSummary(LISTING_PAGE_HTML), {
    currentPage: 1,
    pageSize: 3,
    totalCount: 11,
    totalPages: 4,
    hasNext: true,
  })
})

test('run paginates the verified public SenseHQ board and decorates shared runner fields', async () => {
  const embitel = await loadModule()
  const requests = []
  const scraper = embitel.createEmbitelTechnologiesScraper({ maxPages: 1, maxJobs: 2 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)
      if (url === embitel.buildListingUrl({ page: 1 })) return LISTING_PAGE_HTML
      throw new Error(`Unexpected Embitel URL: ${url}`)
    },
  })

  assert.deepEqual(requests, [embitel.buildListingUrl({ page: 1 })])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'embiteltechnologies')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.ok(jobs.every((job) => typeof job.scrapedAt === 'string' && job.scrapedAt.length > 0))
})
