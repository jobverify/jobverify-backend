import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadProviderModule = async () => {
  try {
    return await import('../absolute/provider.js')
  } catch {
    return null
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../absolute/script.js')
  } catch {
    return null
  }
}

test('Absolute exposes local provider metadata for the verified Absolute Security Jobvite careers surface', async () => {
  const providerModule = await loadProviderModule()
  const scriptModule = await loadScriptModule()

  assert.ok(
    providerModule,
    'Expected Absolute provider module at ../absolute/provider.js',
  )
  assert.ok(
    scriptModule,
    'Expected Absolute scraper module at ../absolute/script.js',
  )

  assert.deepEqual(providerModule.provider, {
    source: 'absolute',
    companyName: 'Absolute',
    officialBrandName: 'Absolute Security',
    adapter: 'script',
    modulePath: '../absolute/script.js',
    companyCareerPage: 'https://www.absolute.com/company/careers/',
    officialCareersHandoffUrl: 'https://jobs.jobvite.com/absolute/',
    atsPlatform: 'jobvite',
    countryFilter: 'India',
    paginationStrategy: 'verified-first-party-careers-handoff-plus-single-jobvite-board',
    extractionStrategy:
      'verified-official-homepage+verified-official-careers-page+jobvite-open-positions-board+india-detail-pages',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
    companyDomain: 'absolute.com',
    verifiedOn: '2026-07-14',
    verifiedSurfaceSummary:
      'Verified https://www.absolute.com/, https://www.absolute.com/company/careers/, and https://jobs.jobvite.com/absolute/ on July 14, 2026. Absolute now brands publicly as Absolute Security, and its official first-party careers page hands applicants to the public Jobvite board where India openings were visible in Bangalore and Delhi.',
    dryRunFile: 'absolute/jobs.json',
  })

  assert.equal(scriptModule.SOURCE, providerModule.provider.source)
  assert.equal(scriptModule.COMPANY, providerModule.provider.companyName)
  assert.equal(scriptModule.CAREERS_URL, providerModule.provider.companyCareerPage)
  assert.equal(
    scriptModule.JOB_BOARD_URL,
    providerModule.provider.officialCareersHandoffUrl,
  )
  assert.deepEqual(scriptModule.PROVIDER_METADATA, providerModule.provider)
})

test('buildScrapers and company coverage resolve Absolute from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'absolute')
  const scraper = buildScrapers().find((item) => item.name === 'absolute')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'Absolute')
  assert.equal(provider.companyCareerPage, 'https://www.absolute.com/company/careers/')
  assert.match(scraper.dryRunFile, /absolute[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Absolute\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Absolute', 'absolute', 'Absolute']],
  )
})
