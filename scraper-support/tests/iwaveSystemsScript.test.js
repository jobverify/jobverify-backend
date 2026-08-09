import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../scraper/iwavesystems/fixtures',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const HOMEPAGE_HTML = readFixture('homepage.html')
const CAREERS_HTML = readFixture('career.html')

const loadIWaveSystemsModule = async () => {
  try {
    return await import('../../scraper/iwavesystems/script.js')
  } catch {
    assert.fail('Expected iWave Systems scraper module at ../../scraper/iwavesystems/script.js')
  }
}

test('iWave Systems validates the official homepage and careers surface', async () => {
  const iwave = await loadIWaveSystemsModule()

  assert.equal(iwave.SOURCE, 'iwavesystems')
  assert.equal(iwave.COMPANY, 'iWave Systems')
  assert.equal(iwave.HOMEPAGE_URL, 'https://www.iwavesystems.com/')
  assert.equal(iwave.CAREERS_URL, 'https://www.iwavesystems.com/career/')
  assert.equal(iwave.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(iwave.hasOfficialCareersSignal(CAREERS_HTML), true)
})

test('iWave Systems extracts the verified first-party job listing', async () => {
  const iwave = await loadIWaveSystemsModule()

  const jobs = iwave.extractPublicListings(CAREERS_HTML)

  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Junior Accountant',
    company: 'iWave Systems',
    department: null,
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'iwavesystems-junior-accountant',
    requisitionId: 'iwavesystems-junior-accountant',
    sourceUrl: 'https://www.iwavesystems.com/career/#junior-accountant',
    applyUrl: 'mailto:career@iwavesystems.com',
    employmentType: null,
    experienceRequired: "Fresher's",
    minimumQualification: 'B.Com (2023/2024 passed out)',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2 years ago',
    closingDate: null,
    jobDescription: "Posted 2 years ago We are looking for B.Com freshers with an aggregate of 65% and above throughout without any backlog and have good knowledge in Tally with the right level of experience who display the evidence of outstanding abilities and have a track record of exceptional accomplishments with uncommon intelligence, analytical ability, and drive. Basic Accountancy Good knowledge in Tally Knowledge in Excel and MS office Different type of taxes Good communication skills Work Location: Bangalore Educational Qualification: B.Com (2023/2024 passed out) Experience: Fresher's",
  })
})

test('iWave Systems run fetches the verified homepage and careers page, then decorates jobs', async () => {
  const iwave = await loadIWaveSystemsModule()
  const requestedUrls = []

  const jobs = await iwave.createIWaveSystemsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === iwave.HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === iwave.CAREERS_URL) return CAREERS_HTML
      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.iwavesystems.com/',
    'https://www.iwavesystems.com/career/',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'iwavesystems')
  assert.equal(jobs[0].link, 'mailto:career@iwavesystems.com')
})

test('iWave Systems scraper fails closed when the official surface changes materially', async () => {
  const iwave = await loadIWaveSystemsModule()

  await assert.rejects(
    iwave.createIWaveSystemsScraper().run({
      fetchText: async (url) => {
        if (url === iwave.HOMEPAGE_URL) {
          return '<html><head><title>Unexpected</title></head><body></body></html>'
        }
        return CAREERS_HTML
      },
    }),
    /verified iWave Systems homepage/i,
  )

  await assert.rejects(
    iwave.createIWaveSystemsScraper().run({
      fetchText: async (url) => {
        if (url === iwave.HOMEPAGE_URL) return HOMEPAGE_HTML
        return '<html><body><h1>Career - iWave Systems</h1></body></html>'
      },
    }),
    /verified iWave Systems careers surface/i,
  )
})
