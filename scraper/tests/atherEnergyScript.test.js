import assert from 'node:assert/strict'
import test from 'node:test'

const loadAtherEnergyModule = async () => {
  try {
    return await import('../atherenergy/script.js')
  } catch {
    assert.fail('Expected Ather Energy scraper module at ../scraper/atherenergy/script.js')
  }
}

const careersHomeHtml = `
  <html>
    <head>
      <title>Be the Story | Join Ather</title>
    </head>
    <body>
      <a href="/jobs">All jobs</a>
      <h1>Be the story</h1>
      <p>Join us for our next moonshot</p>
    </body>
  </html>
`

const allJobsHtml = `
  <html>
    <head>
      <title>All Jobs | Careers at Ather</title>
    </head>
    <body>
      <h1>All jobs</h1>
      <p>No open jobs in this team / location right now</p>
      <p>Check back in later for the right fit.</p>
    </body>
  </html>
`

test('extractJobs returns no jobs when the official Ather careers page shows no open roles', async () => {
  const atherenergy = await loadAtherEnergyModule()

  assert.equal(atherenergy.hasCareersHomeSignal(careersHomeHtml), true)
  assert.equal(atherenergy.hasJobsPageSignal(allJobsHtml), true)
  assert.equal(atherenergy.hasNoOpenJobsSignal(allJobsHtml), true)
  assert.deepEqual(atherenergy.extractJobs(allJobsHtml), [])
})

test('run fetches the official Ather careers pages and returns an honest zero-openings result', async () => {
  const atherenergy = await loadAtherEnergyModule()
  const requestedUrls = []

  const jobs = await atherenergy.createAtherEnergyScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === atherenergy.CAREERS_HOME_URL) {
        return careersHomeHtml
      }

      if (url === atherenergy.ALL_JOBS_URL) {
        return allJobsHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    atherenergy.CAREERS_HOME_URL,
    atherenergy.ALL_JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('run falls back to a browser-backed fetch when direct HTTP access to the official Ather careers site is blocked', async () => {
  const atherenergy = await loadAtherEnergyModule()
  const attempts = []

  const jobs = await atherenergy.createAtherEnergyScraper().run({
    fetchText: async (url) => {
      attempts.push(`http:${url}`)
      throw new Error(`HTTP 403 for ${url}`)
    },
    fetchBrowserText: async (url) => {
      attempts.push(`browser:${url}`)

      if (url === atherenergy.CAREERS_HOME_URL) {
        return careersHomeHtml
      }

      if (url === atherenergy.ALL_JOBS_URL) {
        return allJobsHtml
      }

      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(attempts, [
    `http:${atherenergy.CAREERS_HOME_URL}`,
    `browser:${atherenergy.CAREERS_HOME_URL}`,
    `http:${atherenergy.ALL_JOBS_URL}`,
    `browser:${atherenergy.ALL_JOBS_URL}`,
  ])
  assert.deepEqual(jobs, [])
})
