import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'homworks',
  'fixtures',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const loadHomworksModule = async () => {
  try {
    return await import('../homworks/script.js')
  } catch {
    assert.fail('Expected Homworks scraper module at ../homworks/script.js')
  }
}

test('extractSearchResults returns no jobs when Homworks only exposes a first-party apply form with no public listings', async () => {
  const homworks = await loadHomworksModule()
  const careersHtml = readFixture('careers-page.html')

  assert.equal(homworks.CAREERS_URL, 'https://www.homworks.com/careers-homworks/')
  assert.equal(homworks.HOMEPAGE_URL, 'https://www.homworks.com/')
  assert.equal(homworks.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(homworks.hasPublicJobBoardSignal(careersHtml), false)
  assert.deepEqual(homworks.extractSearchResults(careersHtml), [])
})

test('run validates the verified Homworks careers form surface and fails closed when a public jobs board appears', async () => {
  const homworks = await loadHomworksModule()
  const careersHtml = readFixture('careers-page.html')
  const publicJobsHtml = readFixture('public-jobs-page.html')

  const requestedUrls = []
  const jobs = await homworks.createHomworksScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === homworks.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected Homworks fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [homworks.CAREERS_URL])
  assert.deepEqual(jobs, [])

  await assert.rejects(
    homworks.createHomworksScraper().run({
      fetchText: async () => publicJobsHtml,
    }),
    /public job listings/i,
  )
})
