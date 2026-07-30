import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'

test('Intuitive resolves only to its exact official SmartRecruiters provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nIntuitive\nIntuitive Surgical\n',
    catalog: getScraperCatalog(),
  })

  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Intuitive', 'intuitive', 'Intuitive']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Intuitive Surgical'])
})
