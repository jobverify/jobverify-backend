import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html><head><title>KRG Technologies</title></head>
<body>
  <a href="Jobs.aspx">Current Openings</a>
</body></html>
`

const openingsHtml = `
<!doctype html>
<html><body>
  <h2>Find Your Career. You Deserve it.</h2>
  <a href="Jobs.aspx">Current Openings</a>
  <iframe src="https://talenthire.ceipal.com/Jobs/listing/ODI0MA=="></iframe>
</body></html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/krgtechnologies/script.js')
  } catch {
    assert.fail('Expected KRG Technologies scraper module at ../../scraper/krgtechnologies/script.js')
  }
}

test('KRG Technologies validators stay pinned to the verified current-openings handoff from Friday, July 17, 2026', async () => {
  const krg = await loadModule()
  assert.equal(krg.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(krg.hasCurrentOpeningsSignal(openingsHtml), true)
})

test('KRG Technologies run validates the verified page and iframe handoff and stays fail-closed', async () => {
  const krg = await loadModule()
  const jobs = await krg.createKrgTechnologiesScraper().run({
    fetchText: async (url) => (url === krg.CAREERS_URL ? careersHtml : openingsHtml),
  })

  assert.deepEqual(jobs, [])
})
