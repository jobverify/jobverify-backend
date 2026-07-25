import assert from 'node:assert/strict'
import test from 'node:test'

import {
  API_ENDPOINT,
  REQUEST_HEADERS,
  createCumminsIndiaScraper,
  mapCumminsJob,
} from '../cumminsindia/script.js'

const firstPage = {
  jobs: [
    {
      guid: 'AA11BB22',
      reqid: '2432540',
      title_exact: 'AI Software Engineer - Senior',
      title_slug: 'ai-software-engineer-senior',
      location_exact: 'Pune, IND',
      country_exact: 'India',
      date_new: '2026-07-03T18:21:54.816Z',
      description: 'Build AI-powered software for Cummins products.',
      job_category: 'Information Technology',
      job_shift: 'On-site with Flexibility',
      job_type: 'Exempt - Experienced',
      on_sites: [0],
    },
  ],
  pagination: { has_more_pages: true },
}

const secondPage = {
  jobs: [
    {
      guid: 'CC33DD44',
      reqid: '2432537',
      title_exact: 'Skilled Technician - Level II',
      title_slug: 'skilled-technician-level-ii',
      location_exact: 'Phaltan, IND',
      country_exact: 'India',
      date_updated: '2026-07-03T08:30:39Z',
      description: 'Maintain manufacturing equipment.',
      job_category: 'Manufacturing',
      job_shift: 'On-site with Flexibility',
      job_type: 'Shop',
      on_sites: [0],
    },
  ],
  pagination: { has_more_pages: false },
}

test('mapCumminsJob maps official Cummins India Jobsyn records to shared scraper fields', () => {
  assert.deepEqual(mapCumminsJob(firstPage.jobs[0]), {
    title: 'AI Software Engineer - Senior',
    company: 'Cummins India',
    department: 'Information Technology',
    location: 'Pune, IND',
    city: 'Pune',
    country: 'India',
    jobId: 'AA11BB22',
    requisitionId: '2432540',
    sourceUrl: 'https://cummins.jobs/pune-ind/ai-software-engineer-senior/AA11BB22/job/',
    applyUrl: 'https://cummins.jobs/pune-ind/ai-software-engineer-senior/AA11BB22/job/',
    employmentType: 'On-site with Flexibility',
    experienceRequired: 'Exempt - Experienced',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-03T18:21:54.816Z',
    closingDate: null,
    jobDescription: 'Build AI-powered software for Cummins products.',
    remoteStatus: 'On-site',
  })
})

test('Cummins India scraper paginates the official India feed', async () => {
  const requestedUrls = []
  const scraper = createCumminsIndiaScraper()

  const jobs = await scraper.run({
    fetchJson: async (url, options = {}) => {
      requestedUrls.push({ url, headers: options.headers })
      if (url.includes('page=1')) return firstPage
      if (url.includes('page=2')) return secondPage
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls.map(({ url }) => url), [
    `${API_ENDPOINT}?page=1&location=ind&num_items=25`,
    `${API_ENDPOINT}?page=2&location=ind&num_items=25`,
  ])
  assert.equal(requestedUrls[0].headers['X-Origin'], REQUEST_HEADERS['X-Origin'])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'cumminsindia')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[1].city, 'Phaltan')
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
