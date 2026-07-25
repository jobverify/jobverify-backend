import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  createCoinDCXScraper,
  hasNoPublicListingsSignal,
  hasOpportunityShellSignal,
} from './script.js'

const noOpeningsPageHtml = `
  <html>
    <head>
      <title>CoinDCX Careers | Opportunities</title>
    </head>
    <body>
      <p>Change Starts Together!</p>
      <div>Find your Job Opportunity</div>
      <p>Didn't find the position you are looking for?</p>
      <p>We will find one for you! Drop in your CV at apply@coindcx.com</p>
      <button>Apply now</button>
    </body>
  </html>
`

test('detects the CoinDCX opportunities shell and no-public-listings signal', () => {
  assert.equal(CAREER_PAGE_URL, 'https://careers.coindcx.com/opportunities')
  assert.equal(hasOpportunityShellSignal(noOpeningsPageHtml), true)
  assert.equal(hasNoPublicListingsSignal(noOpeningsPageHtml), true)
})

test('run returns no jobs when CoinDCX only exposes CV-drop hiring on the public opportunities page', async () => {
  const jobs = await createCoinDCXScraper().run({
    fetchText: async (url) => {
      assert.equal(url, CAREER_PAGE_URL)
      return noOpeningsPageHtml
    },
  })

  assert.deepEqual(jobs, [])
})
