import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('SCTIMST is registered as an official recruitment scraper and resolves the company alias', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === 'sreechitratirunalinstitute')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Sree Chitra Tirunal Institute for Medical Sciences and Technology')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-government-careers')
  assert.equal(provider.companyCareerPage, 'https://www.sctimst.ac.in/recruitment/')
  assert.equal(provider.companyDomain, 'sctimst.ac.in')
  assert.match(provider.modulePath, /sreechitratirunalinstitute[\\/]script\.js$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'row,company_name\n1,Sree Chitra Tirunal Institute\n2,SCTIMST\n',
    catalog,
  })

  assert.deepEqual(report.matched.map((item) => [item.companyName, item.source]), [
    ['Sree Chitra Tirunal Institute', 'sreechitratirunalinstitute'],
    ['SCTIMST', 'sreechitratirunalinstitute'],
  ])
})

test('buildScrapers exposes a runnable SCTIMST scraper', () => {
  const scraper = buildScrapers().find((item) => item.name === 'sreechitratirunalinstitute')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.adapter, 'script')
  assert.match(scraper.dryRunFile, /sreechitratirunalinstitute[\\/]jobs\.json$/i)
})
