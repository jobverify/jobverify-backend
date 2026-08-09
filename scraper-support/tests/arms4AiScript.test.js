import assert from 'node:assert/strict'
import test from 'node:test'

const loadArms4AiModule = async () => {
  try {
    return await import('../../scraper/arms4ai/script.js')
  } catch {
    assert.fail('Expected ARMS 4 AI scraper module at ../../scraper/scraper/arms4ai/script.js')
  }
}

const sampleCompanyHtml = `
<html>
  <head><title>ARMS 4 AI | LinkedIn</title></head>
  <body>
    <meta content="urn:li:organization:69828325">
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

test('extractSearchResults returns an empty list when ARMS 4 AI LinkedIn guest search has no public India jobs', async () => {
  const arms4ai = await loadArms4AiModule()

  assert.equal(arms4ai.pageIndicatesArms4AiCompany(sampleCompanyHtml), true)
  assert.deepEqual(arms4ai.extractSearchResults(sampleSearchHtml), [])
})

test('run fetches ARMS 4 AI company and search pages and returns no jobs when public guest search is empty', async () => {
  const arms4ai = await loadArms4AiModule()
  const requestedUrls = []
  const scraper = arms4ai.createArms4AiScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === arms4ai.LINKEDIN_COMPANY_PAGE_URL) return sampleCompanyHtml
      if (url === arms4ai.LINKEDIN_INDIA_JOBS_URL) return sampleSearchHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(
    requestedUrls,
    [
      arms4ai.LINKEDIN_COMPANY_PAGE_URL,
      arms4ai.LINKEDIN_INDIA_JOBS_URL,
    ],
  )
  assert.deepEqual(jobs, [])
})
