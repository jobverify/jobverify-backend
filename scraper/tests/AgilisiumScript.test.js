import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html><head><title>Careers at Agilisium | Life Sciences AI &amp; Data Jobs</title></head>
<body>
  <p>Explore open roles across engineering, consulting, and data science.</p>
  <a href="https://agilisium.zohorecruit.com/jobs/Careers">EXPLORE OPEN ROLES</a>
</body></html>
`

const boardHtml = `
<!doctype html>
<html><head><title>Jobs at Agilisium</title><meta property="og:url" content="https://agilisium.zohorecruit.com/jobs/Careers"></head>
<body>Everyone at Agilisium is free to explore and work the way you want. Come join us!</body></html>
`

const loadModule = async () => {
  try {
    return await import('../agilisium/script.js')
  } catch {
    assert.fail('Expected Agilisium scraper module at ../agilisium/script.js')
  }
}

test('Agilisium validators stay pinned to the verified careers handoff from Friday, July 17, 2026', async () => {
  const agilisium = await loadModule()
  assert.equal(agilisium.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(agilisium.hasVerifiedBoardSignal(boardHtml), true)
})

test('Agilisium run validates the verified careers page and board and stays fail-closed', async () => {
  const agilisium = await loadModule()
  const jobs = await agilisium.createAgilisiumScraper().run({
    fetchText: async (url) => (url === agilisium.CAREERS_URL ? careersHtml : boardHtml),
  })

  assert.deepEqual(jobs, [])
})
