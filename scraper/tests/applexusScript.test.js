import assert from 'node:assert/strict'
import test from 'node:test'

const loadApplexusModule = async () => {
  try {
    return await import('../applexus/script.js')
  } catch {
    return null
  }
}

const buildCareersHtml = () => `
<!doctype html>
<html>
  <body>
    <section data-widget="InnerBanner">
      <a class="btn-primary btn Button" href="#career_list">View Openings</a>
    </section>
    <section data-widget="CareerMiniBanner">
      <div class="text-center cursor-pointer xs:w-full outline-white btn Button">Apply Now</div>
    </section>
  </body>
</html>
`

test('extractSearchResults returns no jobs when Applexus only exposes generic careers CTAs without role cards', async () => {
  const applexus = await loadApplexusModule()
  assert.ok(applexus)

  const jobs = applexus.extractSearchResults(buildCareersHtml())
  assert.deepEqual(jobs, [])
})

test('run fetches the Applexus careers page and decorates an empty result set', async () => {
  const applexus = await loadApplexusModule()
  assert.ok(applexus)

  const requestedUrls = []
  const scraper = applexus.createApplexusScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === applexus.CAREER_PAGE_URL) return buildCareersHtml()
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.equal(applexus.buildSearchUrl(), applexus.CAREER_PAGE_URL)
  assert.deepEqual(requestedUrls, [applexus.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})
