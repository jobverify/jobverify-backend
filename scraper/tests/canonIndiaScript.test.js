import assert from 'node:assert/strict'
import test from 'node:test'

const loadCanonIndiaModule = async () => {
  try {
    return await import('../canonindia/script.js')
  } catch {
    assert.fail('Expected Canon India scraper module at ../scraper/canonindia/script.js')
  }
}

const careerPageHtml = `
  <html>
    <head>
      <title>Careers - Canon India</title>
    </head>
    <body>
      <h1>Come Join Us</h1>
      <p>Canon is a global brand with an excellent business plan and workforce.</p>
      <a href="https://career.asia.canon:8086/psc/ps/EMPLOYEE/CIPLCAREER/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=2226&">View Openings</a>
    </body>
  </html>
`

test('hasPortalBlockedSignal stays true when the linked Canon careers portal currently returns No Access', async () => {
  const canonIndia = await loadCanonIndiaModule()

  assert.equal(canonIndia.hasCareerPageSignal(careerPageHtml), true)
  assert.equal(
    canonIndia.hasPortalBlockedSignal({ status: 200, html: 'No Access' }),
    true,
  )
  assert.equal(
    canonIndia.hasPortalBlockedSignal({ status: 403, html: 'No Access' }),
    true,
  )
})

test('run returns no jobs when Canon India careers point to a currently inaccessible external portal', async () => {
  const canonIndia = await loadCanonIndiaModule()
  const requestedUrls = []

  const jobs = await canonIndia.createCanonIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === canonIndia.CAREER_PAGE_URL) {
        return { status: 200, url, html: careerPageHtml }
      }

      if (url === canonIndia.EXTERNAL_PORTAL_URL) {
        return { status: 200, url, html: 'No Access' }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    canonIndia.CAREER_PAGE_URL,
    canonIndia.EXTERNAL_PORTAL_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('run can recover Canon India pages with a browser-backed fetch when direct requests fail certificate validation', async () => {
  const canonIndia = await loadCanonIndiaModule()
  const browserUrls = []

  const jobs = await canonIndia.createCanonIndiaScraper().run({
    fetchPage: async () => {
      throw new Error('fetch failed | unable to verify the first certificate')
    },
    fetchBrowserPage: async (url) => {
      browserUrls.push(url)

      if (url === canonIndia.CAREER_PAGE_URL) {
        return { status: 200, url, html: careerPageHtml }
      }

      if (url === canonIndia.EXTERNAL_PORTAL_URL) {
        return { status: 403, url, html: 'No Access' }
      }

      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(browserUrls, [
    canonIndia.CAREER_PAGE_URL,
    canonIndia.EXTERNAL_PORTAL_URL,
  ])
  assert.deepEqual(jobs, [])
})
