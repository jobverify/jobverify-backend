import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../scraper-support/providers/index.js'

const officialHomepageHtml = `
  <html><head><title>Ditto Insurance</title></head>
  <body><a href="https://ditto.zappyhire.com/">Careers</a></body></html>
`

test('Ditto Insurance exact CSV name resolves to its provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nDitto Insurance\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'dittoinsurance')
  assert.equal(report.matched[0].provider.companyName, 'Ditto Insurance')
})

test('Ditto Insurance validates the official careers handoff and fails closed', async () => {
  const ditto = await import('../scraper/dittoinsurance/script.js')
  const provider = getScraperCatalog().find((item) => item.source === 'dittoinsurance')
  const scraper = buildScrapers().find((item) => item.name === 'dittoinsurance')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(ditto.hasVerifiedOfficialCareersHandoff(officialHomepageHtml), true)
  assert.deepEqual(
    await ditto.createDittoInsuranceScraper().run({ fetchText: async () => officialHomepageHtml }),
    [],
  )
  assert.deepEqual(await scraper.run({ fetchText: async () => officialHomepageHtml }), [])
})

test('Ditto Insurance rejects an untrusted careers surface', async () => {
  const ditto = await import('../scraper/dittoinsurance/script.js')

  await assert.rejects(
    ditto.createDittoInsuranceScraper().run({ fetchText: async () => '<html>Other company</html>' }),
    /careers handoff changed materially/i,
  )
})
