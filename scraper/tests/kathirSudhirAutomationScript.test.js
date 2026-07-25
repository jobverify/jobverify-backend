import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'kathirsudhirautomation',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readFixture('homepage.html')
const verifiedCareersHtml = readFixture('careers.html')

const loadKathirSudhirAutomationModule = async () => {
  try {
    return await import('../kathirsudhirautomation/script.js')
  } catch {
    assert.fail('Expected Kathir Sudhir Automation scraper module at ../kathirsudhirautomation/script.js')
  }
}

test('Kathir Sudhir Automation scraper validates the verified first-party homepage and careers page', async () => {
  const scraperModule = await loadKathirSudhirAutomationModule()

  assert.equal(scraperModule.SOURCE, 'kathirsudhirautomation')
  assert.equal(scraperModule.COMPANY, 'Kathir Sudhir Automation')
  assert.equal(scraperModule.HOMEPAGE_URL, 'https://www.kathirsudhirautomation.com/')
  assert.equal(scraperModule.CAREERS_URL, 'https://www.kathirsudhirautomation.com/career')
  assert.equal(scraperModule.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(scraperModule.hasOfficialCareersSignal(verifiedCareersHtml), true)

  const jobs = scraperModule.extractPublicJobs(verifiedCareersHtml)

  assert.equal(jobs.length, 5)
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Accounts & Customer Support Executive',
      'Graduate Engineer Trainee (GET)',
      'Marketing and sales',
      'Sales & Business Development Executive',
      'SCM Engineer & Lead',
    ],
  )
  assert.deepEqual(
    jobs.map((job) => job.location),
    Array(5).fill('Chennai, Tamil Nadu, India'),
  )
  assert.ok(
    jobs.every((job) =>
      job.company === 'Kathir Sudhir Automation'
      && job.country === 'India'
      && job.city === 'Chennai'
      && job.applyUrl === 'https://docs.google.com/forms/d/e/ksa-apply/viewform'
      && job.sourceUrl.startsWith('https://www.kathirsudhirautomation.com/career#kathirsudhirautomation-')
    ),
  )
  assert.equal(jobs.find((job) => job.title === 'Accounts & Customer Support Executive')?.minimumQualification, 'Bcom (any) preferred Zoho Books Knowledge')
  assert.equal(jobs.find((job) => job.title === 'Sales & Business Development Executive')?.experienceRequired, '0-3 years / Freshers can apply')
})

test('Kathir Sudhir Automation run fetches the verified first-party pages and decorates jobs for persistence', async () => {
  const scraperModule = await loadKathirSudhirAutomationModule()
  const requestedUrls = []

  const jobs = await scraperModule.createKathirSudhirAutomationScraper({
    now: () => '2026-07-11T06:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === scraperModule.HOMEPAGE_URL) return verifiedHomepageHtml
      if (url === scraperModule.CAREERS_URL) return verifiedCareersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [scraperModule.HOMEPAGE_URL, scraperModule.CAREERS_URL])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'kathirsudhirautomation')
  assert.equal(jobs[0].companyCareerPage, 'https://www.kathirsudhirautomation.com/career')
  assert.equal(jobs[0].companyDomain, 'kathirsudhirautomation.com')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T06:00:00.000Z')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})

test('Kathir Sudhir Automation fails closed when the verified homepage or careers page drifts', async () => {
  const scraperModule = await loadKathirSudhirAutomationModule()

  await assert.rejects(
    scraperModule.createKathirSudhirAutomationScraper().run({
      fetchText: async (url) => {
        if (url === scraperModule.HOMEPAGE_URL) {
          return '<html><title>Unexpected</title><body>No company markers</body></html>'
        }

        return verifiedCareersHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    scraperModule.createKathirSudhirAutomationScraper().run({
      fetchText: async (url) => {
        if (url === scraperModule.HOMEPAGE_URL) return verifiedHomepageHtml

        return verifiedCareersHtml.replace('Electronics Core Company Jobs', 'Open Roles')
      },
    }),
    /verified careers page/i,
  )
})
