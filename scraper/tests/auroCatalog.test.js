import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'

test('getScraperCatalog includes AURO University with its official general-application careers page', () => {
  const catalog = getScraperCatalog()
  const auro = catalog.find((provider) => provider.source === 'auro')

  assert.ok(auro)
  assert.equal(auro.adapter, 'script')
  assert.equal(auro.atsPlatform, 'official-company-careers')
  assert.equal(auro.companyName, 'AURO University')
  assert.equal(
    auro.companyCareerPage,
    'https://www.aurouniversity.edu.in/job-and-vacancies/',
  )
  assert.equal(auro.companyDomain, 'aurouniversity.edu.in')
  assert.equal(auro.extractionStrategy, 'general-application-form')
})

test('AURO University scraper returns no jobs when its official careers page provides only a general application form', async () => {
  const auro = await import('../auro/script.js')
  const scraper = auro.createAuroScraper()

  const jobs = await scraper.run({
    fetchText: async (url) => {
      assert.equal(url, auro.CAREER_PAGE_URL)
      return '<main><h1>Jobs and Vacancies</h1><form><input name="name" /></form></main>'
    },
  })

  assert.deepEqual(jobs, [])
})

test('buildScrapers exposes a runnable AURO University scraper without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const auro = scrapers.find((scraper) => scraper.name === 'auro')

  assert.ok(auro)
  assert.equal(typeof auro.run, 'function')
  assert.match(auro.dryRunFile, /auro[\\/]jobs\.json$/)
  assert.equal(auro.provider.source, 'auro')
  assert.equal(auro.provider.adapter, 'script')
})
