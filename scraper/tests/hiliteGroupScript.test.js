import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../hilitegroup/fixtures',
)

const readHtmlFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const HOMEPAGE_HTML = readHtmlFixture('homepage.html')
const CAREERS_HTML = readHtmlFixture('explore-careers.html')

const loadHiliteGroupModule = async () => {
  try {
    return await import('../hilitegroup/script.js')
  } catch {
    assert.fail('Expected HiLITE Group scraper module at ../hilitegroup/script.js')
  }
}

test('HiLITE Group validates the verified homepage and first-party careers surface', async () => {
  const hilitegroup = await loadHiliteGroupModule()

  assert.equal(hilitegroup.SOURCE, 'hilitegroup')
  assert.equal(hilitegroup.COMPANY, 'HiLITE Group')
  assert.equal(hilitegroup.HOMEPAGE_URL, 'https://hilitegroup.com/')
  assert.equal(hilitegroup.CAREERS_URL, 'https://hilitegroup.com/explore-careers/')
  assert.equal(hilitegroup.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(hilitegroup.hasOfficialCareersSignal(CAREERS_HTML), true)
})

test('HiLITE Group extracts public jobs from the verified first-party careers page', async () => {
  const hilitegroup = await loadHiliteGroupModule()

  const jobs = hilitegroup.extractPublicListings(CAREERS_HTML)

  assert.equal(jobs.length, 3)
  assert.deepEqual(jobs[0], {
    title: 'Junior Engineer -Civil (Male/Female)',
    company: 'HiLITE Contracting Pvt Ltd',
    department: null,
    location: 'Site, India',
    city: 'Site',
    country: 'India',
    jobId: 'hilitegroup-junior-engineer-civil-male-female-hilite-contracting-pvt-ltd-site',
    requisitionId: 'hilitegroup-junior-engineer-civil-male-female-hilite-contracting-pvt-ltd-site',
    sourceUrl: 'https://hilitegroup.com/explore-careers/#hilitegroup-junior-engineer-civil-male-female-hilite-contracting-pvt-ltd-site',
    applyUrl: 'https://hilitegroup.com/apply/junior-engineer-civil',
    employmentType: null,
    experienceRequired: '2+ Year Experienced',
    minimumQualification: 'B-Tech /Diploma in Civil Engineering',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Company: HiLITE Contracting Pvt Ltd | Location: Site | Qualification: B-Tech /Diploma in Civil Engineering | Year of experience: 2+ Year Experienced | Vacancy: 7',
  })
  assert.equal(jobs[1].title, 'Property Consultant')
  assert.equal(jobs[1].city, null)
  assert.equal(jobs[1].location, 'Thrissur, Kunnamkulam, India')
  assert.equal(jobs[2].title, 'Site Engineer')
  assert.equal(jobs[2].city, 'Kozhikode')
})

test('HiLITE Group run fetches the verified homepage and careers page, then decorates runner fields', async () => {
  const hilitegroup = await loadHiliteGroupModule()
  const requestedUrls = []

  const jobs = await hilitegroup.createHiliteGroupScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === hilitegroup.HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === hilitegroup.CAREERS_URL) return CAREERS_HTML
      throw new Error(`Unexpected fixture URL: ${url}`)
    },
    now: () => '2026-07-10T10:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://hilitegroup.com/',
    'https://hilitegroup.com/explore-careers/',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'hilitegroup')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-10T10:00:00.000Z')
})

test('HiLITE Group fails closed when the homepage handoff or careers structure changes materially', async () => {
  const hilitegroup = await loadHiliteGroupModule()

  await assert.rejects(
    hilitegroup.createHiliteGroupScraper().run({
      fetchText: async (url) => {
        if (url === hilitegroup.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected homepage</h1></body></html>'
        }
        return CAREERS_HTML
      },
    }),
    /verified official HiLITE homepage/i,
  )

  await assert.rejects(
    hilitegroup.createHiliteGroupScraper().run({
      fetchText: async (url) => {
        if (url === hilitegroup.HOMEPAGE_URL) return HOMEPAGE_HTML
        return '<html><body><h1>Explore Careers</h1><p>No listings</p></body></html>'
      },
    }),
    /verified HiLITE careers surface/i,
  )
})
