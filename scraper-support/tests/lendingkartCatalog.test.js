import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Lendingkart is registered as a verified Darwinbox script provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lendingkart')

  assert.ok(provider, 'Expected Lendingkart provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Lendingkart')
  assert.equal(provider.companyCareerPage, 'https://www.lendingkart.com/job/')
  assert.equal(provider.officialCareersPage, 'https://www.lendingkart.com/careers/')
  assert.equal(provider.darwinboxOrigin, 'https://hrlendingkart.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(
    provider.publicAllJobsUrl,
    'https://hrlendingkart.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    provider.verifiedJobDetailExampleUrl,
    'https://hrlendingkart.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a7318ee583fe?from=all',
  )
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'browser-session-darwinbox-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+public-job-listing-page+darwinbox-jobdetail-links+browser-session-darwinbox-pagination',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.companyDomain, 'lendingkart.com')
  assert.equal(provider.verifiedOn, '2026-08-07')
  assert.match(provider.verifiedSurfaceSummary, /lendingkart\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /lendingkart\.com\/job/i)
  assert.match(provider.verifiedSurfaceSummary, /Friday, August 7, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /jobdetails\/a6a7318ee583fe/i)
  assert.match(provider.modulePath, /lendingkart[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /lendingkart[\\/]jobs\.json$/i)
})

test('Lendingkart is runnable through the shared scraper catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'lendingkart')

  assert.ok(scraper, 'Expected buildScrapers() to return the Lendingkart scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'lendingkart')
  assert.equal(scraper.provider.companyCareerPage, 'https://www.lendingkart.com/job/')
  assert.match(scraper.dryRunFile, /lendingkart[\\/]jobs\.json$/i)
})
