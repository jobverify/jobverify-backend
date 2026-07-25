import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  CAREERS_API_URL,
  CAREERS_URL,
  COMPANY,
  HOMEPAGE_URL,
  SOURCE,
  createStoreysRealEstateScraper,
  extractBundleUrl,
  hasBundleApplyModalSignal,
  hasCareersMarketingSignal,
  hasHomepageSignal,
  hasPublicJobsSignal,
} from './script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const readFixture = (name) => readFileSync(path.join(currentDir, 'fixtures', name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')
const bundleJs = readFixture('bundle.js')
const bundleUrl = 'https://www.storeys.ae/assets/index-y7euq6Rn.js'

test('Storeys Real Estate sentinel pins the verified first-party careers marketing page and apply-modal bundle contract', () => {
  assert.equal(SOURCE, 'storeysrealestate')
  assert.equal(COMPANY, 'Storeys Real Estate')
  assert.equal(HOMEPAGE_URL, 'https://www.storeys.ae/')
  assert.equal(CAREERS_URL, 'https://www.storeys.ae/careers')
  assert.equal(CAREERS_API_URL, 'https://api.storeys.ae/api/v1/careers')
  assert.equal(hasHomepageSignal(homepageHtml), true)
  assert.equal(hasCareersMarketingSignal(careersHtml), true)
  assert.equal(extractBundleUrl(homepageHtml, HOMEPAGE_URL), 'https://www.storeys.ae/assets/index-y7euq6Rn.js')
  assert.equal(extractBundleUrl(careersHtml, CAREERS_URL), 'https://www.storeys.ae/assets/index-y7euq6Rn.js')
  assert.equal(hasBundleApplyModalSignal(bundleJs), true)
  assert.equal(hasPublicJobsSignal(homepageHtml), false)
  assert.equal(hasPublicJobsSignal(careersHtml), false)
  assert.equal(hasPublicJobsSignal(bundleJs), false)
})

test('Storeys Real Estate sentinel returns no jobs while the official surface stays marketing-only with an apply modal', async () => {
  const requestedUrls = []
  const jobs = await createStoreysRealEstateScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === CAREERS_URL) return careersHtml
      if (url === 'https://www.storeys.ae/assets/index-y7euq6Rn.js') return bundleJs
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    HOMEPAGE_URL,
    CAREERS_URL,
    'https://www.storeys.ae/assets/index-y7euq6Rn.js',
  ])
  assert.deepEqual(jobs, [])
})

test('Storeys Real Estate default fetch attaches a bounded abort signal to every request', async () => {
  const originalFetch = globalThis.fetch
  const requests = []

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options })

    if (url === HOMEPAGE_URL) return { ok: true, text: async () => homepageHtml }
    if (url === CAREERS_URL) return { ok: true, text: async () => careersHtml }
    if (url === bundleUrl) return { ok: true, text: async () => bundleJs }

    throw new Error(`Unexpected URL: ${url}`)
  }

  try {
    const jobs = await createStoreysRealEstateScraper().run()

    assert.deepEqual(jobs, [])
    assert.deepEqual(requests.map((request) => request.url), [
      HOMEPAGE_URL,
      CAREERS_URL,
      bundleUrl,
    ])
    assert.ok(
      requests.every((request) => request.options.signal && typeof request.options.signal.aborted === 'boolean'),
      'Expected every default fetch request to include an AbortSignal timeout',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Storeys Real Estate sentinel fails closed when the verified first-party marketing surface drifts into a public jobs board', async () => {
  await assert.rejects(
    createStoreysRealEstateScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    createStoreysRealEstateScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === CAREERS_URL) {
          return careersHtml.replace(
            '</main>',
            '<section><h2>Current Openings</h2><a href=\"/careers/software-engineer\">View openings</a></section></main>',
          )
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers page now appears to expose public jobs/i,
  )

  await assert.rejects(
    createStoreysRealEstateScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === CAREERS_URL) return careersHtml
        if (url === 'https://www.storeys.ae/assets/index-y7euq6Rn.js') {
          return bundleJs.replace(
            'const applyEndpoint="https://api.storeys.ae/api/v1/careers";',
            '',
          )
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /apply-modal contract/i,
  )
})
