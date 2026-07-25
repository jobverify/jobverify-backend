import assert from 'node:assert/strict'
import test from 'node:test'

const loadAmazecodesModule = async () => {
  try {
    return await import('../amazecodes/script.js')
  } catch {
    assert.fail('Expected AMAZECODES scraper module at ../scraper/amazecodes/script.js')
  }
}

const sampleCompanyHtml = `
<html>
  <head><title>Amazecodes Solutions Pvt Ltd | LinkedIn</title></head>
  <body>
    <meta content="urn:li:organization:9482063">
  </body>
</html>
`

const sampleSearchHtml = `
<html>
  <head><title>0 Jobs jobs in India</title></head>
  <body>
    <div class="empty-state">No matching jobs found.</div>
  </body>
</html>
`

test('extractSearchResults returns an empty list when AMAZECODES LinkedIn guest search has no public India jobs', async () => {
  const amazecodes = await loadAmazecodesModule()

  assert.equal(amazecodes.pageIndicatesAmazecodesCompany(sampleCompanyHtml), true)
  assert.deepEqual(amazecodes.extractSearchResults(sampleSearchHtml), [])
})

test('run fetches AMAZECODES company and search pages and returns no jobs when public guest search is empty', async () => {
  const amazecodes = await loadAmazecodesModule()
  const requestedUrls = []
  const scraper = amazecodes.createAmazecodesScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === amazecodes.LINKEDIN_COMPANY_PAGE_URL) return sampleCompanyHtml
      if (url === amazecodes.LINKEDIN_INDIA_JOBS_URL) return sampleSearchHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(
    requestedUrls,
    [
      amazecodes.LINKEDIN_COMPANY_PAGE_URL,
      amazecodes.LINKEDIN_INDIA_JOBS_URL,
    ],
  )
  assert.deepEqual(jobs, [])
})
