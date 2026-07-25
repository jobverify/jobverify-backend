import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../tests/fixtures/nitaragormalonellp',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')

const loadNitaraGormaloneModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected NITARA Gormalone LLP scraper module at ./script.js')
  }
}

test('NITARA Gormalone LLP scraper constants stay pinned to the verified first-party homepage and careers page', async () => {
  const nitara = await loadNitaraGormaloneModule()

  assert.equal(nitara.SOURCE, 'nitaragormalonellp')
  assert.equal(nitara.COMPANY, 'NITARA Gormalone LLP')
  assert.equal(nitara.HOMEPAGE_URL, 'https://gormalone.com/')
  assert.equal(nitara.CAREERS_URL, 'https://gormalone.com/careers.html')
  assert.equal(nitara.APPLY_EMAIL, 'hr@gormalone.com')
  assert.equal(nitara.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(nitara.hasOfficialCareersSignal(careersHtml), true)
})

test('NITARA Gormalone LLP extracts public first-party PDF-backed openings from the verified careers page', async () => {
  const nitara = await loadNitaraGormaloneModule()

  const jobs = nitara.extractPublicListings(careersHtml)

  assert.equal(jobs.length, 5)
  assert.deepEqual(jobs[0], {
    title: 'Female Field Associate',
    company: 'NITARA Gormalone LLP',
    department: 'Early Careers',
    location: null,
    city: null,
    country: 'India',
    jobId: 'nitaragormalonellp-female-field-associate',
    requisitionId: 'nitaragormalonellp-female-field-associate',
    sourceUrl: 'https://gormalone.com/files/JD/JD-Female%20Field%20Associate.pdf',
    applyUrl: 'mailto:hr@gormalone.com',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Official NITARA Gormalone LLP opening for Female Field Associate in Early Careers. Review the first-party job description PDF and email hr@gormalone.com to apply.',
  })
  assert.deepEqual(
    jobs.map((job) => ({ title: job.title, department: job.department })),
    [
      { title: 'Female Field Associate', department: 'Early Careers' },
      { title: 'Senior Business Development Associate', department: 'Mid-Level Careers' },
      { title: 'Senior Business Development Executive', department: 'Mid-Level Careers' },
      { title: 'Embedded Systems Consultant', department: 'Experienced Professionals' },
      { title: 'Senior Business Development Specialist', department: 'Experienced Professionals' },
    ],
  )
  assert.equal(
    jobs.at(-1)?.sourceUrl,
    'https://gormalone.com/files/JD/JD%20-%20Senior%20Business%20Development%20Specialist.pdf',
  )
})

test('NITARA Gormalone LLP run verifies the homepage handoff and decorates public jobs for persistence', async () => {
  const nitara = await loadNitaraGormaloneModule()
  const requestedUrls = []

  const jobs = await nitara.createNitaraGormaloneLlpScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === nitara.HOMEPAGE_URL) return homepageHtml
      if (url === nitara.CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-11T04:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [nitara.HOMEPAGE_URL, nitara.CAREERS_URL])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, 'nitaragormalonellp')
  assert.equal(jobs[0].link, 'https://gormalone.com/files/JD/JD-Female%20Field%20Associate.pdf')
  assert.equal(jobs[0].scrapedAt, '2026-07-11T04:00:00.000Z')
})

test('NITARA Gormalone LLP fails closed when the verified homepage handoff or careers jobs surface changes', async () => {
  const nitara = await loadNitaraGormaloneModule()

  await assert.rejects(
    nitara.createNitaraGormaloneLlpScraper().run({
      fetchText: async (url) => {
        if (url === nitara.HOMEPAGE_URL) return '<html><title>Unexpected</title></html>'
        return careersHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    nitara.createNitaraGormaloneLlpScraper().run({
      fetchText: async (url) => {
        if (url === nitara.HOMEPAGE_URL) return homepageHtml
        return '<html><body><h1>Careers</h1><p>Send your CV to hr@gormalone.com</p></body></html>'
      },
    }),
    /verified first-party careers page|public job openings/i,
  )
})
