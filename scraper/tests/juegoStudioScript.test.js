import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <body>
    <h1>OPEN POSITIONS</h1>
    <section class="job">
      <h5>3D Artist I / II</h5>
      <h5>Bangalore</h5>
      <h6>Department:</h6>
      <p>Art</p>
      <h6>Position:</h6>
      <p>Full Time</p>
      <h6>Relevant Experience:</h6>
      <p>2-4 years</p>
      <a href="https://www.juegostudio.com/careers/3d-artist">Apply Now</a>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../juegostudio/script.js')
  } catch {
    assert.fail('Expected Juego Studio scraper module at ../juegostudio/script.js')
  }
}

test('Juego Studio parses the verified public openings page', async () => {
  const juegoStudio = await loadModule()

  assert.equal(juegoStudio.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await juegoStudio.createJuegoStudioScraper({
    now: () => '2026-07-24T00:00:00.000Z',
  }).run({
    fetchText: async () => careersHtml,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, '3D Artist I / II')
  assert.equal(jobs[0].location, 'Bangalore, Karnataka, India')
  assert.equal(jobs[0].applyUrl, 'https://www.juegostudio.com/careers/3d-artist')
})

test('Juego Studio can recover with a browser-backed careers page when direct requests are blocked', async () => {
  const juegoStudio = await loadModule()
  const browserUrls = []

  const jobs = await juegoStudio.createJuegoStudioScraper({
    now: () => '2026-07-24T00:00:00.000Z',
  }).run({
    fetchText: async () => {
      throw new Error(`HTTP 403 for ${juegoStudio.CAREERS_URL}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(browserUrls, [juegoStudio.CAREERS_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, '3D Artist I / II')
})
