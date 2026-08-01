import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/ravetechnologies/script.js')

const JS_REQUIRED_HTML = `
<!doctype html>
<html lang="en">
  <body>
    Javascript is required. Please enable javascript before you are allowed to see this page.
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Open Positions</h1>
    <a href="https://www.necsws.com/careers/software-engineer">Apply now</a>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/ravetechnologies/catalog.js')
  } catch {
    assert.fail('Expected Rave Technologies catalog module at ../../scraper/ravetechnologies/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/ravetechnologies/script.js')
  } catch {
    assert.fail('Expected Rave Technologies scraper module at ../../scraper/ravetechnologies/script.js')
  }
}

const buildProvider = (catalogEntry) => hydrateProviderCatalogEntry({
  ...catalogEntry,
  modulePath,
})

test('Rave Technologies local catalog captures the verified brand-transition and JS-gated successor careers state', async () => {
  const { RAVE_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const rave = await loadScriptModule()
  const provider = buildProvider(RAVE_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, RAVE_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'ravetechnologies')
  assert.equal(provider.companyName, 'Rave Technologies')
  assert.equal(provider.officialBrandName, 'Rave Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.rave-tech.com/')
  assert.equal(provider.companyCareerPage, 'https://www.necsws.com/careers')
  assert.equal(provider.successorHomepageUrl, 'https://www.necsws.com/india')
  assert.equal(
    provider.transitionEvidenceUrl,
    'https://www.nec.com/en/press/202107/global_20210701_03.html',
  )
  assert.equal(provider.atsPlatform, 'successor-careers-js-challenge')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'legacy-brand-transition-plus-js-required-successor-pages',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-nec-brand-transition+verified-js-required-successor-pages+fail-closed-sentinel',
  )
  assert.equal(provider.companyDomain, 'necsws.com')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Rave Technologies \(India\) Pvt Limited/i)
  assert.match(provider.verifiedSurfaceSummary, /Javascript is required/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /ravetechnologies[\\/]jobs\.json$/i)

  assert.equal(rave.CAREERS_URL, provider.companyCareerPage)
  assert.equal(rave.TRANSITION_EVIDENCE_URL, provider.transitionEvidenceUrl)
})

test('Rave Technologies exact backlog row resolves from the local fail-closed catalog', async () => {
  const { RAVE_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Rave Technologies\n',
    catalog: [buildProvider(RAVE_TECHNOLOGIES_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Rave Technologies sentinel returns [] only while the successor pages remain JS-required shells', async () => {
  const rave = await loadScriptModule()
  const requestedUrls = []

  const jobs = await rave.createRaveTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === rave.SUCCESSOR_HOMEPAGE_URL || url === rave.CAREERS_URL) {
        return JS_REQUIRED_HTML
      }

      throw new Error(`Unexpected Rave Technologies URL: ${url}`)
    },
  })

  assert.equal(rave.hasJsRequiredChallengeSignal(JS_REQUIRED_HTML), true)
  assert.equal(rave.hasPublicJobsSignal(JS_REQUIRED_HTML), false)
  assert.deepEqual(requestedUrls, [
    rave.SUCCESSOR_HOMEPAGE_URL,
    rave.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Rave Technologies sentinel fails closed when the successor pages start exposing public jobs', async () => {
  const rave = await loadScriptModule()

  await assert.rejects(
    rave.createRaveTechnologiesScraper().run({
      fetchText: async (url) => (url === rave.SUCCESSOR_HOMEPAGE_URL ? JS_REQUIRED_HTML : PUBLIC_JOBS_HTML),
    }),
    /successor careers surface now appears to expose public jobs/i,
  )
})
