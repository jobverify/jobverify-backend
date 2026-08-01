import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FIXED_SCRAPED_AT = '2026-07-10T00:00:00.000Z'
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixtureDir = path.resolve(currentDir, '../../scraper/greenkohub/fixtures')

const officialHomepageHtml = readFileSync(
  path.join(fixtureDir, 'official-homepage.html'),
  'utf8',
)

const listingPayload = JSON.parse(
  readFileSync(path.join(fixtureDir, 'alljobs-page-1.json'), 'utf8'),
)

const loadGreenkoHubModule = async () => {
  try {
    return await import('../../scraper/greenkohub/script.js')
  } catch {
    assert.fail('Expected Greenko Hub scraper module at ../../scraper/greenkohub/script.js')
  }
}

test('Greenko Hub scraper keeps the verified homepage to Darwinbox handoff explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    OFFICIAL_HOMEPAGE_URL,
    PUBLIC_JOBS_URL,
    SOURCE,
    createGreenkoHubScraper,
    extractOfficialPublicJobsUrl,
    hasOfficialGreenkoHubHomepageSignals,
  } = await loadGreenkoHubModule()

  assert.equal(COMPANY_NAME, 'Greenko Hub')
  assert.equal(SOURCE, 'greenkohub')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://greenkogroup.darwinbox.in')
  assert.equal(OFFICIAL_HOMEPAGE_URL, 'https://www.greenkogroup.com/')
  assert.equal(
    PUBLIC_JOBS_URL,
    'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    extractOfficialPublicJobsUrl(officialHomepageHtml),
    PUBLIC_JOBS_URL,
  )
  assert.equal(hasOfficialGreenkoHubHomepageSignals(officialHomepageHtml), true)
  assert.equal(
    hasOfficialGreenkoHubHomepageSignals(
      officialHomepageHtml.replace(
        'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs',
        'https://example.com/jobs',
      ),
    ),
    false,
  )

  const scraper = createGreenkoHubScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () =>
        officialHomepageHtml.replace(
          'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/allJobs',
          'https://example.com/jobs',
        ),
      fetchListingPage: async () => listingPayload,
    }),
    /verified official homepage no longer matches the verified public jobs surface/i,
  )
})

test('run maps verified Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
  const { createGreenkoHubScraper } = await loadGreenkoHubModule()
  const scraper = createGreenkoHubScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedPages = []

  const jobs = await scraper.run({
    fetchText: async () => officialHomepageHtml,
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      return listingPayload
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs, [
    {
      title: 'Officer',
      company: 'Greenko Hub',
      department: 'Greenko Security Services',
      location: 'Neemuch, Neemuch, Madhya Pradesh, India',
      city: 'Neemuch',
      jobId: 'a6a366a37046e4',
      requisitionId: null,
      sourceUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a366a37046e4',
      applyUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a366a37046e4',
      employmentType: 'Employee - Regular',
      experienceRequired: '17 - 20 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '20-Jun-2026',
      closingDate: null,
      jobDescription: null,
      source: 'greenkohub',
      link: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a366a37046e4',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Associate',
      company: 'Greenko Hub',
      department: 'Contracts & Procurement',
      location: 'Admin Office - Hyderabad, Hyderabad, Telangana, India',
      city: 'Admin Office - Hyderabad',
      jobId: 'a6a225d73da6e0',
      requisitionId: null,
      sourceUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a225d73da6e0',
      applyUrl: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a225d73da6e0',
      employmentType: 'Employee - Regular',
      experienceRequired: '2 - 4 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '05-Jun-2026',
      closingDate: null,
      jobDescription: '<p><br /></p>',
      source: 'greenkohub',
      link: 'https://greenkogroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a225d73da6e0',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
