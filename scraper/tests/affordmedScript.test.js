import assert from 'node:assert/strict'
import test from 'node:test'

const loadAffordmedModule = async () => {
  try {
    return await import('../affordmed/script.js')
  } catch {
    return null
  }
}

const buildCareersHtml = () => `
<!doctype html>
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Afford Medical Technologies Private Limited",
        "alternateName": "Affordmed"
      }
    </script>
    <script type="module" crossorigin src="/assets/index-DEUWnO6z.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`

test('extractSearchResults returns no jobs when Affordmed only exposes a frontend shell without public openings', async () => {
  const affordmed = await loadAffordmedModule()
  assert.ok(affordmed)

  const jobs = affordmed.extractSearchResults(buildCareersHtml())
  assert.deepEqual(jobs, [])
})

test('run fetches the Affordmed careers page and decorates an empty result set', async () => {
  const affordmed = await loadAffordmedModule()
  assert.ok(affordmed)

  const requestedUrls = []
  const scraper = affordmed.createAffordmedScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === affordmed.CAREER_PAGE_URL) return buildCareersHtml()
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(affordmed.buildSearchUrl(), affordmed.CAREER_PAGE_URL)
  assert.deepEqual(requestedUrls, [affordmed.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})
