import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Napier</title>
  </head>
  <body>
    <h1>Careers at Napier</h1>
    <p>VIEW ALL OPENINGS</p>
    <p>Explore our current openings and submit your resume.</p>
    <a href="https://www.linkedin.com/company/napier-healthcare/">LinkedIn</a>
  </body>
</html>
`

const PUBLIC_OPENINGS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Napier</title>
  </head>
  <body>
    <h1>Careers at Napier</h1>
    <p>VIEW ALL OPENINGS</p>
    <p>Explore our current openings and submit your resume.</p>
    <a href="http://www.napierhealthcare.com/v2/openings/senior-analyst">Open position</a>
    <a href="https://www.linkedin.com/company/napier-healthcare/">LinkedIn</a>
  </body>
</html>
`

const loadNapierModule = async () => {
  try {
    return await import('../../scraper/napierhealthcaresolutions/script.js')
  } catch {
    assert.fail('Expected Napier Healthcare Solutions scraper module at ../../scraper/napierhealthcaresolutions/script.js')
  }
}

test('Napier constants stay pinned to the reachable August 3, 2026 first-party careers page', async () => {
  const napier = await loadNapierModule()

  assert.equal(napier.SOURCE, 'napierhealthcaresolutions')
  assert.equal(napier.COMPANY, 'Napier Healthcare Solutions')
  assert.equal(napier.CAREERS_URL, 'http://www.napierhealthcare.com/v2/careers/')
  assert.equal(napier.PROVIDER_METADATA.homepageUrl, 'http://www.napierhealthcare.com/v2/')
  assert.equal(napier.PROVIDER_METADATA.verifiedOn, '2026-08-03')
  assert.equal(napier.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.deepEqual(napier.extractSameDomainJobLinks(CAREERS_HTML), [])
})

test('Napier returns [] when the reachable first-party careers page is still marketing-only with no same-domain opening links', async () => {
  const napier = await loadNapierModule()
  const requestedUrls = []

  const jobs = await napier.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === napier.CAREERS_URL) return CAREERS_HTML
      throw new Error(`Unexpected Napier URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, ['http://www.napierhealthcare.com/v2/careers/'])
  assert.deepEqual(jobs, [])
})

test('Napier fails closed when the reachable first-party careers page starts exposing same-domain public opening links', async () => {
  const napier = await loadNapierModule()

  await assert.rejects(
    napier.run({
      fetchText: async () => PUBLIC_OPENINGS_HTML,
    }),
    /public jobs surface changed materially/i,
  )
})
