import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

test('Cuelogic recognizes the current LTIMindtree certificate mismatch even when only the message survives retry wrapping', async () => {
  const cuelogic = await loadModule()
  assert.ok(cuelogic, 'Cuelogic scraper module should load')

  const error = new Error(
    'fetch failed | Hostname/IP does not match certificate\'s altnames: Host: careers.ltimindtree.com. is not in the cert\'s altnames: DNS:certificate-not-found.jobs2web.com',
  )

  assert.equal(cuelogic.isKnownBrokenCareersRedirectTlsFailure(error), true)
})

test('Cuelogic returns [] while the verified LTIMindtree jobs surface still terminates in the known TLS-broken redirect host', async () => {
  const cuelogic = await loadModule()
  assert.ok(cuelogic, 'Cuelogic scraper module should load')

  const error = new Error(
    'fetch failed | Hostname/IP does not match certificate\'s altnames: Host: careers.ltimindtree.com. is not in the cert\'s altnames: DNS:certificate-not-found.jobs2web.com',
  )

  const jobs = await cuelogic.createCuelogicScraper().run({
    fetchPage: async () => {
      throw error
    },
  })

  assert.deepEqual(jobs, [])
})
