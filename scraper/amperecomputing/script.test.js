import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  SEARCH_URL,
  createAmpereComputingScraper,
  extractSearchResults,
} from './script.js'

const searchHtml = `
<main>
  <div class="job-card">
    <a class="job-title" href="/jobs/17948977-principal-cloud-and-devops-engineer">Principal Cloud &amp; DevOps Engineer</a>
    <span class="job-category">Information Technology</span>
    <span class="job-location">Pune, MH, India</span>
  </div>
  <div class="job-card">
    <a class="job-title" href="/jobs/17948978-principal-cloud-and-devops-engineer">Principal Cloud &amp; DevOps Engineer</a>
    <span class="job-category">Information Technology</span>
    <span class="job-location">Portland, OR, United States</span>
  </div>
</main>
`

const detailHtml = `
<html>
  <head>
    <script type="application/ld+json">
      {"@type":"JobPosting","title":"Principal Cloud & DevOps Engineer","description":"Build and operate cloud delivery systems.","datePosted":"2026-07-01","employmentType":"FULL_TIME","jobLocation":{"address":{"addressLocality":"Pune","addressRegion":"MH","addressCountry":"India"}}}
    </script>
  </head>
</html>
`

test('extractSearchResults keeps India jobs and maps official detail URLs', () => {
  assert.deepEqual(extractSearchResults(searchHtml), [
    {
      title: 'Principal Cloud & DevOps Engineer',
      category: 'Information Technology',
      location: 'Pune, MH, India',
      jobId: '17948977',
      sourceUrl: 'https://careers.amperecomputing.com/jobs/17948977-principal-cloud-and-devops-engineer',
    },
  ])
})

test('run enriches India listings from official detail pages', async () => {
  const requestedUrls = []
  const scraper = createAmpereComputingScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === SEARCH_URL) return searchHtml
      if (url === 'https://careers.amperecomputing.com/jobs/17948977-principal-cloud-and-devops-engineer') return detailHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    SEARCH_URL,
    'https://careers.amperecomputing.com/jobs/17948977-principal-cloud-and-devops-engineer',
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Principal Cloud & DevOps Engineer',
    company: 'Ampere Computing',
    location: 'Pune, MH, India',
    city: 'Pune',
    country: 'India',
    link: 'https://careers.amperecomputing.com/jobs/17948977-principal-cloud-and-devops-engineer',
    applyUrl: 'https://careers.amperecomputing.com/jobs/17948977-principal-cloud-and-devops-engineer',
    sourceUrl: 'https://careers.amperecomputing.com/jobs/17948977-principal-cloud-and-devops-engineer',
    source: 'amperecomputing',
    jobId: '17948977',
    requisitionId: '17948977',
    department: 'Information Technology',
    employmentType: 'Full-time',
    experienceRequired: null,
    postingDate: '2026-07-01',
    closingDate: null,
    jobDescription: 'Build and operate cloud delivery systems.',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.equal(CAREER_PAGE_URL, 'https://careers.amperecomputing.com/')
})
