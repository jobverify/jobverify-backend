import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(currentDir, '../tests/fixtures/jubilantfoodworks')

const loadFixture = (name) => JSON.parse(
  fs.readFileSync(path.join(fixturesDir, name), 'utf8'),
)

const loadJubilantFoodWorksModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Jubilant FoodWorks scraper module at ./script.js')
  }
}

test('Jubilant FoodWorks scraper uses the verified official Oracle jobs API and detail endpoint', async () => {
  const listingPayload = loadFixture('search-results-page-0.json')
  const detailPayload = loadFixture('job-detail-15025.json')

  const {
    CAREERS_URL,
    LISTING_API_BASE_URL,
    DETAIL_API_BASE_URL,
    PUBLIC_CAREERS_BASE_URL,
    SITE_NUMBER,
    buildJobDetailUrl,
    buildSearchUrl,
    createJubilantFoodWorksScraper,
    extractJobDetail,
    extractPaginationSummary,
    extractSearchResults,
  } = await loadJubilantFoodWorksModule()

  assert.equal(
    LISTING_API_BASE_URL,
    'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  )
  assert.equal(
    DETAIL_API_BASE_URL,
    'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  )
  assert.equal(
    PUBLIC_CAREERS_BASE_URL,
    'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant/job/',
  )
  assert.equal(SITE_NUMBER, 'CX_2005')
  assert.equal(
    buildSearchUrl(),
    'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_2005,limit=24,offset=0,location=India',
  )
  assert.equal(
    buildSearchUrl({ page: 2, limit: 10 }),
    'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_2005,limit=10,offset=20,location=India',
  )
  assert.equal(
    buildJobDetailUrl('15025'),
    'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant/job/15025',
  )

  const listings = extractSearchResults(listingPayload)

  assert.deepEqual(listings, [{
    title: 'Lead - AI Security & Data Governance | M06 | IT | Security & Audit',
    company: 'Jubilant FoodWorks',
    department: 'Corporate',
    location: 'India',
    city: null,
    jobId: '15025',
    requisitionId: '15025',
    sourceUrl: 'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant/job/15025',
    applyUrl: 'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant/job/15025',
    employmentType: 'Full time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-07',
    closingDate: null,
    jobDescription: null,
  }])

  assert.deepEqual(extractPaginationSummary(listingPayload, { page: 0 }), {
    hasNext: true,
    pageSize: 24,
    nextOffset: 24,
    totalCount: 447,
  })

  assert.deepEqual(extractJobDetail(detailPayload, listings[0]), {
    title: 'Lead - AI Security & Data Governance | M06 | IT | Security & Audit',
    company: 'Jubilant FoodWorks',
    department: 'Corporate',
    location: 'Noida, Uttar Pradesh, India',
    city: 'Noida',
    jobId: '15025',
    requisitionId: '15025',
    sourceUrl: 'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant/job/15025',
    applyUrl: 'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant/job/15025',
    employmentType: 'Full time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-07',
    closingDate: '2026-07-20',
    jobDescription: 'Lead AI Security & Data Governance',
  })

  const requestedUrls = []
  const jobs = await createJubilantFoodWorksScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, CAREERS_URL)
      return `
        <html>
          <body>
            <a href="https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/jubilant" target="_blank">
              View all jobs
            </a>
          </body>
        </html>
      `
    },
    fetchJson: async (url) => {
      requestedUrls.push(url)
      if (url === buildSearchUrl()) return listingPayload
      if (url.includes('recruitingCEJobRequisitionDetails')) return detailPayload
      throw new Error(`Unexpected Jubilant FoodWorks URL: ${url}`)
    },
  }).run()

  assert.deepEqual(requestedUrls, [
    CAREERS_URL,
    buildSearchUrl(),
    'https://fa-exph-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2215025%22,siteNumber=CX_2005',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Jubilant FoodWorks')
  assert.equal(jobs[0].source, 'jubilantfoodworks')
  assert.equal(jobs[0].city, 'Noida')
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})

test('Jubilant FoodWorks scraper fails closed when the first-party careers page no longer links to the verified Oracle board', async () => {
  const { CAREERS_URL, createJubilantFoodWorksScraper } = await loadJubilantFoodWorksModule()

  const requestedUrls = []
  const scraper = createJubilantFoodWorksScraper({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, CAREERS_URL)
      return '<html><body><a href="https://example.com/jobs">View all jobs</a></body></html>'
    },
    fetchJson: async () => {
      assert.fail('JSON endpoints should not be called when careers validation fails')
    },
  })

  await assert.rejects(
    scraper.run(),
    /verified official careers page/i,
  )

  assert.deepEqual(requestedUrls, [CAREERS_URL])
})
