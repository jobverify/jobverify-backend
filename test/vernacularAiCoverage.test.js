import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

test('Vernacular.ai resolves only to its exact official SmartRecruiters provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nVernacular.ai\nVernacular AI\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Vernacular.ai', 'vernacularai', 'Vernacular.ai']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Vernacular AI'])
})
