import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  HOMEPAGE_URL,
  SOURCE,
  createShopUpScraper,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
  hasPublicJobsSignal,
} from './script.js'

const homepageHtml = `
  <html>
    <body>
      <h1>Small Businesses,</h1>
      <h1>Big Impact!</h1>
      <p>Embedding commerce, logistics and financing solutions together to supercharge small businesses.</p>
      <p>ShopUp facilitates easy access to food and essentials for millions of people.</p>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <body>
      <h1>We are building tomorrow, join us today.</h1>
      <h2>See open roles</h2>
      <p>No available open positions at the moment</p>
    </body>
  </html>
`

const publicJobsHtml = `
  <html>
    <body>
      <h1>Current Openings</h1>
      <a href="/apply">Apply now</a>
    </body>
  </html>
`

test('ShopUp sentinel stays pinned to the official homepage and explicit empty careers page', () => {
  assert.equal(SOURCE, 'shopup')
  assert.equal(COMPANY, 'ShopUp')
  assert.equal(HOMEPAGE_URL, 'https://shopup.org/')
  assert.equal(CAREERS_URL, 'https://shopup.org/career')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
  assert.equal(hasPublicJobsSignal(publicJobsHtml), true)
})

test('run returns an empty list when the official ShopUp careers page explicitly reports no open positions', async () => {
  const requestedUrls = []
  const scraper = createShopUpScraper()

  const jobs = await scraper.run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) {
        return {
          status: 200,
          url: HOMEPAGE_URL,
          html: homepageHtml,
        }
      }

      if (url === CAREERS_URL) {
        return {
          status: 200,
          url: CAREERS_URL,
          html: careersHtml,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [HOMEPAGE_URL, CAREERS_URL])
  assert.deepEqual(jobs, [])
})
