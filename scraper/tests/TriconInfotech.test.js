import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../triconinfotech/script.js')

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career Opportunities | Tricon Infotech</title>
  </head>
  <body class="listing-page-awsm_job_openings">
    <section>
      <h1>Career Opportunities | Tricon Infotech</h1>
      <script>var awsmJobsPublic = {"job_id":"0"};</script>
      <div class="awsm-b-job-listings"></div>
    </section>
  </body>
</html>
`

const emptyFeed = []

const loadCatalogModule = async () => {
  try {
    return await import('../triconinfotech/catalog.js')
  } catch {
    assert.fail('Expected Tricon Infotech catalog module at ../triconinfotech/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../triconinfotech/script.js')
  } catch {
    assert.fail('Expected Tricon Infotech scraper module at ../triconinfotech/script.js')
  }
}

test('Tricon Infotech local catalog records the verified empty-shell AWSM state', async () => {
  const { TRICON_INFOTECH_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(TRICON_INFOTECH_CATALOG)

  assert.equal(defaultCatalog, TRICON_INFOTECH_CATALOG)
  assert.equal(provider.source, 'triconinfotech')
  assert.equal(provider.companyName, 'Tricon Infotech')
  assert.equal(provider.officialBrandName, 'Tricon Infotech')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.triconinfotech.com/tricon-careers/')
  assert.equal(provider.companyDomain, 'triconinfotech.com')
  assert.equal(provider.atsPlatform, 'awsm-jobs-empty-shell')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'careers-page-plus-empty-awsm-feed-validation')
  assert.equal(provider.extractionStrategy, 'verified-awsm-shell+empty-first-party-feed-return-empty')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /awsm/i)
  assert.match(provider.verifiedSurfaceSummary, /empty/i)
})

test('Tricon Infotech exact backlog row resolves from the local catalog', async () => {
  const { TRICON_INFOTECH_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Tricon Infotech\n',
    catalog: [hydrateProviderCatalogEntry(TRICON_INFOTECH_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Tricon Infotech sentinel returns [] while the first-party AWSM shell stays empty', async () => {
  const tricon = await loadScriptModule()
  const jobs = await tricon.run({
    fetchText: async (url) => {
      assert.equal(url, tricon.CAREERS_URL)
      return careersHtml
    },
    fetchJson: async (url) => {
      assert.equal(url, tricon.JOBS_API_URL)
      return emptyFeed
    },
  })

  assert.deepEqual(jobs, [])
})

test('Tricon Infotech sentinel fails closed if first-party AWSM jobs start rendering', async () => {
  const tricon = await loadScriptModule()

  await assert.rejects(
    tricon.run({
      fetchText: async () => `
        <html><body class="listing-page-awsm_job_openings">
          <div class="awsm-b-job-listings">
            <h2 class="awsm-b-job-post-title"><a href="https://www.triconinfotech.com/jobs/data-engineer/">Data Engineer</a></h2>
          </div>
        </body></html>
      `,
      fetchJson: async () => emptyFeed,
    }),
    /public jobs surface/i,
  )
})
