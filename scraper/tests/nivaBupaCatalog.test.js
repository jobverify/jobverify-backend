import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const loadCatalogModule = async () => {
  try {
    return await import('../nivabupa/catalog.js')
  } catch {
    assert.fail('Expected Niva Bupa catalog module at ../nivabupa/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../nivabupa/script.js')
  } catch {
    assert.fail('Expected Niva Bupa script module at ../nivabupa/script.js')
  }
}

test('Niva Bupa exact CSV row resolves to the verified Darwinbox provider', async () => {
  const { NIVABUPA_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = getScraperCatalog().find((item) => item.source === 'nivabupa')

  assert.equal(defaultCatalog, NIVABUPA_CATALOG)
  assert.ok(provider)
  assert.equal(provider.companyName, 'Niva Bupa')
  assert.equal(provider.officialBrandName, 'Niva Bupa Health Insurance Company Limited')
  assert.equal(provider.companyCareerPage, 'https://transactions.nivabupa.com/Pages/career.aspx')
  assert.equal(provider.officialCareersHandoffUrl, 'https://disha.darwinbox.in/ms/candidate/careers')
  assert.equal(provider.darwinboxOrigin, 'https://disha.darwinbox.in')
  assert.equal(provider.darwinboxCompanyId, 'main')
  assert.equal(provider.publicAllJobsUrl, 'https://disha.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(provider.atsPlatform, 'darwinbox')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /nivabupa[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /nivabupa[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /disha\.darwinbox\.in/i)
  assert.match(provider.verifiedSurfaceSummary, /Message From Our CEO/i)

  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nNiva Bupa\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0].source, 'nivabupa')
})

test('Niva Bupa scraper stays runnable through the shared provider catalog', async () => {
  const scraper = buildScrapers().find((item) => item.name === 'nivabupa')
  const nivabupa = await loadScriptModule()

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'nivabupa')
  assert.equal(nivabupa.PUBLIC_ALL_JOBS_URL, 'https://disha.darwinbox.in/ms/candidatev2/main/careers/allJobs')
})

test('Niva Bupa official careers page stays pinned to the verified Darwinbox handoff', async () => {
  const nivabupa = await loadScriptModule()

  const careersHtml = `
    <html>
      <head>
        <title>Niva Bupa Careers</title>
        <meta name="description" content="Careers with Niva Bupa" />
        <meta name="keywords" content="Niva Bupa Careers,Niva Bupa Job,Niva Bupa Job Openings" />
      </head>
      <body>
        <h1>Careers with Niva Bupa</h1>
        <section>Message From Our CEO</section>
        <section>Employee Recognition</section>
        <script>
          var redirecturl = "https://disha.darwinbox.in/ms/candidate/careers";
          var fallback = "https://nivabupa.talentrecruit.com/career-page";
        </script>
      </body>
    </html>
  `

  assert.equal(
    nivabupa.hasOfficialNivaBupaCareersSignals(careersHtml),
    true,
  )
  assert.equal(
    nivabupa.extractOfficialDarwinboxUrl(careersHtml),
    'https://disha.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    nivabupa.extractLegacyTalentRecruitUrl(careersHtml),
    'https://nivabupa.talentrecruit.com/career-page',
  )
})
