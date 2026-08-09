import assert from 'node:assert/strict'
import test from 'node:test'

import {
  INDIA_SEARCH_URL,
  buildSearchUrl,
  createAoSmithScraper,
  pageIndicatesIndiaFalsePositive,
} from '../../scraper/aosmith/script.js'

test('pageIndicatesIndiaFalsePositive recognizes the current India keyword false-positive flow on A. O. Smith careers', () => {
  const html = `
    <html>
      <head><title>India - A. O. Smith Corporation Jobs</title></head>
      <body>
        <label>Showing 1 to 10 of 10 Jobs</label>
        <ul id="job-tile-list">
          <li class="job-tile" data-url="/job/Ashland-City-Production-Operator-TN-37015/1325760900/">
            <a class="jobTitle-link" href="/job/Ashland-City-Production-Operator-TN-37015/1325760900/">Production Operator</a>
          </li>
          <li class="job-tile" data-url="/job/Appleton-Warehouse-Supervisor-WI-54914/1404030000/">
            <a class="jobTitle-link" href="/job/Appleton-Warehouse-Supervisor-WI-54914/1404030000/">Warehouse Supervisor</a>
          </li>
        </ul>
      </body>
    </html>
  `

  assert.equal(buildSearchUrl(), INDIA_SEARCH_URL)
  assert.equal(pageIndicatesIndiaFalsePositive(html), true)
  assert.equal(
    pageIndicatesIndiaFalsePositive(`
      <html>
        <head><title>India - A. O. Smith Corporation Jobs</title></head>
        <body>
          <label>Showing 1 to 1 of 1 Jobs</label>
          <ul id="job-tile-list">
            <li class="job-tile" data-url="/job/Bangalore-Engineer-India/123/">
              <a class="jobTitle-link" href="/job/Bangalore-Engineer-India/123/">Engineer</a>
              <span>Bangalore, Karnataka, India</span>
            </li>
          </ul>
        </body>
      </html>
    `),
    false,
  )
})

test('run validates the current A. O. Smith public India false-positive flow and returns an empty result set', async () => {
  const requestedUrls = []
  const scraper = createAoSmithScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return `
        <html>
          <head><title>India - A. O. Smith Corporation Jobs</title></head>
          <body>
            <label>Showing 1 to 10 of 10 Jobs</label>
            <ul id="job-tile-list">
              <li class="job-tile" data-url="/job/Ashland-City-Production-Operator-TN-37015/1325760900/">
                <a class="jobTitle-link" href="/job/Ashland-City-Production-Operator-TN-37015/1325760900/">Production Operator</a>
              </li>
            </ul>
          </body>
        </html>
      `
    },
  })

  assert.deepEqual(requestedUrls, [INDIA_SEARCH_URL])
  assert.deepEqual(jobs, [])
})

test('run throws when the A. O. Smith careers page no longer matches the expected India false-positive flow', async () => {
  const scraper = createAoSmithScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async () => '<main>Unexpected careers experience</main>',
    }),
    /India false-positive flow/i,
  )
})
