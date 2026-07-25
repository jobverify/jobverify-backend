import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  HOMEPAGE_URL,
  SOURCE,
  createWnsVuramScraper,
  hasOfficialCareersSignal,
  hasOfficialHomepageSignal,
  hasPublicJobsSignal,
} from './script.js'

const homepageHtml = `
  <html>
    <body>
      <h1>From Complexity to Clarity</h1>
      <h2>WNS-Vuram Advantage</h2>
      <p>Co-create smarter businesses with Hyperautomation and Agentic AI.</p>
      <p>WNS-Vuram empowers businesses to outsmart the future.</p>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head>
      <title>WNS-Vuram Careers | Join the Happiest and Best Nourishing Workplace</title>
    </head>
    <body>
      <h6>ROI CALCULATOR</h6>
      <h2>Calculate Your Return-On-Investment</h2>
      <p>Fill out the short form to connect with us and learn more.</p>
      <h6>GET IN TOUCH</h6>
      <h2>Elevate your business!</h2>
      <button>CONTACT ME</button>
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

test('WNS-Vuram sentinel stays pinned to the official homepage and careers shell page', () => {
  assert.equal(SOURCE, 'wnsvuram')
  assert.equal(COMPANY, 'WNS-Vuram')
  assert.equal(HOMEPAGE_URL, 'https://www.vuram.com/')
  assert.equal(CAREERS_URL, 'https://www.vuram.com/careers/')
  assert.equal(hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(hasOfficialCareersSignal(careersHtml), true)
  assert.equal(hasPublicJobsSignal(publicJobsHtml), true)
})

test('run returns an empty list when the official WNS-Vuram careers page is a non-listing shell', async () => {
  const requestedUrls = []
  const scraper = createWnsVuramScraper()

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
