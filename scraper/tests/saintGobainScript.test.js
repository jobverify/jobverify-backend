import assert from 'node:assert/strict'
import test from 'node:test'

const loadSaintGobainModule = async () => {
  try {
    return await import('../saintgobain/script.js')
  } catch {
    assert.fail('Expected Saint-Gobain scraper module at ../saintgobain/script.js')
  }
}

const officialJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join us | Saint-Gobain</title>
  </head>
  <body>
    <main>
      <h1>OUR JOB OFFERS</h1>
      <p>Find here our job offers for all our businesses and our brands.</p>
      <p>### 1824 Result(s)</p>
      <article>
        <a href="/en/job/USA14881/it-systems-analyst-storage-distribution">IT Systems Analyst Storage &amp; Distribution</a>
        <p>United States, Pennsylvania, MALVERN</p>
      </article>
      <article>
        <a href="/en/job/FRA39378/stage-chargee-de-mission-rse-h-f">Stage - Charge(e) de mission RSE H/F</a>
        <p>France, Ile de France, Courbevoie</p>
      </article>
    </main>
  </body>
</html>
`

const indiaJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join us | Saint-Gobain</title>
  </head>
  <body>
    <main>
      <h1>OUR JOB OFFERS</h1>
      <p>Find here our job offers for all our businesses and our brands.</p>
      <p>### 1825 Result(s)</p>
      <article>
        <a href="/en/job/IND00001/process-engineer">Process Engineer</a>
        <p>India, Tamil Nadu, Chennai</p>
      </article>
    </main>
  </body>
</html>
`

test('Saint-Gobain scraper validates the official global jobs surface and the current zero-India state', async () => {
  const saintGobain = await loadSaintGobainModule()

  assert.equal(saintGobain.CAREERS_URL, 'https://joinus.saint-gobain.com/en')
  assert.equal(saintGobain.hasOfficialCareersSignal(officialJobsHtml), true)
  assert.equal(saintGobain.hasIndiaOpeningsSignal(officialJobsHtml), false)
})

test('Saint-Gobain scraper returns no jobs while the official jobs surface exposes no India openings', async () => {
  const saintGobain = await loadSaintGobainModule()
  const requestedUrls = []

  const jobs = await saintGobain.createSaintGobainScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === saintGobain.CAREERS_URL) return officialJobsHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [saintGobain.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Saint-Gobain scraper fails closed when the official jobs signal disappears or India openings appear', async () => {
  const saintGobain = await loadSaintGobainModule()

  await assert.rejects(
    saintGobain.createSaintGobainScraper().run({
      fetchText: async () => '<html><body>Unexpected page</body></html>',
    }),
    /official Saint-Gobain jobs surface/i,
  )

  await assert.rejects(
    saintGobain.createSaintGobainScraper().run({
      fetchText: async () => indiaJobsHtml,
    }),
    /India openings/i,
  )
})
