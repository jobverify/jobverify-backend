import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../scraper/kodnest/fixtures',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readFixture('homepage.html')
const verifiedCareersHtml = readFixture('careers.html')
const verifiedBundleJs = readFixture('bundle.js')

const loadModule = async () => {
  try {
    return await import('../../scraper/kodnest/script.js')
  } catch {
    assert.fail('Expected KodNest scraper module at ../../scraper/kodnest/script.js')
  }
}

test('KodNest validates the verified homepage shell, careers shell, and no-careers bundle contract', async () => {
  const kodnest = await loadModule()

  assert.equal(kodnest.SOURCE, 'kodnest')
  assert.equal(kodnest.COMPANY, 'KodNest')
  assert.equal(kodnest.HOMEPAGE_URL, 'https://www.kodnest.com/')
  assert.deepEqual(kodnest.CAREERS_ROUTE_URLS, [
    'https://www.kodnest.com/careers',
    'https://www.kodnest.com/careers/',
  ])
  assert.equal(kodnest.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(kodnest.hasPublicJobsSignal(verifiedHomepageHtml), false)
  assert.equal(kodnest.extractBundleAssetPath(verifiedHomepageHtml), '/assets/index-gPB9h3F3.js')
  assert.equal(kodnest.hasVerifiedBundleSignal(verifiedBundleJs), true)
  assert.equal(
    kodnest.routeMatchesVerifiedShell(
      verifiedCareersHtml,
      kodnest.extractBundleAssetPath(verifiedHomepageHtml),
    ),
    true,
  )
})

test('KodNest returns no jobs only while the verified homepage shell, careers shell, and bundle contract remain unchanged', async () => {
  const kodnest = await loadModule()
  const requestedPages = []
  const requestedText = []

  const jobs = await kodnest.createKodNestScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === kodnest.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedHomepageHtml,
        }
      }

      if (kodnest.CAREERS_ROUTE_URLS.includes(url)) {
        return {
          status: 200,
          url,
          headers: {},
          html: verifiedCareersHtml,
        }
      }

      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchText: async (url) => {
      requestedText.push(url)

      if (url === 'https://www.kodnest.com/assets/index-gPB9h3F3.js') {
        return verifiedBundleJs
      }

      throw new Error(`Unexpected text URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    kodnest.HOMEPAGE_URL,
    ...kodnest.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(requestedText, ['https://www.kodnest.com/assets/index-gPB9h3F3.js'])
  assert.deepEqual(jobs, [])
})

test('KodNest fails closed when the homepage shell, careers shell, or bundle no-careers contract changes', async () => {
  const kodnest = await loadModule()

  await assert.rejects(
    kodnest.createKodNestScraper().run({
      fetchPage: async (url) => {
        if (url === kodnest.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><head><title>Unexpected</title></head><body></body></html>',
          }
        }

        return {
          status: 200,
          url,
          headers: {},
          html: verifiedCareersHtml,
        }
      },
      fetchText: async () => verifiedBundleJs,
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    kodnest.createKodNestScraper().run({
      fetchPage: async (url) => {
        if (url === kodnest.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: verifiedHomepageHtml,
          }
        }

        if (url === kodnest.CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><body><h1>Careers</h1><a href="/jobs/full-stack-trainer">Apply now</a></body></html>',
          }
        }

        return {
          status: 200,
          url,
          headers: {},
          html: verifiedCareersHtml,
        }
      },
      fetchText: async () => verifiedBundleJs,
    }),
    /careers routes changed materially or now expose public jobs/i,
  )

  await assert.rejects(
    kodnest.createKodNestScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        headers: {},
        html: url === kodnest.HOMEPAGE_URL ? verifiedHomepageHtml : verifiedCareersHtml,
      }),
      fetchText: async () =>
        'const redirects=[{from:"/careers",to:"/join-our-team",action:"301",note:"P0: careers live"}];',
    }),
    /client bundle changed materially or no longer confirms the verified no-careers route contract/i,
  )
})
