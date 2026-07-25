import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../bebotechnologies/script.js')

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Build Your Career in Software Testing and QA With bebo</title>
  </head>
  <body>
    <h1>Careers</h1>
    <p>Our Chandigarh, India team does great work and enjoys doing it.</p>
    <section>
      <h2>Development</h2>
      <div class="job-card">
        <h5>Associate Software Architect Level 1 Agentic AI</h5>
        <p>7 - 12 Years</p>
        <p>Own the end-to-end architecture of agentic AI systems.</p>
        <a href="https://bebotechnologiesin.mobile-recruit.com/m/H6SmAVV?source=17sIk3VV">Apply Now</a>
      </div>
      <div class="job-card">
        <h5>Software Engineer Java+Reactjs</h5>
        <p>2 - 5 Years</p>
        <p>Develop and maintain backend services using Java and Spring Boot.</p>
        <a href="https://bebotechnologiesin.mobile-recruit.com/m/i8wstVVV?source=i8zsZVVV">Apply Now</a>
      </div>
    </section>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../bebotechnologies/catalog.js')
  } catch {
    assert.fail('Expected bebo Technologies catalog module at ../bebotechnologies/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../bebotechnologies/script.js')
  } catch {
    assert.fail('Expected bebo Technologies scraper module at ../bebotechnologies/script.js')
  }
}

test('bebo Technologies local catalog captures the verified first-party careers page', async () => {
  const { BEBO_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(BEBO_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, BEBO_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'bebotechnologies')
  assert.equal(provider.companyName, 'bebo Technologies')
  assert.equal(provider.officialBrandName, 'bebo Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.bebotechnologies.com/')
  assert.equal(provider.companyCareerPage, 'https://www.bebotechnologies.com/careers')
  assert.equal(provider.companyDomain, 'bebotechnologies.com')
  assert.equal(provider.atsPlatform, 'official-first-party-role-cards')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(provider.extractionStrategy, 'verified-first-party-job-blocks+mobile-recruit-apply-links')
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Associate Software Architect Level 1 Agentic AI/i)
  assert.match(provider.verifiedSurfaceSummary, /Software Engineer Java\+Reactjs/i)
})

test('bebo Technologies exact backlog row resolves from the local catalog', async () => {
  const { BEBO_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'bebo Technologies\n',
    catalog: [hydrateProviderCatalogEntry(BEBO_TECHNOLOGIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('bebo Technologies scraper extracts first-party job blocks with mobile-recruit apply links', async () => {
  const bebo = await loadScriptModule()
  const jobs = await bebo.run({
    fetchText: async (url) => {
      assert.equal(url, bebo.CAREERS_URL)
      return careersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map(({ title, location, country, sourceUrl, applyUrl, experienceRequired }) => ({
      title,
      location,
      country,
      sourceUrl,
      applyUrl,
      experienceRequired,
    })),
    [
      {
        title: 'Associate Software Architect Level 1 Agentic AI',
        location: 'Chandigarh, India',
        country: 'India',
        sourceUrl: 'https://bebotechnologiesin.mobile-recruit.com/m/H6SmAVV?source=17sIk3VV',
        applyUrl: 'https://bebotechnologiesin.mobile-recruit.com/m/H6SmAVV?source=17sIk3VV',
        experienceRequired: '7 - 12 Years',
      },
      {
        title: 'Software Engineer Java+Reactjs',
        location: 'Chandigarh, India',
        country: 'India',
        sourceUrl: 'https://bebotechnologiesin.mobile-recruit.com/m/i8wstVVV?source=i8zsZVVV',
        applyUrl: 'https://bebotechnologiesin.mobile-recruit.com/m/i8wstVVV?source=i8zsZVVV',
        experienceRequired: '2 - 5 Years',
      },
    ],
  )
  assert.equal(jobs[0].source, 'bebotechnologies')
  assert.equal(jobs[0].link, 'https://bebotechnologiesin.mobile-recruit.com/m/H6SmAVV?source=17sIk3VV')
})

test('bebo Technologies scraper fails closed when the verified careers signal disappears', async () => {
  const bebo = await loadScriptModule()

  await assert.rejects(
    bebo.run({
      fetchText: async () => '<html><head><title>bebo</title></head><body>No job cards here</body></html>',
    }),
    /verified first-party careers surface/i,
  )
})
