import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'lumber',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')
const boardHtml = readFixture('board.html')
const jobDetailHtml = readFixture('job-detail-rookie-trader-sales-trainee.html')

const loadLumberModule = async () => {
  try {
    return await import('../lumber/script.js')
  } catch {
    assert.fail('Expected Lumber scraper module at ../lumber/script.js')
  }
}

test('Lumber scraper recognizes the verified homepage, careers page, and applytojob job detail surface', async () => {
  const lumber = await loadLumberModule()

  assert.equal(lumber.SOURCE, 'lumber')
  assert.equal(lumber.COMPANY, 'Lumber')
  assert.equal(lumber.HOMEPAGE_URL, 'https://www.lumber.com/')
  assert.equal(lumber.CAREERS_URL, 'https://www.lumber.com/careers')
  assert.equal(lumber.BOARD_URL, 'https://americaninternationalforestproductsllc.applytojob.com/apply')
  assert.equal(lumber.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(lumber.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(lumber.hasVerifiedBoardSignal(boardHtml), true)
  assert.equal(lumber.hasVerifiedJobDetailSignal(jobDetailHtml), true)

  const jobs = lumber.extractBoardJobs(boardHtml)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Rookie Trader - Sales Trainee',
    company: 'Lumber',
    department: null,
    location: 'Portland, OR',
    city: 'Portland',
    country: 'United States',
    jobId: 'rITjkVAYUS',
    requisitionId: 'rITjkVAYUS',
    sourceUrl: 'https://americaninternationalforestproductsllc.applytojob.com/apply/rITjkVAYUS/Rookie-Trader-Sales-Trainee',
    applyUrl: 'https://americaninternationalforestproductsllc.applytojob.com/apply/rITjkVAYUS/Rookie-Trader-Sales-Trainee',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
})

test('Lumber scraper fetches the verified homepage and careers surface before decorating the current opening', async () => {
  const lumber = await loadLumberModule()
  const requestedUrls = []

  const jobs = await lumber.createLumberScraper({
    now: () => '2026-07-11T08:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === lumber.HOMEPAGE_URL) return homepageHtml
      if (url === lumber.CAREERS_URL) return careersHtml
      if (url === lumber.BOARD_URL) return boardHtml
      if (url === 'https://americaninternationalforestproductsllc.applytojob.com/apply/rITjkVAYUS/Rookie-Trader-Sales-Trainee') {
        return jobDetailHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    lumber.HOMEPAGE_URL,
    lumber.CAREERS_URL,
    lumber.BOARD_URL,
    'https://americaninternationalforestproductsllc.applytojob.com/apply/rITjkVAYUS/Rookie-Trader-Sales-Trainee',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'lumber')
  assert.equal(jobs[0].company, 'Lumber')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('Lumber catalog registration is present and buildScrapers exposes the runnable scraper', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lumber')

  assert.ok(provider, 'Expected Lumber provider in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Lumber')
  assert.equal(provider.companyCareerPage, 'https://www.lumber.com/careers')
  assert.equal(provider.atsPlatform, 'official-careers-page-plus-applytojob-board')
  assert.equal(provider.countryFilter, 'United States')
  assert.equal(
    provider.paginationStrategy,
    'validate-official-careers-page-then-read-linked-public-applytojob-board',
  )
  assert.equal(
    provider.extractionStrategy,
    'official-careers-page-handoff-verification-plus-board-role-card-parsing',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.companyDomain, 'lumber.com')
  assert.match(provider.modulePath, /lumber[\\/]script\.js$/i)

  const scraper = buildScrapers().find((item) => item.name === 'lumber')

  assert.ok(scraper, 'Expected buildScrapers() to return the Lumber scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'lumber')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.lumber.com/careers')
  assert.match(scraper.dryRunFile, /lumber[\\/]jobs\.json$/i)
})
