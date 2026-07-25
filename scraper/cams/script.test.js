import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PAGE_URL,
  createCamsScraper,
  validateNoOpeningsPage,
} from './script.js'

const noOpeningsPage = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>CAMS Careers | CAMS Jobs Vacancy| Mutual Funds Service online| camsonline.com</title>
      <meta name="description" content="To excel in your career - join the CAMS team. We are commited to recruiting, developing, motivating and retaining the best talent in the industry.">
      <link rel="canonical" href="https://www.camsonline.com/about-cams/careers">
    </head>
    <body><app-root ng-version="12.2.8"></app-root></body>
  </html>
`

test('validates the CAMS public careers shell and returns no jobs', async () => {
  const requests = []
  const scraper = createCamsScraper()

  assert.equal(CAREERS_PAGE_URL, 'https://www.camsonline.com/about-cams/careers')
  assert.equal(validateNoOpeningsPage(noOpeningsPage), true)

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)
      return noOpeningsPage
    },
  })

  assert.deepEqual(requests, [CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('rejects a page that is not the official CAMS careers shell', async () => {
  const scraper = createCamsScraper()

  await assert.rejects(
    scraper.run({ fetchText: async () => '<main>Career @ CAMS</main>' }),
    /no longer exposes the expected no-openings page shape/,
  )
})
