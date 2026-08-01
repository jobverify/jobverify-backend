import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../scraper/iqnextsynconext/fixtures',
)

const readHtmlFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readHtmlFixture('homepage.html')
const verifiedCareers404Html = readHtmlFixture('careers-404.html')

const loadIqnextSynconextModule = async () => {
  try {
    return await import('../../scraper/iqnextsynconext/script.js')
  } catch {
    assert.fail('Expected IQnext (Synconext) scraper module at ../../scraper/iqnextsynconext/script.js')
  }
}

test('IQnext (Synconext) validates the verified homepage and missing first-party careers routes', async () => {
  const iqnextSynconext = await loadIqnextSynconextModule()

  assert.equal(iqnextSynconext.SOURCE, 'iqnextsynconext')
  assert.equal(iqnextSynconext.COMPANY, 'IQnext (Synconext)')
  assert.equal(iqnextSynconext.HOMEPAGE_URL, 'https://www.synconext.com/')
  assert.deepEqual(iqnextSynconext.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://www.synconext.com/careers',
    'https://www.synconext.com/careers/',
    'https://www.synconext.com/career',
    'https://www.synconext.com/career/',
    'https://www.synconext.com/jobs',
    'https://www.synconext.com/jobs/',
  ])
  assert.equal(iqnextSynconext.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(iqnextSynconext.hasPublicJobsSignal(verifiedHomepageHtml), false)
  assert.equal(
    iqnextSynconext.isVerifiedMissingCareersRoute({
      status: 404,
      url: iqnextSynconext.NO_PUBLIC_CAREERS_ROUTE_URLS[0],
      headers: {},
      html: verifiedCareers404Html,
    }),
    true,
  )
  assert.equal(
    iqnextSynconext.isVerifiedMissingCareersRoute({
      status: 200,
      url: iqnextSynconext.NO_PUBLIC_CAREERS_ROUTE_URLS[0],
      headers: {},
      html: '<html><body><h1>Careers</h1><a href="/jobs/design-engineer">Apply now</a></body></html>',
    }),
    false,
  )
})

test('IQnext (Synconext) returns no jobs only while the verified homepage and missing careers routes remain unchanged', async () => {
  const iqnextSynconext = await loadIqnextSynconextModule()
  const requestedUrls = []

  const jobs = await iqnextSynconext.createIqnextSynconextScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === iqnextSynconext.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedHomepageHtml,
        }
      }

      if (iqnextSynconext.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return {
          status: 404,
          url,
          headers: {},
          html: verifiedCareers404Html,
        }
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    iqnextSynconext.HOMEPAGE_URL,
    ...iqnextSynconext.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('IQnext (Synconext) fails closed when the homepage or missing careers route contract changes', async () => {
  const iqnextSynconext = await loadIqnextSynconextModule()

  await assert.rejects(
    iqnextSynconext.createIqnextSynconextScraper().run({
      fetchPage: async (url) => {
        if (url === iqnextSynconext.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><head><title>Unexpected</title></head><body></body></html>',
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: verifiedCareers404Html,
        }
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    iqnextSynconext.createIqnextSynconextScraper().run({
      fetchPage: async (url) => {
        if (url === iqnextSynconext.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: verifiedHomepageHtml,
          }
        }

        if (url === iqnextSynconext.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><body>Open Positions</body></html>',
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: verifiedCareers404Html,
        }
      },
    }),
    /careers routes changed materially or now expose public jobs/i,
  )
})
