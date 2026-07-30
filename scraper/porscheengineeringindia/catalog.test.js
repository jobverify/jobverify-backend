import assert from 'node:assert/strict'
import test from 'node:test'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import {
  createPorscheEngineeringIndiaScraper,
  hasOfficialCareerPortalShell,
  hasPublicListingSignal,
} from './script.js'

const PORTAL_SHELL = '<title>Career-Portal</title> Search for jobs Keywords Country Location'

test('Porsche Engineering India is registered as an exact-name fail-closed sentinel without aliases', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'porscheengineeringindia')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Porsche Engineering India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.atsPlatform, 'official-porsche-career-portal-non-enumerable-india-surface')
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Porsche Engineering India'), false)
})

test('Porsche Engineering India resolves exactly through provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Porsche Engineering India,\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'porscheengineeringindia')
})

test('Porsche Engineering India sentinel returns empty only for the trusted portal shell', async () => {
  assert.equal(hasOfficialCareerPortalShell(PORTAL_SHELL), true)
  assert.equal(hasPublicListingSignal(PORTAL_SHELL), false)
  assert.deepEqual(await createPorscheEngineeringIndiaScraper().run({
    fetchText: async () => PORTAL_SHELL,
  }), [])
})

test('Porsche Engineering India sentinel fails closed when public listings appear or the shell drifts', async () => {
  assert.equal(hasPublicListingSignal(`${PORTAL_SHELL} ac=jobad`), true)
  await assert.rejects(
    createPorscheEngineeringIndiaScraper().run({
      fetchText: async () => `${PORTAL_SHELL} ac=jobad`,
    }),
    /public listing surface/,
  )
  await assert.rejects(
    createPorscheEngineeringIndiaScraper().run({
      fetchText: async () => '<html>changed</html>',
    }),
    /non-enumerable shell/,
  )
})

test('Porsche Engineering India sentinel is runnable through the provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'porscheengineeringindia')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /porscheengineeringindia[\\/]jobs\.json$/i)
})
