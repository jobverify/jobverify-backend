import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScrapers,
  getScraperCatalog,
} from '../providers/index.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }

test('getScraperCatalog includes both Kyndryl India Workday career portals', () => {
  const catalog = getScraperCatalog()
  const professional = catalog.find((provider) => provider.source === 'kyndrylprofessional')
  const early = catalog.find((provider) => provider.source === 'kyndrylearly')

  assert.ok(professional)
  assert.ok(early)

  for (const provider of [professional, early]) {
    assert.equal(provider.adapter, 'workday')
    assert.equal(provider.atsPlatform, 'workday')
    assert.equal(provider.companyName, 'Kyndryl India Pvt. Ltd. (GTS)')
    assert.equal(provider.companyCareerPage, 'https://www.kyndryl.com/in/en/careers')
    assert.equal(provider.companyDomain, 'kyndryl.com')
    assert.equal(provider.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  }

  assert.match(professional.baseUrl, /kyndryl\.wd5\.myworkdayjobs\.com\/KyndrylProfessionalCareers/i)
  assert.match(early.baseUrl, /kyndryl\.wd5\.myworkdayjobs\.com\/KyndrylEarlyCareers/i)
  assert.equal(companyAliases['KINDRYL INDIA'], 'kyndrylprofessional')
  assert.equal(companyAliases['Kyndryl India Pvt. Ltd (GTS)'], 'kyndrylprofessional')
})

test('buildScrapers exposes runnable Kyndryl India Workday scrapers without changing the runner contract', () => {
  const scrapers = buildScrapers()
  const professional = scrapers.find((scraper) => scraper.name === 'kyndrylprofessional')
  const early = scrapers.find((scraper) => scraper.name === 'kyndrylearly')

  assert.ok(professional)
  assert.ok(early)
  assert.equal(typeof professional.run, 'function')
  assert.equal(typeof early.run, 'function')
  assert.match(professional.dryRunFile, /myworkday[\\/]kyndrylprofessional[\\/]jobs\.json$/)
  assert.match(early.dryRunFile, /myworkday[\\/]kyndrylearly[\\/]jobs\.json$/)
})
