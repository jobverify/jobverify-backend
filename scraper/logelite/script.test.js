import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  COMPANY,
  SOURCE,
  createLogeliteScraper,
  extractJobCards,
  hasOfficialCareersSignal,
} from './script.js'

const careersHtml = `
<html>
  <head>
    <title>Join Our Dynamic Digital Marketing &amp; Web Development Team</title>
  </head>
  <body>
    <p>Open Job Positions</p>
    <h2>Your Career <span>Starts Here</span></h2>
    <div class="career-page-card">
      <div class="card-header">
        <h3 class="card-title"><a href="https://logelite.com/career/human-resource-executive/" class="card-title-link">Human Resource Executive</a></h3>
        <span class="card-status">Total Openings 1</span>
      </div>
      <div class="card-meta">
        <p class="card-meta-item">Lucknow</p>
        <p class="card-meta-item">Subject to Interview</p>
      </div>
      <p class="card-disc">We&#039;re looking for a dynamic Human Resource Executive to join our team and contribute to a positive work environment.</p>
      <a href="https://logelite.com/wp-content/uploads/2026/05/Human-Resource-Executive.pdf" class="apply-now-btn">
        <span class="text">Download Details</span>
      </a>
      <a href="https://logelite.com/job-apply/?apply_for=Human+Resource+Executive" class="apply-now-btn">
        <span class="text">Apply Now</span>
      </a>
    </div>
    <div class="career-page-card">
      <div class="card-header">
        <h3 class="card-title"><a href="https://logelite.com/career/seo-executive/" class="card-title-link">SEO Executive</a></h3>
        <span class="card-status">Total Openings 10</span>
      </div>
      <div class="card-meta">
        <p class="card-meta-item">Lucknow</p>
        <p class="card-meta-item">Subject to Interview</p>
      </div>
      <p class="card-disc">Logelite is calling a talented SEO Executive! If you think you are the right fit, don't miss this opportunity to join our team.</p>
      <a href="https://logelite.com/wp-content/uploads/2026/05/SEO-Executive.pdf" class="apply-now-btn">
        <span class="text">Download Details</span>
      </a>
      <a href="https://logelite.com/job-apply/?apply_for=SEO+Executive" class="apply-now-btn">
        <span class="text">Apply Now</span>
      </a>
    </div>
  </body>
</html>
`

test('Logelite scraper recognizes the verified careers page and extracts live role cards', () => {
  assert.equal(hasOfficialCareersSignal(careersHtml), true)

  const jobs = extractJobCards(careersHtml)
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Human Resource Executive',
    city: 'Lucknow',
    location: 'Lucknow, India',
    openings: '1',
    compensation: 'Subject to Interview',
    description: "We're looking for a dynamic Human Resource Executive to join our team and contribute to a positive work environment.",
    sourceUrl: 'https://logelite.com/career/human-resource-executive/',
    applyUrl: 'https://logelite.com/job-apply/?apply_for=Human+Resource+Executive',
  })
})

test('Logelite scraper runs end to end against the first-party careers page', async () => {
  const requestedUrls = []

  const jobs = await createLogeliteScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_URL) return careersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-08-03T00:35:00.000Z',
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].company, COMPANY)
  assert.equal(jobs[0].source, SOURCE)
  assert.equal(jobs[0].city, 'Lucknow')
  assert.equal(jobs[0].link, 'https://logelite.com/job-apply/?apply_for=Human+Resource+Executive')
  assert.equal(jobs[0].scrapedAt, '2026-08-03T00:35:00.000Z')
})
