import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  HOMEPAGE_URL,
  createEsyposScraper,
  hasBrokenOfficialSurfaceSignal,
} from './script.js'

const brokenHtml = 'Cannot connect to database'

test('validates the verified broken ESYPOS exact-match host and returns no structured jobs', async () => {
  const requestedUrls = []

  assert.equal(hasBrokenOfficialSurfaceSignal(brokenHtml), true)

  const jobs = await createEsyposScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === HOMEPAGE_URL || url === CAREERS_URL) return brokenHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('fails closed when the ESYPOS exact-match host no longer shows the verified broken response', async () => {
  await assert.rejects(
    createEsyposScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return '<html><body>Welcome</body></html>'
        return brokenHtml
      },
    }),
    /verified broken exact-match public surface/i,
  )
})

test('fails closed when the ESYPOS careers route changes away from the verified broken response', async () => {
  await assert.rejects(
    createEsyposScraper().run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return brokenHtml
        if (url === CAREERS_URL) return '<html><body>Careers</body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified broken exact-match public surface/i,
  )
})
