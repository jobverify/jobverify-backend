import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'hike',
)

const readHtmlFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readHtmlFixture('homepage-502.html')
const verifiedCareersHtml = readHtmlFixture('careers-502.html')

const loadHikeModule = async () => {
  try {
    return await import('../hike/script.js')
  } catch {
    assert.fail('Expected Hike scraper module at ../hike/script.js')
  }
}

test('Hike sentinels recognize the verified first-party outage shell', async () => {
  const hike = await loadHikeModule()

  assert.equal(hike.SOURCE, 'hike')
  assert.equal(hike.COMPANY, 'Hike')
  assert.equal(hike.HOMEPAGE_URL, 'https://www.hike.in/')
  assert.deepEqual(hike.CAREERS_ROUTE_URLS, [
    'https://www.hike.in/careers',
    'https://www.hike.in/careers/',
    'https://www.hike.in/jobs',
    'https://www.hike.in/jobs/',
    'https://www.hike.in/career',
    'https://www.hike.in/career/',
  ])
  assert.equal(hike.hasVerifiedFirstPartyOutageSignal(verifiedHomepageHtml), true)
  assert.equal(hike.hasPublicJobsSignal(verifiedHomepageHtml), false)
  assert.equal(
    hike.isVerifiedOutagePage({ status: 502, html: verifiedCareersHtml }),
    true,
  )
})

test('Hike returns no jobs only while the verified first-party outage shell holds', async () => {
  const hike = await loadHikeModule()
  const requestedUrls = []

  const jobs = await hike.createHikeScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === hike.HOMEPAGE_URL) {
        return {
          status: 502,
          url,
          html: verifiedHomepageHtml,
        }
      }

      if (hike.CAREERS_ROUTE_URLS.includes(url)) {
        return {
          status: 502,
          url,
          html: verifiedCareersHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    hike.HOMEPAGE_URL,
    ...hike.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Hike fails closed when the verified outage shell changes or starts exposing jobs', async () => {
  const hike = await loadHikeModule()

  await assert.rejects(
    hike.createHikeScraper().run({
      fetchPage: async (url) => ({
        status: url === hike.HOMEPAGE_URL ? 200 : 502,
        url,
        html: verifiedHomepageHtml,
      }),
    }),
    /verified official homepage surface/i,
  )

  await assert.rejects(
    hike.createHikeScraper().run({
      fetchPage: async (url) => ({
        status: 502,
        url,
        html: url === hike.HOMEPAGE_URL
          ? verifiedHomepageHtml
          : verifiedCareersHtml.replace(
            '</body>',
            '<a href="https://jobs.lever.co/hike">Open positions</a></body>',
          ),
      }),
    }),
    /careers routes changed materially or now expose public jobs/i,
  )

  await assert.rejects(
    hike.createHikeScraper().run({
      fetchPage: async (url) => ({
        status: 502,
        url,
        html: url === hike.HOMEPAGE_URL
          ? verifiedHomepageHtml
          : verifiedCareersHtml.replace('Please try again in 30 seconds.', 'Unexpected copy.'),
      }),
    }),
    /careers routes changed materially or now expose public jobs/i,
  )
})
