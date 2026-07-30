import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

test('HolidayIQ exact CSV row resolves to the fail-closed provider', async () => {
  const { HOLIDAYIQ_CATALOG } = await import('../holidayiq/catalog.js')
  const provider = hydrateProviderCatalogEntry(HOLIDAYIQ_CATALOG)
  const report = generateCompanyCoverageReport({
    csvText: 'HolidayIQ\n',
    catalog: [provider],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'holidayiq')
  assert.equal(provider.companyName, 'HolidayIQ')
  assert.equal(provider.companyCareerPage, 'https://www.holidayiq.com/')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(provider.modulePath, path.resolve(currentDir, '../holidayiq/script.js'))
})

test('HolidayIQ is registered and returns no fabricated jobs', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'holidayiq')
  const scraper = buildScrapers().find((item) => item.name === 'holidayiq')
  const holidayiq = await import('../holidayiq/script.js')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(scraper.provider.companyName, 'HolidayIQ')
  assert.equal(scraper.provider.atsPlatform, 'official-first-party-surface-no-careers-sentinel')
  assert.deepEqual(await holidayiq.createHolidayIQScraper().run(), [])
  assert.deepEqual(await scraper.run(), [])
})
