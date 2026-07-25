import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Literact Fintech scraper module at ./script.js')
  }
}

const parkedHtml = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Literact.com is for sale</title>
      <meta property="og:site_name" content="Sparkname" />
    </head>
    <body>
      <h1>Literact.com is for sale</h1>
      <p>Acquire this domain name today.</p>
    </body>
  </html>
`

test('Literact Fintech sentinel exposes the verified no-first-party-surface contract', async () => {
  const literact = await loadModule()

  assert.equal(literact.SOURCE, 'literactfintech')
  assert.equal(literact.COMPANY, 'Literact Fintech')
  assert.equal(literact.VERIFIED_ON, '2026-07-13')
  assert.equal(
    literact.VERIFIED_SURFACE_SUMMARY,
    'No trustworthy first-party careers surface was discoverable on July 13, 2026: the canonical literactfintech hostnames were unresolved, and literact.com redirected to a parked Sparkname for-sale page.',
  )
  assert.deepEqual(literact.CANONICAL_HOSTS, [
    'literactfintech.com',
    'www.literactfintech.com',
    'literactfintech.in',
    'www.literactfintech.in',
  ])
  assert.equal(literact.PARKED_DOMAIN_URL, 'https://literact.com/')
  assert.equal(literact.PARKED_FINAL_URL, 'https://www.sparkname.com/name/Literact.com')
  assert.equal(literact.hasResolvableFirstPartyHost([]), false)
  assert.equal(literact.hasResolvableFirstPartyHost(['104.21.0.1']), true)
  assert.equal(literact.isVerifiedParkedPage({
    finalUrl: literact.PARKED_FINAL_URL,
    html: parkedHtml,
  }), true)
  assert.equal(literact.isVerifiedParkedPage({
    finalUrl: 'https://literact.com/careers',
    html: '<html><body><h1>Careers at Literact Fintech</h1></body></html>',
  }), false)
})

test('Literact Fintech sentinel returns no jobs only while the verified unresolved and parked-domain signals remain true', async () => {
  const literact = await loadModule()
  const resolveCalls = []
  const fetchCalls = []

  const jobs = await literact.createLiteractFintechScraper().run({
    resolveHosts: async (hosts) => {
      resolveCalls.push([...hosts])
      return []
    },
    fetchPage: async (url) => {
      fetchCalls.push(url)
      assert.equal(url, literact.PARKED_DOMAIN_URL)

      return {
        finalUrl: literact.PARKED_FINAL_URL,
        html: parkedHtml,
      }
    },
  })

  assert.deepEqual(resolveCalls, [literact.CANONICAL_HOSTS])
  assert.deepEqual(fetchCalls, [literact.PARKED_DOMAIN_URL])
  assert.deepEqual(jobs, [])
})

test('Literact Fintech sentinel fails closed when the canonical first-party hosts start resolving', async () => {
  const literact = await loadModule()

  await assert.rejects(
    literact.createLiteractFintechScraper().run({
      resolveHosts: async () => ['104.21.0.1'],
      fetchPage: async () => ({
        finalUrl: literact.PARKED_FINAL_URL,
        html: parkedHtml,
      }),
    }),
    /canonical literactfintech hosts now resolve/i,
  )
})

test('Literact Fintech sentinel fails closed when the parked-domain verification drifts', async () => {
  const literact = await loadModule()

  await assert.rejects(
    literact.createLiteractFintechScraper().run({
      resolveHosts: async () => [],
      fetchPage: async () => ({
        finalUrl: 'https://literact.com/careers',
        html: '<html><body><h1>Open Roles</h1><a href="/jobs/backend-engineer">Apply now</a></body></html>',
      }),
    }),
    /parked domain surface changed|public jobs/i,
  )
})
