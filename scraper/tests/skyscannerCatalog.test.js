import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const loadCatalogModule = async () => import('../skyscanner/catalog.js')
const loadScriptModule = async () => import('../skyscanner/script.js')

test('Skyscanner exact CSV row resolves to the verified fail-closed provider', async () => {
  const { SKYSCANNER_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SKYSCANNER_CATALOG)
  const report = generateCompanyCoverageReport({
    csvText: 'Skyscanner\n',
    catalog: [provider],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'skyscanner')
  assert.equal(provider.companyCareerPage, 'https://www.skyscanner.com/jobs/current-jobs')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.equal(provider.modulePath, path.resolve(currentDir, '../skyscanner/script.js'))
})

test('Skyscanner sentinel returns empty only for the verified non-enumerable shell', async () => {
  const skyscanner = await loadScriptModule()
  const shell = '<h1>Current jobs</h1><select>All teams</select><select>All locations</select><input placeholder="Search by title, team or location">'

  assert.equal(skyscanner.hasVerifiedJobsShellSignal(shell), true)
  assert.equal(skyscanner.hasEnumerableJobsSignal(shell), false)
  assert.deepEqual(await skyscanner.createSkyscannerScraper().run({ fetchText: async () => shell }), [])
  await assert.rejects(
    skyscanner.createSkyscannerScraper().run({
      fetchText: async () => `${shell}<a href="/jobs/job/1234567">Engineer</a>`,
    }),
    /enumerable public jobs/i,
  )
  await assert.rejects(
    skyscanner.createSkyscannerScraper().run({ fetchText: async () => '<h1>Careers</h1>' }),
    /trusted filter shell/i,
  )
})
