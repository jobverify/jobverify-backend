import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('BMW TechWorks India is registered as a fail-closed exact-name provider against the verified first-party shell', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'bmwtechworksindia')

  assert.ok(provider)
  assert.equal(provider.companyName, 'BMW TechWorks India')
  assert.equal(provider.homepageUrl, 'https://www.bmwtechworks.in/')
  assert.equal(provider.companyCareerPage, 'https://www.bmwtechworks.in/careers/')
  assert.equal(provider.pressReleaseUrl, 'https://www.press.bmwgroup.com/global/article/detail/T0445452EN/bmw-group-and-tata-technologies-establish-bmw-techworks-india-%E2%80%93-a-joint-venture-to-drive-automotive-software-and-business-it-innovations')
  assert.equal(provider.companyDomain, 'bmwtechworks.in')
  assert.equal(provider.atsPlatform, 'official-company-careers-role-category-shell')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'fail-closed-sentinel')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-homepage+verified-careers-role-category-shell+no-public-job-links-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /bmwtechworksindia[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /bmwtechworksindia[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.bmwtechworks\.in\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.bmwtechworks\.in\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /Roles We.?re Hiring For/i)
  assert.match(provider.verifiedSurfaceSummary, /Embedded Software Engineers/i)
  assert.match(provider.verifiedSurfaceSummary, /Pune, Bengaluru, and Chennai/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
})

test('BMW Techworks India resolves through exact-name coverage from provider metadata', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nBMW Techworks India\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['BMW Techworks India', 'bmwtechworksindia', 'BMW TechWorks India']],
  )
})

test('BMW TechWorks India is runnable through the central scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'bmwtechworksindia')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'bmwtechworksindia')
  assert.match(scraper.dryRunFile, /bmwtechworksindia[\\/]jobs\.json$/i)
})
