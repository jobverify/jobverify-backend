import assert from 'node:assert/strict'
import test from 'node:test'

import { createSigmaSolveScraper, CAREERS_PAGE_URL } from './script.js'

const DETAIL_URL = 'https://www.sigmasolve.com/who-we-are/open-position/content-growth-strategist'
const APPLY_URL = 'https://www.sigmasolve.com/who-we-are/apply-for-job?job=content-growth-strategist'
const OPENINGS_HTML = `
  <title>Open Positions | Sigma Solve</title>
  <meta name="description" content="Career opportunities at Sigma Solve. Explore current openings and apply directly." />
  <link rel="canonical" href="${CAREERS_PAGE_URL}" />
  <p>Returning Candidate?</p><input placeholder="Search your job here" />
  <a href="/who-we-are/open-position/content-growth-strategist">Content &amp; Growth Strategist</a>
  <p><span>Full-time</span><span>Marketing</span></p>
`
const detailHtml = (applyUrl = APPLY_URL) => `
  <title>Content &amp; Growth Strategist | Sigma Solve</title>
  <meta name="description" content="Own and scale Sigma Solve's marketing engine." />
  <link rel="canonical" href="${DETAIL_URL}" />
  <span>Type</span><span>Full-time</span>
  <span>Location</span><span>United States</span>
  <span>Department</span><span>Marketing</span>
  <a href="${applyUrl}">Apply for this job</a>
`

test('Sigma Solve follows the current first-party opening to its matching application form', async () => {
  const jobs = await createSigmaSolveScraper().run({
    fetchText: async (url) => {
      if (url === CAREERS_PAGE_URL) return OPENINGS_HTML
      if (url === DETAIL_URL) return detailHtml()
      throw new Error(`Unexpected URL ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Content & Growth Strategist')
  assert.equal(jobs[0].country, 'United States')
  assert.equal(jobs[0].sourceUrl, DETAIL_URL)
  assert.equal(jobs[0].applyUrl, APPLY_URL)
})

test('Sigma Solve rejects an application route for a different job', async () => {
  await assert.rejects(
    createSigmaSolveScraper().run({
      fetchText: async (url) => url === CAREERS_PAGE_URL
        ? OPENINGS_HTML
        : detailHtml('https://www.sigmasolve.com/who-we-are/apply-for-job?job=unrelated'),
    }),
    /verified Sigma Solve detail page/i,
  )
})
