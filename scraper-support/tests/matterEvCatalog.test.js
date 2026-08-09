import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes Matter EV as an official apiPortal provider with validated metadata and aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'matterev')

  assert.ok(provider)
  assert.equal(provider.adapter, 'apiPortal')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyName, 'Matter EV')
  assert.equal(provider.companyCareerPage, 'https://www.matter.in/careers')
  assert.equal(provider.companyDomain, 'matter.in')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-page')
  assert.equal(provider.extractionStrategy, 'api')
  assert.equal(provider.parser, 'api-portal')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(
    provider.config.discovery.listingApiUrl,
    'https://matter-backend-integration-service.azurewebsites.net/api/getJobs',
  )
  assert.equal(provider.config.request.method, 'GET')
  assert.deepEqual(provider.config.request.headers, {
    'Content-Type': 'application/json',
    'x-functions-key': 'h1MQWjCB_Nitd4ox2hdQgrQ_brKqzPDp4YsjJPis0vRlAzFu4LCjxg==',
  })
  assert.equal(provider.config.pagination.strategy, 'single-page')
  assert.equal(provider.config.pagination.resultsPath, 'data')
  assert.equal(provider.config.mapping.title, 'job_title')
  assert.equal(provider.config.mapping.location, 'location')
  assert.equal(provider.config.mapping.jobId, 'job_id')
  assert.equal(provider.config.mapping.requisitionId, 'job_id')
  assert.deepEqual(provider.config.mapping.employmentType, {
    path: 'type',
    valueMap: {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      contract: 'Contract',
      internship: 'Internship',
    },
  })
  assert.deepEqual(provider.config.mapping.sourceUrl, {
    strategy: 'template',
    template: 'https://www.matter.in/careers?job={{jobId}}',
    values: {
      jobId: 'job_id',
    },
  })
  assert.deepEqual(provider.config.mapping.applyUrl, {
    strategy: 'template',
    template: 'https://www.matter.in/careers?apply={{jobId}}',
    values: {
      jobId: 'job_id',
    },
  })
  assert.equal(companyAliases['Matter EV'], 'matterev')
  assert.equal(companyAliases['Matter Motors'], 'matterev')
  assert.equal(companyAliases['Matter Motor Works'], 'matterev')
  assert.equal(companyAliases['Matter India'], 'matterev')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Matter'), false)
})

test('buildScrapers exposes a runnable Matter EV apiPortal scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'matterev')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /matterev[\\/]jobs\.json$/)
  assert.equal(scraper.provider.source, 'matterev')
  assert.equal(scraper.provider.atsPlatform, 'official-company-careers')
})
