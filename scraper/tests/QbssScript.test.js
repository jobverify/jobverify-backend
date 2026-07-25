import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../qbss/script.js')

const blockedHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Attention Required! | Cloudflare</title>
  </head>
  <body>
    <h1>Sorry, you have been blocked</h1>
    <p>Please enable cookies.</p>
    <p>You are unable to access wpenginepowered.com.</p>
    <p>Cloudflare Ray ID: a1cfcc853c6c7f17</p>
  </body>
</html>
`

const publicCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Opportunities - QBSS</title>
  </head>
  <body>
    <h1>Career Opportunities</h1>
    <a href="/careers/assistant-vice-president-managed-infrastructure-services/">Assistant Vice President</a>
    <a href="/careers/it-engineer/">IT Engineer</a>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../qbss/catalog.js')
  } catch {
    assert.fail('Expected Qbss catalog module at ../qbss/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../qbss/script.js')
  } catch {
    assert.fail('Expected Qbss scraper module at ../qbss/script.js')
  }
}

test('Qbss local catalog captures the verified fail-closed first-party careers block', async () => {
  const { QBSS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(QBSS_CATALOG)

  assert.equal(defaultCatalog, QBSS_CATALOG)
  assert.equal(provider.source, 'qbss')
  assert.equal(provider.companyName, 'Qbss')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.quatrrobss.com/careers/')
  assert.equal(provider.companyDomain, 'quatrrobss.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-cloudflare-blocked')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-first-party-careers-routes-cloudflare-block-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-qbss-careers-route+verified-working-at-route+cloudflare-block-page-return-empty',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare/i)
  assert.match(provider.verifiedSurfaceSummary, /ContinuServe/i)
})

test('Qbss scraper returns [] while the verified first-party careers routes remain Cloudflare-blocked', async () => {
  const qbss = await loadScriptModule()
  const requestedUrls = []

  assert.equal(qbss.hasBlockedFirstPartySignal(blockedHtml), true)
  assert.equal(qbss.hasBlockedFirstPartySignal(publicCareersHtml), false)
  assert.equal(qbss.hasPublicJobSignals(blockedHtml), false)
  assert.equal(qbss.hasPublicJobSignals(publicCareersHtml), true)

  const jobs = await qbss.createQbssScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return { status: 403, url, html: blockedHtml }
    },
  })

  assert.deepEqual(requestedUrls, [
    qbss.CAREERS_URL,
    qbss.WORKING_AT_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Qbss scraper fails closed when the legacy first-party careers routes become publicly enumerable', async () => {
  const qbss = await loadScriptModule()

  await assert.rejects(
    qbss.createQbssScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: qbss.CAREERS_URL,
        html: publicCareersHtml,
      }),
    }),
    /publicly enumerable|needs a structured scraper/i,
  )
})
