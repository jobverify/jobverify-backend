import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <head>
    <title>Career - Alchemy Techsol</title>
  </head>
  <body>
    <h1>Join Our Team</h1>
    <p>Build Your Future with Alchemy Techsol</p>
    <h1>Current Openings</h1>
    <p>JavaScript must be enabled in order to view listings</p>
    <h2>Ready to Elevate Your Career?</h2>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../alchemytechsolindia/script.js')
  } catch {
    assert.fail('Expected Alchemy Techsol India scraper module at ../alchemytechsolindia/script.js')
  }
}

test('Alchemy Techsol accepts the migrated official careers surface even when the legacy page redirects and no public openings are currently listed', async () => {
  const alchemy = await loadModule()

  assert.equal(alchemy.pageIndicatesOfficialCareersSurface(careersHtml), true)
  assert.deepEqual(alchemy.extractCurrentOpenings(careersHtml), [])
  assert.deepEqual(alchemy.extractLegacyCategoryUrls(careersHtml), [])

  const jobs = await alchemy.createAlchemyTechsolIndiaScraper({
    now: () => '2026-07-25T20:00:00.000Z',
  }).run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})
