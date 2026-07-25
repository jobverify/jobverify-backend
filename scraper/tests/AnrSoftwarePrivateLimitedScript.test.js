import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career - ANR Software Pvt Ltd.</title>
  </head>
  <body>
    <h1>Current Job Openings</h1>
    <h2>Java Intern</h2>
    <p>40 openings</p>
    <p>No vacancy for this position now. Visit again!</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../anrsoftwareprivatelimited/script.js')
  } catch {
    assert.fail('Expected ANR Software Private Limited scraper module at ../anrsoftwareprivatelimited/script.js')
  }
}

test('ANR Software Private Limited returns [] only while the official careers page remains contradictory and non-trustworthy', async () => {
  const anr = await loadModule()

  assert.equal(anr.SOURCE, 'anrsoftwareprivatelimited')
  assert.equal(anr.COMPANY, 'ANR Software Private Limited')
  assert.equal(anr.CAREERS_URL, 'https://www.anrsoftware.com/career/')
  assert.equal(anr.hasVerifiedCareersPageSignal(careersHtml), true)

  const jobs = await anr.createAnrsoftwareprivatelimitedScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})

test('ANR Software Private Limited fails closed when the contradictory no-vacancy contract drifts', async () => {
  const anr = await loadModule()

  await assert.rejects(
    anr.createAnrsoftwareprivatelimitedScraper().run({
      fetchText: async () => careersHtml.replace('No vacancy for this position now. Visit again!', 'Apply now'),
    }),
    /verified contradictory careers page/i,
  )
})
