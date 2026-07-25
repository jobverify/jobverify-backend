import assert from 'node:assert/strict'
import test from 'node:test'

const loadAnaptyCodeemyModule = async () => {
  try {
    return await import('../anaptycodeemy/script.js')
  } catch {
    assert.fail('Expected ANAPTY CodeEmy scraper module at ../scraper/anaptycodeemy/script.js')
  }
}

const sampleCompanyHtml = `
<html>
  <head><title>Anapty CodeEmy Technologies Pvt. Ltd.™ | LinkedIn</title></head>
  <body>
    <meta content="urn:li:organization:108095496">
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

test('extractSearchResults returns an empty list when ANAPTY CodeEmy LinkedIn guest search has no public India jobs', async () => {
  const anaptyCodeemy = await loadAnaptyCodeemyModule()

  assert.equal(anaptyCodeemy.pageIndicatesAnaptyCodeemyCompany(sampleCompanyHtml), true)
  assert.deepEqual(anaptyCodeemy.extractSearchResults(sampleSearchHtml), [])
})

test('run fetches ANAPTY CodeEmy company and search pages and returns no jobs when public guest search is empty', async () => {
  const anaptyCodeemy = await loadAnaptyCodeemyModule()
  const requestedUrls = []
  const scraper = anaptyCodeemy.createAnaptyCodeemyScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === anaptyCodeemy.LINKEDIN_COMPANY_PAGE_URL) return sampleCompanyHtml
      if (url === anaptyCodeemy.LINKEDIN_INDIA_JOBS_URL) return sampleSearchHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(
    requestedUrls,
    [
      anaptyCodeemy.LINKEDIN_COMPANY_PAGE_URL,
      anaptyCodeemy.LINKEDIN_INDIA_JOBS_URL,
    ],
  )
  assert.deepEqual(jobs, [])
})
