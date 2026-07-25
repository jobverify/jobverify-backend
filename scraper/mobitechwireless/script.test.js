import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  createMobitechWirelessScraper,
  extractPublicJobs,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
} from './script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const readFixture = (name) => readFileSync(path.join(currentDir, 'fixtures', name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')

test('Mobitech Wireless homepage and careers surfaces match the verified first-party signals', () => {
  assert.equal(HOMEPAGE_URL, 'https://mobitechwireless.in/')
  assert.equal(CAREERS_URL, 'https://careers.mobitechwireless.in/')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
})

test('Mobitech Wireless careers page exposes the current public job listings', () => {
  const jobs = extractPublicJobs(careersHtml)

  assert.equal(jobs.length, 8)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Field Sales Officer - Drip Irrigation (DFlow Brand)',
      'Telecaller - Drip Irrigation Sales (DFlow Brand)',
      'Internship - Assembly & Testing',
      'Store Assistant',
      'Field Technical Engineer',
      'Quality Analyst (Software Testing)',
      'Technical Coordinator',
      'Database Administrator (PostgreSQL)',
    ],
  )
  assert.equal(jobs[0].location, 'Vijayamangalam, Tamil Nadu, India')
  assert.equal(jobs[0].employmentType, 'Permanent')
  assert.equal(jobs[0].department, 'Sales Division')
  assert.equal(jobs[0].jobId, 'field-sales-officer-drip-irrigation-dflow-brand')
  assert.match(jobs[0].sourceUrl, /^https:\/\/careers\.mobitechwireless\.in\/jobs\//)
})

test('Mobitech Wireless scraper returns first-party job records with stable metadata', async () => {
  const scraper = createMobitechWirelessScraper({
    now: () => '2026-07-11T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 8)
  assert.equal(jobs[0].source, 'mobitechwireless')
  assert.equal(jobs[0].company, 'Mobitech Wireless Solution Private Limited')
  assert.equal(jobs[0].companyCareerPage, CAREERS_URL)
  assert.equal(jobs[0].companyDomain, 'mobitechwireless.in')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T00:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
