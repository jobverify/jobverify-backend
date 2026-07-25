import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const loadMarutAirModule = async () => {
  try {
    return await import('../marutair/script.js')
  } catch {
    assert.fail('Expected Marut Air scraper module at ../scraper/marutair/script.js')
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const homepageHtml = `
  <html>
    <head>
      <title>HVLS Fans Manufacturer | Big Industrial HVLS Fan | Marut Air</title>
    </head>
    <body>
      <header>
        <a href="https://marutair.com/career/">Career</a>
      </header>
      <main>
        <h1>Marut Air</h1>
      </main>
    </body>
  </html>
`
const careerPageHtml = readFileSync(path.join(currentDir, 'fixtures', 'marutair', 'career-page.html'), 'utf8')

test('run returns no jobs when Marut Air exposes only a first-party application form', async () => {
  const marutAir = await loadMarutAirModule()
  const requestedUrls = []

  assert.equal(marutAir.hasHomepageSignal(homepageHtml), true)
  assert.equal(marutAir.hasCareerPageSignal(careerPageHtml), true)

  const jobs = await marutAir.createMarutAirScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === marutAir.HOMEPAGE_URL) {
        return homepageHtml
      }

      assert.equal(url, marutAir.CAREER_PAGE_URL)
      return careerPageHtml
    },
  })

  assert.deepEqual(requestedUrls, [marutAir.HOMEPAGE_URL, marutAir.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})
