import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  extractJobsFromListingHtml,
  hasKulaListingSignal,
  createSaaSLabsScraper,
} from '../saaslabs/script.js'

const listingHtml = `
  <html>
    <head><title>Work at SaaS Labs | Careers for Innovators</title></head>
    <body>
      <h1>SaaS Labs Careers</h1>
      <h2>Open Positions</h2>
      <a href="/saas-labs/25493/">Principal Product Manager, AI</a>
      <span>Bengaluru, Karnataka, India</span>
      <span>Full Time - On-Site</span>
      <a href="/saas-labs/25538/">Sales Engineer - SaaS Labs</a>
      <span>Noida, Uttar Pradesh, India</span>
      <span>Full Time - On-Site</span>
    </body>
  </html>
`

test('recognizes the verified SaaS Labs Kula listing surface', () => {
  assert.equal(hasKulaListingSignal(listingHtml), true)
})

test('extracts India SaaS Labs positions from Kula listing HTML', () => {
  assert.deepEqual(extractJobsFromListingHtml(listingHtml), [
    {
      title: 'Principal Product Manager, AI',
      company: 'SaaS Labs',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      source: 'saaslabs',
      sourceUrl: 'https://careers.kula.ai/saas-labs/25493/',
      applyUrl: 'https://careers.kula.ai/saas-labs/25493/',
      jobId: '25493',
      requisitionId: '25493',
      employmentType: 'Full Time',
      remoteStatus: 'On-site',
      atsPlatform: 'kula',
    },
    {
      title: 'Sales Engineer - SaaS Labs',
      company: 'SaaS Labs',
      location: 'Noida, Uttar Pradesh, India',
      city: 'Noida',
      country: 'India',
      source: 'saaslabs',
      sourceUrl: 'https://careers.kula.ai/saas-labs/25538/',
      applyUrl: 'https://careers.kula.ai/saas-labs/25538/',
      jobId: '25538',
      requisitionId: '25538',
      employmentType: 'Full Time',
      remoteStatus: 'On-site',
      atsPlatform: 'kula',
    },
  ])
})

test('uses the card title when Kula places Apply Now inside the detail link', () => {
  const html = listingHtml.replace(
    '<a href="/saas-labs/25493/">Principal Product Manager, AI</a>',
    '<p>Principal Product Manager, AI</p><a href="/saas-labs/25493/">Apply Now</a>',
  )

  assert.equal(extractJobsFromListingHtml(html)[0].title, 'Principal Product Manager, AI')
})

test('scraper validates the official listing surface before extracting', async () => {
  const requestedUrls = []
  const jobs = await createSaaSLabsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return listingHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREERS_URL])
  assert.equal(jobs.length, 2)
})
