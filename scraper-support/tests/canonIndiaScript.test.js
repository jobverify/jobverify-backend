import assert from 'node:assert/strict'
import test from 'node:test'

const loadCanonIndiaModule = async () => {
  try {
    return await import('../../scraper/canonindia/script.js')
  } catch {
    assert.fail('Expected Canon India scraper module at ../../scraper/scraper/canonindia/script.js')
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
      <a href="https://career.asia.canon">View Openings</a>
    </body>
  </html>
`

const oracleBoardHtml = `
  <html><head>
    <title>Canon Career Site</title>
    <base href="/en/sites/CX_1" data-apibaseurl="https://cmaonehr-iaeatj.fa.ocs.oraclecloud.com:443" data-sitenumber="CX_1" />
  </head><body><div class="app"></div></body></html>
`

const emptyInventory = JSON.stringify({
  items: [{ SiteNumber: 'CX_1', Location: null, TotalJobsCount: 0, requisitionList: [] }],
})

test('run verifies Canon India official Oracle board and its complete zero-job inventory', async () => {
  const canonIndia = await loadCanonIndiaModule()
  const requestedUrls = []

  const jobs = await canonIndia.createCanonIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === canonIndia.CAREER_PAGE_URL) {
        return { status: 200, url, html: careerPageHtml }
      }

      if (url === canonIndia.EXTERNAL_PORTAL_URL) {
        return { status: 200, url: canonIndia.ORACLE_BOARD_URL, html: oracleBoardHtml }
      }

      if (url === canonIndia.ORACLE_LISTING_URL) {
        return { status: 200, url, html: emptyInventory }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    canonIndia.CAREER_PAGE_URL,
    canonIndia.EXTERNAL_PORTAL_URL,
    canonIndia.ORACLE_LISTING_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Canon India fails closed when the official Oracle inventory changes or becomes unavailable', async () => {
  const canonIndia = await loadCanonIndiaModule()

  for (const payload of [
    JSON.stringify({ items: [{ SiteNumber: 'CX_1', TotalJobsCount: 1, requisitionList: [{}] }] }),
    '<html>No Access</html>',
  ]) {
    await assert.rejects(
      canonIndia.createCanonIndiaScraper().run({
        fetchPage: async (url) => {
          if (url === canonIndia.CAREER_PAGE_URL) return { status: 200, url, html: careerPageHtml }
          if (url === canonIndia.EXTERNAL_PORTAL_URL) {
            return { status: 200, url: canonIndia.ORACLE_BOARD_URL, html: oracleBoardHtml }
          }
          if (url === canonIndia.ORACLE_LISTING_URL) return { status: 200, url, html: payload }
          throw new Error(`Unexpected URL: ${url}`)
        },
      }),
    )
  }
})
