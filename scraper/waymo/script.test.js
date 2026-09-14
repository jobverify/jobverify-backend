import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

import {
  buildIndiaSearchUrl,
  createWaymoScraper,
  extractJobsFromSearchHtml,
} from './script.js'

const searchHtml = `
  <html>
    <body>
      <span class="badge" id="country_code_count_1_0_0">2</span>
      <div class="table-counts"><p>Displaying <b>all&nbsp;2</b> entries</p></div>
      <article class="col-12 job-search-results-card-col">
        <h3 class="card-title job-search-results-card-title">
          <a id="link_job_title_1_0_0" href="https://careers.withwaymo.com/jobs/senior-software-engineer-compute-software-bengaluru-karnataka-india">Senior Software Engineer, Compute Software</a>
        </h3>
        <li class="job-component-icon-and-text job-component-location">
          <span>Bengaluru, Karnataka</span>
        </li>
        <li class="job-component-icon-and-text job-component-department">
          <span>Software Engineering</span>
        </li>
        <li class="job-component-icon-and-text job-component-employment-type">
          <span>Full-Time</span>
        </li>
        <li class="job-component-icon-and-text job-component-dropdown-field-2">
          <span>Mid Career</span>
        </li>
        <p class="card-text job-search-results-summary">
          Waymo is an autonomous driving technology company with the mission to be the world&#39;s most trusted driver.
        </p>
      </article>
      <article class="col-12 job-search-results-card-col">
        <h3 class="card-title job-search-results-card-title">
          <a id="link_job_title_1_0_1" href="/jobs/software-quality-operations-specialist-safety-evaluation-hyderabad-telangana-india">Software Quality Operations Specialist, Safety Evaluation</a>
        </h3>
        <li class="job-component-icon-and-text job-component-location">
          <span>Hyderabad, Telangana</span>
        </li>
        <li class="job-component-icon-and-text job-component-department">
          <span>Engineering Operations</span>
        </li>
        <li class="job-component-icon-and-text job-component-employment-type">
          <span>Full-Time</span>
        </li>
        <li class="job-component-icon-and-text job-component-dropdown-field-2">
          <span>Advanced Career</span>
        </li>
        <p class="card-text job-search-results-summary">Safety evaluation operations role.</p>
      </article>
    </body>
  </html>
`

test('buildIndiaSearchUrl uses Waymo first-party country filtering', () => {
  assert.equal(
    buildIndiaSearchUrl(),
    'https://careers.withwaymo.com/jobs/search?country_codes%5B%5D=IN',
  )
})

test('Waymo provider metadata is a runnable Clinch scraper, not a coverage-gap sentinel', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'waymo')
  const scraper = buildScrapers().find((item) => item.name === 'waymo')

  assert.equal(provider.atsPlatform, 'clinch-first-party-careers')
  assert.equal(provider.zeroResultPolicy, 'evidence-required')
  assert.equal(provider.verifiedIndiaJobCount, 5)
  assert.equal(typeof scraper.run, 'function')
})

test('extractJobsFromSearchHtml maps server-rendered Waymo India cards', () => {
  assert.deepEqual(extractJobsFromSearchHtml(searchHtml, {
    scrapedAt: '2026-09-14T00:00:00.000Z',
  }), [
    {
      jobId: 'senior-software-engineer-compute-software-bengaluru-karnataka-india',
      title: 'Senior Software Engineer, Compute Software',
      company: 'Waymo',
      department: 'Software Engineering',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      sourceUrl: 'https://careers.withwaymo.com/jobs/senior-software-engineer-compute-software-bengaluru-karnataka-india',
      applyUrl: 'https://careers.withwaymo.com/jobs/senior-software-engineer-compute-software-bengaluru-karnataka-india',
      employmentType: 'Full-Time',
      experienceRequired: 'Mid Career',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: "Waymo is an autonomous driving technology company with the mission to be the world's most trusted driver.",
      requisitionId: 'senior-software-engineer-compute-software-bengaluru-karnataka-india',
      source: 'waymo',
      link: 'https://careers.withwaymo.com/jobs/senior-software-engineer-compute-software-bengaluru-karnataka-india',
      scrapedAt: '2026-09-14T00:00:00.000Z',
    },
    {
      jobId: 'software-quality-operations-specialist-safety-evaluation-hyderabad-telangana-india',
      title: 'Software Quality Operations Specialist, Safety Evaluation',
      company: 'Waymo',
      department: 'Engineering Operations',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      sourceUrl: 'https://careers.withwaymo.com/jobs/software-quality-operations-specialist-safety-evaluation-hyderabad-telangana-india',
      applyUrl: 'https://careers.withwaymo.com/jobs/software-quality-operations-specialist-safety-evaluation-hyderabad-telangana-india',
      employmentType: 'Full-Time',
      experienceRequired: 'Advanced Career',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Safety evaluation operations role.',
      requisitionId: 'software-quality-operations-specialist-safety-evaluation-hyderabad-telangana-india',
      source: 'waymo',
      link: 'https://careers.withwaymo.com/jobs/software-quality-operations-specialist-safety-evaluation-hyderabad-telangana-india',
      scrapedAt: '2026-09-14T00:00:00.000Z',
    },
  ])
})

test('createWaymoScraper fetches the India search page and marks complete inventory', async () => {
  const requestedUrls = []

  const jobs = await createWaymoScraper({
    now: () => '2026-09-14T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return searchHtml
    },
  })

  assert.deepEqual(requestedUrls, [buildIndiaSearchUrl()])
  assert.equal(jobs.length, 2)
  assert.equal(readInventoryEvidence(jobs)?.status, 'complete-inventory')
  assert.equal(readInventoryEvidence(jobs)?.reportedTotal, 2)
  assert.equal(readInventoryEvidence(jobs)?.indiaFacetCount, 2)
})
