import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../mitsubishipowerindia/fixtures',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const loadModule = async () => {
  try {
    return await import('../mitsubishipowerindia/script.js')
  } catch {
    assert.fail('Expected Mitsubishi Power India scraper module at ../scraper/mitsubishipowerindia/script.js')
  }
}

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')
const currentOpeningsHtml = readFixture('current-openings.html')

test('Mitsubishi Power India pins the verified first-party homepage, careers page, and jobs shell', async () => {
  const scraper = await loadModule()

  assert.equal(scraper.SOURCE, 'mitsubishipowerindia')
  assert.equal(scraper.COMPANY, 'Mitsubishi Power India Private Limited')
  assert.equal(scraper.HOMEPAGE_URL, 'https://power.mhi.com/regions/ind/')
  assert.equal(scraper.CAREERS_URL, 'https://power.mhi.com/regions/ind/careers')
  assert.equal(scraper.CURRENT_OPENINGS_URL, 'https://mitsubishi.talentrecruit.com/')
  assert.equal(scraper.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(scraper.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(scraper.hasOfficialCurrentOpeningsSignal(currentOpeningsHtml), true)
  assert.equal(scraper.hasPublicJobListings(homepageHtml), false)
  assert.equal(scraper.hasPublicJobListings(careersHtml), false)
  assert.equal(scraper.hasPublicJobListings(currentOpeningsHtml), false)
})

test('Mitsubishi Power India returns no jobs while the verified public surfaces stay unchanged', async () => {
  const scraper = await loadModule()
  const requestedUrls = []

  const jobs = await scraper.createMitsubishiPowerIndiaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === scraper.HOMEPAGE_URL) return homepageHtml
      if (url === scraper.CAREERS_URL) return careersHtml
      if (url === scraper.CURRENT_OPENINGS_URL) return currentOpeningsHtml
      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    scraper.HOMEPAGE_URL,
    scraper.CAREERS_URL,
    scraper.CURRENT_OPENINGS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Mitsubishi Power India fails closed when the careers contract changes', async () => {
  const scraper = await loadModule()

  await assert.rejects(
    scraper.createMitsubishiPowerIndiaScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL) return homepageHtml
        if (url === scraper.CAREERS_URL) {
          return careersHtml.replace('Current Openings', 'Open Positions')
        }
        if (url === scraper.CURRENT_OPENINGS_URL) return currentOpeningsHtml
        throw new Error(`Unexpected fixture URL: ${url}`)
      },
    }),
    /careers page changed/i,
  )
})
