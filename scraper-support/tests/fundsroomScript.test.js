import assert from 'node:assert/strict'
import test from 'node:test'

const companyHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Fundsroom | LinkedIn</title>
  </head>
  <body>
    <main>
      <span>urn:li:organization:71637338</span>
    </main>
  </body>
</html>
`

const zeroResultsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <span>0 jobs in India</span>
    </main>
  </body>
</html>
`

const loadFundsroomModule = async () => {
  try {
    return await import('../../scraper/fundsroom/script.js')
  } catch {
    assert.fail('Expected Fundsroom scraper module at ../../scraper/fundsroom/script.js')
  }
}

test('run validates the public Fundsroom LinkedIn company page and returns zero India jobs when the guest search is empty', async () => {
  const fundsroom = await loadFundsroomModule()
  const requestedUrls = []

  const jobs = await fundsroom.createFundsroomScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === fundsroom.LINKEDIN_COMPANY_PAGE_URL) return companyHtml
      if (url === fundsroom.LINKEDIN_INDIA_JOBS_URL) return zeroResultsHtml
      throw new Error(`Unexpected Fundsroom URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.linkedin.com/company/fundsroom/jobs/',
    'https://www.linkedin.com/jobs/search/?f_C=71637338&geoId=102713980',
  ])
  assert.deepEqual(jobs, [])
})
