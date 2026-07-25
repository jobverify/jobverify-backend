import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../mehtahitechindustriesltd/fixtures',
)

const readHtmlFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const HOMEPAGE_HTML = readHtmlFixture('homepage.html')
const CAREERS_HTML = readHtmlFixture('jobs.html')

const loadMehtaHitechModule = async () => {
  try {
    return await import('../mehtahitechindustriesltd/script.js')
  } catch {
    assert.fail('Expected Mehta Hitech Industries Ltd. scraper module at ../mehtahitechindustriesltd/script.js')
  }
}

test('Mehta Hitech Industries Ltd. validates the verified homepage and first-party careers surface', async () => {
  const mehtaHitech = await loadMehtaHitechModule()

  assert.equal(mehtaHitech.SOURCE, 'mehtahitechindustriesltd')
  assert.equal(mehtaHitech.COMPANY, 'Mehta Hitech Industries Ltd.')
  assert.equal(mehtaHitech.HOMEPAGE_URL, 'https://www.mehtahitech.com/')
  assert.equal(mehtaHitech.CAREERS_URL, 'https://www.mehtahitech.com/jobs.html')
  assert.equal(mehtaHitech.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(mehtaHitech.hasOfficialCareersSignal(CAREERS_HTML), true)
})

test('Mehta Hitech Industries Ltd. extracts the public job opening from the verified careers page', async () => {
  const mehtaHitech = await loadMehtaHitechModule()

  const jobs = mehtaHitech.extractPublicListings(CAREERS_HTML)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Marketing Executives',
    company: 'Mehta Hitech Industries Ltd.',
    department: 'Marketing',
    location: 'Ahmedabad, Gujarat, India',
    city: 'Ahmedabad',
    country: 'India',
    jobId: 'mehtahitechindustriesltd-marketing-executives',
    requisitionId: 'mehtahitechindustriesltd-marketing-executives',
    sourceUrl: 'https://www.mehtahitech.com/jobs.html#mehtahitechindustriesltd-marketing-executives',
    applyUrl: 'https://www.mehtahitech.com/jobs.html',
    employmentType: null,
    experienceRequired: '0 to 3 Years',
    minimumQualification: 'Graduation + MBA Marketing',
    preferredQualification: 'Good Communication Skills, Management Skills, Presentation Skills, Good command over English',
    requiredSkills: ['Good Communication Skills', 'Management Skills', 'Presentation Skills', 'Good command over English'],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Company: Mehta Hitech Industries Ltd. | Location: Ahmedabad | Qualification: Graduation + MBA Marketing | Year of experience: 0 to 3 Years | Notes: 25+ years experienced manufacturing company is looking for Marketing executives with following skills:',
  })
})

test('Mehta Hitech Industries Ltd. run fetches the verified homepage and careers page, then decorates runner fields', async () => {
  const mehtaHitech = await loadMehtaHitechModule()
  const requestedUrls = []

  const jobs = await mehtaHitech.createMehtaHitechIndustriesLtdScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === mehtaHitech.HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === mehtaHitech.CAREERS_URL) return CAREERS_HTML
      throw new Error(`Unexpected fixture URL: ${url}`)
    },
    now: () => '2026-07-10T10:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.mehtahitech.com/',
    'https://www.mehtahitech.com/jobs.html',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'mehtahitechindustriesltd')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-10T10:00:00.000Z')
})

test('Mehta Hitech Industries Ltd. fails closed when the homepage handoff or careers structure changes materially', async () => {
  const mehtaHitech = await loadMehtaHitechModule()

  await assert.rejects(
    mehtaHitech.createMehtaHitechIndustriesLtdScraper().run({
      fetchText: async (url) => {
        if (url === mehtaHitech.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected homepage</h1></body></html>'
        }
        return CAREERS_HTML
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    mehtaHitech.createMehtaHitechIndustriesLtdScraper().run({
      fetchText: async (url) => {
        if (url === mehtaHitech.HOMEPAGE_URL) return HOMEPAGE_HTML
        return '<html><body><h1>Career Opportunities</h1><p>No listings</p></body></html>'
      },
    }),
    /verified careers surface/i,
  )
})
