import assert from 'node:assert/strict'
import test from 'node:test'

const loadCoinDCXModule = async () => {
  try {
    return await import('../../scraper/coindcx/script.js')
  } catch {
    assert.fail('Expected CoinDCX scraper module at ../../scraper/coindcx/script.js')
  }
}

const opportunitiesHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>CoinDCX Careers | Opportunities</title>
  </head>
  <body>
    <main>
      <h1>Find your Job Opportunity</h1>
      <p>Change Starts Together!</p>
      <p>Didn't find the position you are looking for?</p>
      <p>Drop in your CV at apply@coindcx.com</p>
    </main>
  </body>
</html>
`

const cloudflareBlockedPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Attention Required! | Cloudflare</title>
  </head>
  <body>
    <p>Please enable cookies.</p>
    <h1>Sorry, you have been blocked</h1>
    <p>You are unable to access coindcx.com</p>
    <p>Cloudflare Ray ID: 1d8fd4e1f6373b21</p>
  </body>
</html>
`

test('CoinDCX stays pinned to the verified opportunities shell and no-public-listings state', async () => {
  const coindcx = await loadCoinDCXModule()

  assert.equal(coindcx.CAREER_PAGE_URL, 'https://careers.coindcx.com/opportunities')
  assert.equal(coindcx.hasOpportunityShellSignal(opportunitiesHtml), true)
  assert.equal(coindcx.hasNoPublicListingsSignal(opportunitiesHtml), true)
})

test('CoinDCX run returns zero jobs for the verified public no-listings shell', async () => {
  const coindcx = await loadCoinDCXModule()

  const jobs = await coindcx.createCoinDCXScraper().run({
    fetchText: async (url) => {
      assert.equal(url, coindcx.CAREER_PAGE_URL)
      return opportunitiesHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('CoinDCX returns zero jobs when the verified opportunities route is Cloudflare-blocked on Thursday, August 13, 2026', async () => {
  const coindcx = await loadCoinDCXModule()
  const requestedPageUrls = []

  const jobs = await coindcx.createCoinDCXScraper().run({
    fetchText: async (url) => {
      throw new Error(`HTTP 403 for ${url}`)
    },
    fetchBrowserText: async () => {
      assert.fail('CoinDCX should not launch a browser for the verified blocked no-public-listings state')
    },
    fetchPage: async (url) => {
      requestedPageUrls.push(url)
      return {
        status: 403,
        url,
        html: cloudflareBlockedPageHtml,
      }
    },
  })

  assert.deepEqual(jobs, [])
  assert.deepEqual(requestedPageUrls, [coindcx.CAREER_PAGE_URL])
})

test('CoinDCX fails closed when the verified opportunities shell changes materially', async () => {
  const coindcx = await loadCoinDCXModule()

  await assert.rejects(
    coindcx.createCoinDCXScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
    }),
    /expected opportunities shell/i,
  )
})
