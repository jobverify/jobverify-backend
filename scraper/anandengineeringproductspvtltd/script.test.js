import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PATHS,
  OFFICIAL_SURFACE_CANDIDATES,
  createAnandEngineeringProductsScraper,
  isExpectedMissingSurfaceError,
} from './script.js'

test('exports the verified candidate first-party surfaces for Anand Engineering Products Pvt Ltd', () => {
  assert.deepEqual(CAREERS_PATHS, [
    '/',
    '/careers',
    '/careers/',
    '/jobs',
    '/jobs/',
  ])

  assert.deepEqual(OFFICIAL_SURFACE_CANDIDATES, [
    'https://anandengineeringproducts.com',
    'https://www.anandengineeringproducts.com',
    'https://anandengineeringproducts.in',
    'https://www.anandengineeringproducts.in',
    'https://anandengineeringproducts.co.in',
    'https://www.anandengineeringproducts.co.in',
    'https://anandenggproducts.com',
    'https://www.anandenggproducts.com',
    'https://aeppl.in',
    'https://www.aeppl.in',
  ])
})

test('recognizes the DNS failures that matched the verified missing-surface checks', () => {
  assert.equal(isExpectedMissingSurfaceError(new Error('The remote name could not be resolved: anandengineeringproducts.com')), true)
  assert.equal(isExpectedMissingSurfaceError(new Error('getaddrinfo ENOTFOUND anandengineeringproducts.in')), true)
  assert.equal(isExpectedMissingSurfaceError(new Error('fetch failed: DNS lookup failed')), true)
  assert.equal(
    isExpectedMissingSurfaceError(
      new Error('[anandengineeringproductspvtltd] All 1 attempts failed. Last error: fetch failed', {
        cause: new TypeError('fetch failed', {
          cause: Object.assign(new Error('getaddrinfo ENOTFOUND anandengineeringproducts.com'), {
            code: 'ENOTFOUND',
          }),
        }),
      }),
    ),
    true,
  )
  assert.equal(isExpectedMissingSurfaceError(new Error('HTTP 404 for https://anandengineeringproducts.com')), false)
})

test('run returns no jobs while each verified candidate first-party root remains unresolved', async () => {
  const requestedUrls = []
  const scraper = createAnandEngineeringProductsScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      throw new Error(`The remote name could not be resolved: ${url}`)
    },
  })

  assert.deepEqual(
    requestedUrls,
    OFFICIAL_SURFACE_CANDIDATES.map((baseUrl) => new URL('/', `${baseUrl}/`).toString()),
  )
  assert.deepEqual(jobs, [])
})

test('run fails closed when any candidate first-party surface starts resolving', async () => {
  const scraper = createAnandEngineeringProductsScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === 'https://anandengineeringproducts.in/') {
          return '<html><title>Anand Engineering Products</title><body>Careers</body></html>'
        }

        throw new Error(`The remote name could not be resolved: ${url}`)
      },
    }),
    /official first-party surface changed/i,
  )
})
