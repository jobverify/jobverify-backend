import assert from 'node:assert/strict'
import test from 'node:test'

const SITEMAP_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Narayana Health</title>
  </head>
  <body>
    <main>
      <h1>Sitemap</h1>
      <a href="https://jobs.narayanahealth.org/NH-India/">Careers</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../narayanahealth/script.js')
  } catch {
    assert.fail('Expected Narayana Health scraper module at ../narayanahealth/script.js')
  }
}

test('Narayana Health sitemap signal accepts the verified direct NH-India careers handoff', async () => {
  const narayanahealth = await loadModule()

  assert.equal(narayanahealth.SOURCE, 'narayanahealth')
  assert.equal(narayanahealth.COMPANY, 'Narayana Health')
  assert.equal(narayanahealth.OFFICIAL_CAREERS_URL, 'https://jobs.narayanahealth.org/?locale=en_GB')
  assert.equal(narayanahealth.VIEW_ALL_JOBS_URL, 'https://jobs.narayanahealth.org/viewalljobs/')
  assert.equal(narayanahealth.DIRECT_CATEGORY_HANDOFF_URL, 'https://jobs.narayanahealth.org/NH-India/')
  assert.equal(
    narayanahealth.extractOfficialJobsBoardUrl(SITEMAP_HTML),
    narayanahealth.DIRECT_CATEGORY_HANDOFF_URL,
  )
  assert.equal(narayanahealth.hasVerifiedSiteMapSignal(SITEMAP_HTML), true)
})
