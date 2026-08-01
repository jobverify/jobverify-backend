import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'k12technoservicespvtltd',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const HOMEPAGE_HTML = readFixture('homepage.html')
const CAREERS_HTML = readFixture('we-are-hiring.html')

const loadModule = async () => {
  try {
    return await import('../../scraper/k12technoservicespvtltd/script.js')
  } catch {
    assert.fail('Expected K12 Techno Services Pvt. Ltd. scraper module at ../../scraper/k12technoservicespvtltd/script.js')
  }
}

test('K12 Techno Services Pvt. Ltd. validates the verified homepage and first-party hiring page', async () => {
  const scraperModule = await loadModule()

  assert.equal(scraperModule.SOURCE, 'k12technoservicespvtltd')
  assert.equal(scraperModule.COMPANY, 'K12 Techno Services Pvt. Ltd.')
  assert.equal(scraperModule.HOMEPAGE_URL, 'https://www.orchidsinternationalschool.com/')
  assert.equal(scraperModule.CAREERS_URL, 'https://www.orchidsinternationalschool.com/we-are-hiring')
  assert.equal(scraperModule.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(scraperModule.hasOfficialCareersSignal(CAREERS_HTML), true)
})

test('K12 Techno Services Pvt. Ltd. extracts the verified public role categories from the hiring page', async () => {
  const scraperModule = await loadModule()

  const jobs = scraperModule.extractPublicListings(CAREERS_HTML)

  assert.equal(jobs.length, 5)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      applyUrl: job.applyUrl,
      sourceUrl: job.sourceUrl,
      experienceRequired: job.experienceRequired,
    })),
    [
      {
        title: 'Arts & Computers Teacher',
        location: 'India',
        applyUrl:
          'mailto:careers@orchids.edu.in?subject=Application%20%E2%80%93%20Arts%20%26%20Computers%20Teacher%20%E2%80%93%20%5BYour%20Name%5D',
        sourceUrl: 'https://www.orchidsinternationalschool.com/we-are-hiring#arts-computers',
        experienceRequired: 'Freshers to 10+ years welcome',
      },
      {
        title: 'Pre-Primary Teacher',
        location: 'India',
        applyUrl:
          'mailto:careers@orchids.edu.in?subject=Application%20%E2%80%93%20Pre-Primary%20Teacher%20%E2%80%93%20%5BYour%20Name%5D',
        sourceUrl: 'https://www.orchidsinternationalschool.com/we-are-hiring#pre-primary',
        experienceRequired: 'Freshers to 10+ years welcome',
      },
      {
        title: 'Primary Teacher',
        location: 'India',
        applyUrl:
          'mailto:careers@orchids.edu.in?subject=Application%20%E2%80%93%20Primary%20Teacher%20%E2%80%93%20%5BYour%20Name%5D',
        sourceUrl: 'https://www.orchidsinternationalschool.com/we-are-hiring#primary',
        experienceRequired: 'Freshers to 10+ years welcome',
      },
      {
        title: 'Secondary Teacher',
        location: 'India',
        applyUrl:
          'mailto:careers@orchids.edu.in?subject=Application%20%E2%80%93%20Secondary%20Teacher%20%E2%80%93%20%5BYour%20Name%5D',
        sourceUrl: 'https://www.orchidsinternationalschool.com/we-are-hiring#secondary',
        experienceRequired: 'Freshers to 10+ years welcome',
      },
      {
        title: 'Sports Teacher',
        location: 'India',
        applyUrl:
          'mailto:careers@orchids.edu.in?subject=Application%20%E2%80%93%20Sports%20Teacher%20%E2%80%93%20%5BYour%20Name%5D',
        sourceUrl: 'https://www.orchidsinternationalschool.com/we-are-hiring#sports',
        experienceRequired: 'Freshers to 10+ years welcome',
      },
    ],
  )
  assert.equal(jobs[0].company, 'K12 Techno Services Pvt. Ltd.')
  assert.equal(jobs[0].country, 'India')
  assert.match(jobs[0].jobDescription, /110\+ campuses across India/i)
  assert.match(jobs[0].jobDescription, /Immediate openings available/i)
})

test('K12 Techno Services Pvt. Ltd. run fetches the verified homepage and hiring page before returning jobs', async () => {
  const scraperModule = await loadModule()
  const requestedUrls = []

  const jobs = await scraperModule.createK12TechnoServicesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === scraperModule.HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === scraperModule.CAREERS_URL) return CAREERS_HTML

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
    now: () => '2026-07-10T10:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.orchidsinternationalschool.com/',
    'https://www.orchidsinternationalschool.com/we-are-hiring',
  ])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'k12technoservicespvtltd')
  assert.equal(jobs[0].companyCareerPage, 'https://www.orchidsinternationalschool.com/we-are-hiring')
  assert.equal(jobs[0].companyDomain, 'orchidsinternationalschool.com')
  assert.equal(jobs[0].scrapedAt, '2026-07-10T10:00:00.000Z')
})

test('K12 Techno Services Pvt. Ltd. fails closed when the homepage or hiring contract changes materially', async () => {
  const scraperModule = await loadModule()

  await assert.rejects(
    scraperModule.createK12TechnoServicesScraper().run({
      fetchText: async (url) => {
        if (url === scraperModule.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body></body></html>'
        }

        return CAREERS_HTML
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    scraperModule.createK12TechnoServicesScraper().run({
      fetchText: async (url) => {
        if (url === scraperModule.HOMEPAGE_URL) return HOMEPAGE_HTML
        return '<html><body><h1>We Are Hiring</h1><p>Send resume to careers@orchids.edu.in</p></body></html>'
      },
    }),
    /verified first-party hiring page/i,
  )
})
