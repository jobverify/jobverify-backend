import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildHimalayasSearchUrl,
  createAggregateHimalayasSignalJob,
  createHimalayasDirectoryScraper,
} from '../himalayasDirectory/engine.js'

const provider = {
  source: 'hmacvauctions',
  companyName: 'ACV Auctions',
  adapter: 'himalayasDirectory',
  companyCareerPage: 'https://himalayas.app/jobs/countries/india/software-engineering?page=2',
  atsPlatform: 'himalayas-remote-jobs-api',
  countryFilter: 'India',
  himalayasSearchQuery: 'ACV Auctions',
  himalayasCompanySlug: 'acv-auctions',
  exampleOpening: 'Software Engineer V, ACVMax',
  locationEvidence: 'India eligible remote',
  directorySourceType: 'Himalayas India remote jobs directory',
  verifiedOn: '2026-07-23',
}

test('buildHimalayasSearchUrl queries the public search API by company and India eligibility', () => {
  const url = new URL(buildHimalayasSearchUrl({ provider, page: 2 }))

  assert.equal(url.origin, 'https://himalayas.app')
  assert.equal(url.pathname, '/jobs/api/search')
  assert.equal(url.searchParams.get('q'), 'ACV Auctions')
  assert.equal(url.searchParams.get('country'), 'IN')
  assert.equal(url.searchParams.get('sort'), 'recent')
  assert.equal(url.searchParams.get('page'), '2')
})

test('Himalayas scraper maps matching India-eligible API jobs and skips unrelated records', async () => {
  const requestedUrls = []
  const scraper = createHimalayasDirectoryScraper(provider)
  const jobs = await scraper.run({
    fetchJson: async (url) => {
      requestedUrls.push(url)
      const page = new URL(url).searchParams.get('page')
      if (page === '2') return { jobs: [], totalCount: 3 }

      return {
        jobs: [
          {
            title: 'Software Engineer V, ACVMax',
            excerpt: 'Build marketplace software.',
            companyName: 'ACV Auctions',
            companySlug: 'acv-auctions',
            employmentType: 'Full Time',
            seniority: ['Senior'],
            categories: ['Product & Technology', 'Software Engineering'],
            parentCategories: ['Engineering'],
            description: '<p>Build Java services for ACV.</p>',
            pubDate: Date.UTC(2026, 1, 14),
            expiryDate: Date.UTC(2026, 3, 15),
            applicationLink:
              'https://himalayas.app/companies/acv-auctions/jobs/software-engineer-v-acvmax-4000986855',
            guid: '4000986855',
            locationRestrictions: [],
            timezoneRestrictions: [],
          },
          {
            title: 'India Support Engineer',
            excerpt: 'Support India customers.',
            companyName: 'ACV Auctions',
            companySlug: 'acv-auctions',
            employmentType: 'Full Time',
            seniority: ['Mid-level'],
            categories: ['Engineering'],
            parentCategories: ['Engineering'],
            description: '<p>Work with India-based teams.</p>',
            pubDate: Date.UTC(2026, 6, 1),
            applicationLink:
              'https://himalayas.app/companies/acv-auctions/jobs/india-support-engineer-123',
            guid: 'india-support-engineer-123',
            locationRestrictions: [{ alpha2: 'IN', name: 'India', slug: 'india' }],
            timezoneRestrictions: [],
          },
          {
            title: 'Software Engineer',
            companyName: 'Different Company',
            companySlug: 'different-company',
            applicationLink: 'https://himalayas.app/companies/different-company/jobs/1',
            guid: 'different-company-1',
            locationRestrictions: [],
          },
          {
            title: 'US-only Engineer',
            companyName: 'ACV Auctions',
            companySlug: 'acv-auctions',
            applicationLink: 'https://himalayas.app/companies/acv-auctions/jobs/us-only',
            guid: 'us-only',
            locationRestrictions: [{ alpha2: 'US', name: 'United States', slug: 'united-states' }],
          },
        ],
      }
    },
  })

  assert.equal(requestedUrls.length, 2)
  assert.deepEqual(jobs.map((job) => job.title), [
    'Software Engineer V, ACVMax',
    'India Support Engineer',
  ])
  assert.equal(jobs[0].company, 'ACV Auctions')
  assert.equal(jobs[0].location, 'Worldwide / India eligible')
  assert.equal(jobs[0].city, 'Remote')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].source, 'hmacvauctions')
  assert.equal(jobs[0].jobId, '4000986855')
  assert.equal(jobs[0].department, 'Product & Technology')
  assert.equal(jobs[0].employmentType, 'Full Time')
  assert.equal(jobs[0].postingDate, '2026-02-14')
  assert.equal(jobs[0].remoteStatus, 'Remote')
  assert.match(jobs[0].jobDescription, /Build Java services/)
  assert.equal(jobs[1].location, 'India')
})

test('Himalayas scraper falls back to the workbook hiring signal when API search is empty', async () => {
  const scraper = createHimalayasDirectoryScraper(provider)
  const jobs = await scraper.run({
    fetchJson: async () => ({ jobs: [], totalCount: 0 }),
  })

  const expectedJob = createAggregateHimalayasSignalJob({
    provider,
    sourceUrl: provider.companyCareerPage,
  })

  assert.equal(jobs.length, 1)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  assert.deepEqual(jobs[0], {
    ...expectedJob,
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.equal(jobs[0].title, 'Current remote openings at ACV Auctions')
  assert.equal(jobs[0].location, 'India eligible remote')
  assert.equal(jobs[0].city, 'Remote')
  assert.match(jobs[0].jobDescription, /Software Engineer V, ACVMax/)
  assert.match(jobs[0].jobDescription, /Verified on 2026-07-23/)
})

test('Himalayas scraper falls back to the workbook hiring signal when the API is unavailable', async () => {
  const scraper = createHimalayasDirectoryScraper(provider)
  const jobs = await scraper.run({
    fetchJson: async () => {
      throw new Error('The operation was aborted due to timeout')
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Current remote openings at ACV Auctions')
  assert.equal(jobs[0].sourceUrl, provider.companyCareerPage)
  assert.match(jobs[0].jobDescription, /Software Engineer V, ACVMax/)
})
