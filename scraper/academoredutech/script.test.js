import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractJobPostings,
  createAcademorEdutechScraper,
  LINKEDIN_COMPANY_URL,
} from './script.js'

const hiringPostHtml = `
  <article data-urn="urn:li:activity:7109916574026801153">
    <a href="https://www.linkedin.com/posts/academor_academor-activity-7109916574026801153-rFEi">
      Academor's Post
    </a>
    <div class="feed-shared-update-v2__description">
      Academor is currently hiring talented individuals like you!
      Position: Inside Sales / Business Development
      Location: Bangalore
      Full-Time/Part-Time: Full Time
      Work From Office: HSR Layout Bangalore 560068
      <a href="https://forms.gle/example">Apply here</a>
    </div>
  </article>
`

test('extractJobPostings parses a company-authored LinkedIn hiring post', () => {
  const jobs = extractJobPostings(hiringPostHtml)

  assert.deepEqual(jobs, [{
    title: 'Inside Sales / Business Development',
    company: 'Academor Edutech',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    employmentType: 'Full Time',
    sourceUrl: 'https://www.linkedin.com/posts/academor_academor-activity-7109916574026801153-rFEi',
    applyUrl: 'https://forms.gle/example',
    jobDescription: 'Academor is currently hiring talented individuals like you!',
    remoteStatus: 'On-site',
  }])
})

test('run fetches the official public company feed and ignores non-hiring updates', async () => {
  const scraper = createAcademorEdutechScraper()
  const requestedUrls = []
  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return `<article data-urn="urn:li:activity:1"><div>Academor shares a course update.</div></article>${hiringPostHtml}`
    },
  })

  assert.deepEqual(requestedUrls, [LINKEDIN_COMPANY_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'academoredutech')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
