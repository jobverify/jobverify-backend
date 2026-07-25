import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  createAxiraLabsScraper,
  extractSearchResults,
} from './script.js'

const careerPageHtml = `
  <main>
    <h1>Build the Future of Diagnostics.</h1>
    <section id="current-openings">
      <h2>Current Openings</h2>
      <article>
        <h3>QA Assistant +</h3>
        <p>Bengaluru &bull; Full-time &bull; Operations</p>
        <a href="/contact">Apply Now</a>
        <p>We are looking for a QA Assistant to support quality assurance activities across manufacturing and testing operations.</p>
      </article>
    </section>
  </main>
`

test('extractSearchResults maps visible Achira Labs career cards into shared job fields', () => {
  assert.equal(CAREER_PAGE_URL, 'https://achiralabs.com/careers')

  assert.deepEqual(extractSearchResults(careerPageHtml), [
    {
      title: 'QA Assistant',
      company: 'Achira Labs',
      department: 'Operations',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'qa-assistant',
      requisitionId: 'qa-assistant',
      sourceUrl: 'https://achiralabs.com/careers#qa-assistant',
      applyUrl: 'https://achiralabs.com/contact',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'We are looking for a QA Assistant to support quality assurance activities across manufacturing and testing operations.',
      remoteStatus: 'On-site',
    },
  ])
})

test('run fetches the official careers page and decorates extracted jobs', async () => {
  const requestedUrls = []
  const jobs = await createAxiraLabsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careerPageHtml
    },
  })

  assert.deepEqual(requestedUrls, [CAREER_PAGE_URL])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'axiralabs')
  assert.equal(jobs[0].link, 'https://achiralabs.com/contact')
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})
