import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../../scraper-support/providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('CogniTensor is an exact first-party fail-closed provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'cognitensor')

  assert.ok(provider)
  assert.equal(provider.companyName, 'CogniTensor')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.cognitensor.com/')
  assert.equal(provider.companyDomain, 'cognitensor.com')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.match(provider.atsPlatform, /^official-first-party-/)
  assert.match(provider.modulePath, /cognitensor[\\/]script\.js$/i)
})

test('CogniTensor covers only the literal CSV company name without fuzzy substitution', async () => {
  const report = generateCompanyCoverageReport({
    csvText: 'CogniTensor\nCognitensor Technologies\nCognitiv\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source]),
    [['CogniTensor', 'cognitensor']],
  )
  assert.deepEqual(
    report.unmatched.map((item) => item.companyName),
    ['Cognitensor Technologies', 'Cognitiv'],
  )

  const scraper = buildScrapers().find((item) => item.name === 'cognitensor')
  assert.ok(scraper)
  assert.deepEqual(await scraper.run(), [])
})
