import assert from 'node:assert/strict'
import test from 'node:test'

import manifest from '../../artifacts/workbook-batches/workbook-batch-05.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../scraper/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper/providers/index.js'
import batchProviders from '../scraper/providers/providerExtensions/workbook-batch-05.json' with { type: 'json' }

const buildCsvText = (companies) =>
  `company_name\n${companies.map((company) => `"${String(company).replace(/"/g, '""')}"`).join('\n')}\n`

const EXPECTED_SOURCES = new Map([
  ['SmarterAI', 'smarterai'],
  ['Snapmint', 'snapmint'],
  ['SocialPilot', 'socialpilot'],
  ['Somany Ceramics Digital', 'somanyceramics'],
  ['Sphera India', 'spheraindia'],
  ['Sporjo', 'sporjo'],
  ['Stackbox', 'stackbox'],
  ['StarHealth Digital', 'starhealthdigital'],
  ['Sukoon', 'sukoon'],
  ['SumUp India', 'sumupindia'],
  ['SuperGaming', 'supergaming'],
  ['Supr Daily', 'suprdaily'],
  ['Suryoday', 'suryoday'],
  ['Synup', 'synup'],
  ['TeamLease Digital', 'teamlease'],
  ['Techjockey', 'techjockey'],
  ['Technovert', 'technovert'],
  ['TelioEV', 'telioev'],
  ['ThirdEyeData', 'thirdeyedata'],
  ['Trell', 'trell'],
  ['Trigyn', 'trigyn'],
  ['Tricog', 'tricog'],
  ['Truecaller India', 'truecallerindia'],
  ['TruKKer India', 'trukkerindia'],
  ['Twimbit', 'twimbit'],
  ['Unbxd', 'unbxd'],
  ['Uniqus', 'uniqus'],
  ['Uolo', 'uolo'],
  ['UrbanPiper', 'urbanpiper'],
  ['Vakilsearch', 'vakilsearch'],
  ['Varthana', 'varthana'],
  ['Very Good Security India', 'verygoodsecurityindia'],
  ['Vervotech', 'vervotech'],
  ['WATI', 'wati'],
  ['Wealthy', 'wealthy'],
])

test('workbook batch 05 manifest companies all resolve to providers', () => {
  const report = generateCompanyCoverageReport({
    csvText: buildCsvText(manifest.companies),
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, manifest.companies.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => ({
      companyName: item.companyName,
      source: item.source,
    })),
    manifest.companies.map((companyName) => ({
      companyName,
      source: EXPECTED_SOURCES.get(companyName),
    })),
  )
})

test('workbook batch 05 replaces the generic sentinel only for explicitly verified public contracts', () => {
  const specializedProviders = new Map([
    ['smarterai', 'verified-public-open-positions-detail-pages'],
    ['snapmint', 'verified-public-careers-jsonld'],
    ['socialpilot', 'verified-public-careers-jsonld'],
    ['spheraindia', 'verified-first-party-workday-handoff'],
    ['sporjo', 'verified-exact-name-public-surface-fail-closed-sentinel'],
    ['stackbox', 'verified-exact-name-public-company-surface'],
    ['starhealthdigital', 'verified-non-enumerable-careers-cta'],
    ['sukoon', 'verified-exact-name-company-surface-with-hiring-signals'],
    ['sumupindia', 'verified-public-positions-page'],
    ['supergaming', 'official-company-site-email-handoff'],
    ['suprdaily', 'verified-exact-name-public-company-surface'],
    ['suryoday', 'verified-workline-general-openings-table'],
    ['synup', 'first-party-careers-page-linkedin-handoff'],
    ['techjockey', 'verified-first-party-careers-empty-result'],
    ['technovert', 'verified-tezo-rebrand-keka-handoff-fail-closed'],
    ['telioev', 'verified-exact-name-public-surface-fail-closed'],
    ['thirdeyedata', 'verified-public-jobpost-detail-pages'],
    ['trell', 'verified-exact-name-public-surface-fail-closed-sentinel'],
    ['tricog', 'verified-first-party-resume-intake-surface'],
    ['trigyn', 'verified-first-party-careers-empty-drupal-listing-wrapper'],
    ['truecallerindia', 'verified-public-careers-jsonld'],
    ['trukkerindia', 'verified-public-careers-jsonld'],
    ['twimbit', 'verified-public-careers-detail-pages'],
    ['unbxd', 'verified-exact-name-brand-surfaces-fail-closed'],
    ['uniqus', 'verified-first-party-email-handoff-surface'],
    ['uolo', 'verified-exact-name-public-company-surface-with-linkedin-handoff'],
    ['urbanpiper', 'verified-browse-all-jobs-handoff-sentinel'],
    ['vakilsearch', 'verified-public-careers-jsonld'],
    ['varthana', 'verified-workline-general-openings-table'],
    ['verygoodsecurityindia', 'verified-non-enumerable-careers-surface'],
    ['vervotech', 'verified-exact-name-public-company-surface'],
    ['wati', 'verified-public-careers-non-listing-surface'],
    ['wealthy', 'zoho-recruit-public-board'],
  ])

  assert.ok(batchProviders.some((provider) => !provider.modulePath.includes('failClosedSentinel')))
  for (const [source, atsPlatform] of specializedProviders) {
    const provider = batchProviders.find((item) => item.source === source)
    assert.ok(provider, `Expected ${source} in the batch extension`)
    assert.match(provider.modulePath, new RegExp(`workbookbatch05/${source}\\.js$`))
    assert.equal(provider.atsPlatform, atsPlatform)
  }
})
