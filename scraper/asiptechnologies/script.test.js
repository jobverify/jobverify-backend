import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_PAGE_URL,
  createAsipTechnologiesScraper,
  extractListings,
} from './script.js'

const careersHtml = `
<main>
  <div class="job-listing">
    <a href="https://asip-tech.com/career/end-of-line-eol-manager/">End-of-Line (EOL) Manager</a>
    <span class="job-category">Engineering</span>
    <span class="job-type">Full Time</span>
    <span class="job-location">Hyderabad</span>
  </div>
  <div class="job-listing">
    <a href="/career/test/">DFT Architect, Sr. DFT Engineer, DFT Engineer</a>
    <span class="job-category">Engineering</span>
    <span class="job-type">Full Time</span>
    <span class="job-location">Hyderabad</span>
  </div>
</main>
`

const detailHtml = `
<main>
  <h1>End-of-Line (EOL) Manager</h1>
  <div class="entry-content">
    <p>Oversee End-of-Line operations and lead the production team.</p>
  </div>
  <div>Job Category: <a>Engineering</a></div>
  <div>Job Type: <a>Full Time</a></div>
  <div>Job Location: <a>Hyderabad</a></div>
</main>
`

test('extractListings maps ASIP careers cards to shared job fields', () => {
  const jobs = extractListings(careersHtml)

  assert.deepEqual(jobs, [
    {
      title: 'End-of-Line (EOL) Manager',
      company: 'ASIP Technologies',
      department: 'Engineering',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'end-of-line-eol-manager',
      requisitionId: 'end-of-line-eol-manager',
      sourceUrl: 'https://asip-tech.com/career/end-of-line-eol-manager/',
      applyUrl: 'https://asip-tech.com/career/end-of-line-eol-manager/',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'DFT Architect, Sr. DFT Engineer, DFT Engineer',
      company: 'ASIP Technologies',
      department: 'Engineering',
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'test',
      requisitionId: 'test',
      sourceUrl: 'https://asip-tech.com/career/test/',
      applyUrl: 'https://asip-tech.com/career/test/',
      employmentType: 'Full Time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('run fetches ASIP listings and enriches them from first-party detail pages', async () => {
  const requestedUrls = []
  const scraper = createAsipTechnologiesScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === CAREERS_PAGE_URL) return careersHtml
      if (url === 'https://asip-tech.com/career/end-of-line-eol-manager/') return detailHtml
      if (url === 'https://asip-tech.com/career/test/') return detailHtml.replace('End-of-Line (EOL) Manager', 'DFT Architect, Sr. DFT Engineer, DFT Engineer')
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    CAREERS_PAGE_URL,
    'https://asip-tech.com/career/end-of-line-eol-manager/',
    'https://asip-tech.com/career/test/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'asiptechnologies')
  assert.equal(jobs[0].link, 'https://asip-tech.com/career/end-of-line-eol-manager/')
  assert.equal(jobs[0].jobDescription, 'Oversee End-of-Line operations and lead the production team.')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
