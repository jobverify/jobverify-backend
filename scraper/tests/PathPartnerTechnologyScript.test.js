import assert from 'node:assert/strict'
import test from 'node:test'

const loadScriptModule = async () => {
  try {
    return await import('../pathpartnertechnology/script.js')
  } catch {
    assert.fail('Expected PathPartner Technology scraper module at ../pathpartnertechnology/script.js')
  }
}

test('PathPartner Technology recognizes the verified blocked fetch state', async () => {
  const pathpartner = await loadScriptModule()

  assert.equal(pathpartner.SOURCE, 'pathpartnertechnology')
  assert.equal(pathpartner.CAREERS_URL, 'https://www.pathpartnertech.com/career/')
  assert.equal(
    pathpartner.isExpectedBlockedFetchError(new Error('Recv failure: Connection was reset')),
    true,
  )
  assert.equal(
    pathpartner.isExpectedBlockedFetchError(new Error('Could not establish trust relationship for the SSL/TLS secure channel')),
    true,
  )
})

test('PathPartner Technology returns [] only for the verified blocked careers fetch', async () => {
  const pathpartner = await loadScriptModule()

  const jobs = await pathpartner.createPathPartnerTechnologyScraper().run({
    fetchText: async () => {
      throw new Error('Recv failure: Connection was reset')
    },
  })

  assert.deepEqual(jobs, [])
})

test('PathPartner Technology fails closed when the fetch behavior changes', async () => {
  const pathpartner = await loadScriptModule()

  await assert.rejects(
    pathpartner.createPathPartnerTechnologyScraper().run({
      fetchText: async () => '<html><body>reachable now</body></html>',
    }),
    /became publicly fetchable/i,
  )
})

test('PathPartner Technology can recover with browser-backed verification when direct requests fail generically', async () => {
  const pathpartner = await loadScriptModule()
  const browserUrls = []

  const jobs = await pathpartner.createPathPartnerTechnologyScraper().run({
    fetchText: async () => {
      throw new TypeError('fetch failed')
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      throw new Error('Could not establish trust relationship for the SSL/TLS secure channel')
    },
  })

  assert.deepEqual(browserUrls, [pathpartner.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
