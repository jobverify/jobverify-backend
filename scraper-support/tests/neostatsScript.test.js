import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { normalizeScrapedJob } from '../utils/normalizeScrapedJob.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'neostats',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')

const loadNeostatsModule = async () => {
  try {
    return await import('../../scraper/neostats/script.js')
  } catch {
    assert.fail('Expected Neostats scraper module at ../../scraper/neostats/script.js')
  }
}

test('Neostats sentinels recognize the verified homepage and first-party careers page', async () => {
  const neostats = await loadNeostatsModule()

  assert.equal(neostats.SOURCE, 'neostats')
  assert.equal(neostats.COMPANY, 'NeoStats')
  assert.equal(neostats.HOMEPAGE_URL, 'https://neostats.ai/')
  assert.equal(neostats.CAREERS_URL, 'https://neostats.ai/careers')
  assert.equal(neostats.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(neostats.hasOfficialCareersSignal(careersHtml), true)
})

test('Neostats extracts the current public role cards and narrows them to India jobs', async () => {
  const neostats = await loadNeostatsModule()

  const cards = neostats.extractOpenRoleCards(careersHtml)
  const jobs = neostats.extractIndiaJobOpenings(careersHtml)

  assert.equal(cards.length, 12)
  assert.deepEqual(
    cards.slice(0, 3).map((card) => ({
      title: card.title,
      department: card.department,
      location: card.location,
      experienceRequired: card.experienceRequired,
      region: card.region,
      remoteStatus: card.remoteStatus,
    })),
    [
      {
        title: 'Data Scientist – Retail Banking Analytics',
        department: 'Data & Analytics',
        location: 'UAE',
        experienceRequired: '5+ years',
        region: 'Middle East',
        remoteStatus: 'Onsite',
      },
      {
        title: 'Dataiku Developer',
        department: 'Data & Analytics',
        location: 'Bangalore or Chennai',
        experienceRequired: '4+ years',
        region: 'South Asia',
        remoteStatus: 'Onsite',
      },
      {
        title: 'Data Scientist / Data Analyst',
        department: 'Data & Analytics',
        location: 'Bangalore',
        experienceRequired: '3+ years',
        region: 'South Asia',
        remoteStatus: 'Onsite',
      },
    ],
  )

  assert.equal(jobs.length, 4)
  assert.deepEqual(
    (({
      title,
      department,
      location,
      city,
      country,
      jobId,
      requisitionId,
      sourceUrl,
      applyUrl,
      experienceRequired,
      remoteStatus,
      requiredSkills,
    }) => ({
      title,
      department,
      location,
      city,
      country,
      jobId,
      requisitionId,
      sourceUrl,
      applyUrl,
      experienceRequired,
      remoteStatus,
      requiredSkills,
    }))(jobs[0]),
    {
      title: 'Dataiku Developer',
      department: 'Data & Analytics',
      location: 'Bangalore or Chennai, India',
      city: null,
      country: 'India',
      jobId: 'dataiku-developer-bangalore-or-chennai',
      requisitionId: 'dataiku-developer-bangalore-or-chennai',
      sourceUrl: 'https://neostats.ai/careers',
      applyUrl: 'https://neostats.ai/careers',
      experienceRequired: '4+ years',
      remoteStatus: 'On-site',
      requiredSkills: [],
    },
  )
  assert.deepEqual(
    jobs.map((job) => job.title),
    [
      'Dataiku Developer',
      'Data Scientist / Data Analyst',
      'Data Analyst / Python Developer',
      'Operation Lead',
    ],
  )
})

test('Neostats normalizes an extracted India opening into the shared scraper contract', async () => {
  const neostats = await loadNeostatsModule()

  const opening = neostats.extractIndiaJobOpenings(careersHtml)[0]
  const normalized = normalizeScrapedJob(opening, {
    source: 'neostats',
    companyName: 'NeoStats',
    companyCareerPage: 'https://neostats.ai/careers',
    atsPlatform: 'official-company-careers',
    countryFilter: 'India',
  })

  assert.equal(normalized.company, 'NeoStats')
  assert.equal(normalized.country, 'India')
  assert.equal(normalized.remoteStatus, 'On-site')
  assert.equal(normalized.jobType, 'Full-time Experienced')
})

test('Neostats run verifies the trusted surfaces and returns the current India openings', async () => {
  const neostats = await loadNeostatsModule()
  const requestedUrls = []

  const jobs = await neostats.createNeostatsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === neostats.HOMEPAGE_URL) return homepageHtml
      if (url === neostats.CAREERS_URL) return careersHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    neostats.HOMEPAGE_URL,
    neostats.CAREERS_URL,
  ])
  assert.equal(jobs.length, 4)
  assert.equal(jobs[0].company, 'NeoStats')
  assert.equal(jobs[0].source, 'neostats')
  assert.equal(jobs[0].link, 'https://neostats.ai/careers')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('Neostats fails closed when the verified homepage or careers page contract changes', async () => {
  const neostats = await loadNeostatsModule()

  await assert.rejects(
    neostats.createNeostatsScraper().run({
      fetchText: async (url) => {
        if (url === neostats.HOMEPAGE_URL) {
          return homepageHtml.replace('href="/careers"', 'href="/about"')
        }

        return careersHtml
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    neostats.createNeostatsScraper().run({
      fetchText: async (url) => {
        if (url === neostats.HOMEPAGE_URL) return homepageHtml
        if (url === neostats.CAREERS_URL) return '<html><body><h1>Careers</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified public careers page/i,
  )
})
