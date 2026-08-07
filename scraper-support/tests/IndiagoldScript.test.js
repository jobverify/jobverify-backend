import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>indiagold - Join Us</title>
  </head>
  <body>
    <main>
      <h1>Join Us</h1>
      <p>SEE ALL POSITIONS</p>
      <p>Great Places to Work Certified</p>
    </main>
  </body>
</html>
`

const apiPayload = {
  code: 'success',
  data: [
    {
      id: 'job-1',
      Posting_Title: 'Software Engineer',
      Job_Type: 'Full-time',
      Country: 'India',
      State: 'Karnataka',
      City: 'Bengaluru',
      Industry: 'Engineering',
      Job_Description: 'Build payments products',
      Date_Opened: '07/15/2026',
      $url: 'https://indiagold.zohorecruit.in/jobs/Careers/job-1',
    },
    {
      id: 'job-2',
      Posting_Title: 'US Role',
      Country: 'United States',
      City: 'Austin',
      $url: 'https://indiagold.zohorecruit.in/jobs/Careers/job-2',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/indiagold/script.js')
  } catch {
    assert.fail('Expected Indiagold scraper module at ../../scraper/indiagold/script.js')
  }
}

test('Indiagold falls back to a browser-backed careers page loader when Node fetch times out', async () => {
  const indiagold = await loadModule()
  const requestedPrimaryUrls = []
  const requestedBrowserUrls = []
  const requestedPrimaryJsonUrls = []
  const requestedBrowserJsonUrls = []

  const jobs = await indiagold.createIndiagoldScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedPrimaryUrls.push(url)
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fetchBrowserText: async (url) => {
      requestedBrowserUrls.push(url)
      return careersHtml
    },
    fetchJson: async (url) => {
      requestedPrimaryJsonUrls.push(url)
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fetchBrowserJson: async (url, landingUrl) => {
      requestedBrowserJsonUrls.push({ url, landingUrl })
      return apiPayload
    },
    now: () => '2026-08-02T09:00:00.000Z',
  })

  assert.deepEqual(requestedPrimaryUrls, [indiagold.CAREERS_PAGE_URL])
  assert.deepEqual(requestedBrowserUrls, [indiagold.CAREERS_PAGE_URL])
  assert.deepEqual(requestedPrimaryJsonUrls, [indiagold.CAREERS_API_URL])
  assert.deepEqual(requestedBrowserJsonUrls, [
    {
      url: indiagold.CAREERS_API_URL,
      landingUrl: indiagold.CAREERS_PORTAL_URL,
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Software Engineer')
  assert.equal(jobs[0].source, 'indiagold')
})
