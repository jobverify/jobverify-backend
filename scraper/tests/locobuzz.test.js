import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../locobuzz/script.js')

const loadCatalog = async () => {
  try {
    return await import('../locobuzz/catalog.js')
  } catch {
    assert.fail('Expected Locobuzz catalog module at ../locobuzz/catalog.js')
  }
}

const loadScript = async () => {
  try {
    return await import('../locobuzz/script.js')
  } catch {
    assert.fail('Expected Locobuzz scraper module at ../locobuzz/script.js')
  }
}

const careersHtml = `
<!doctype html>
<html>
  <head>
    <title>Careers at Locobuzz | Join Our CX AI Team | Locobuzz</title>
  </head>
  <body>
    <h1>Open Positions</h1>
    <p>Send your profile to <a href="mailto:careers@locobuzz.com">careers@locobuzz.com</a></p>
    <section class="job-card">
      <h3>SDR</h3>
      <p>Mumbai / Delhi / Bangalore</p>
      <p>2+ Years</p>
    </section>
    <section class="job-card">
      <h3>Senior Python Developer</h3>
      <p>Mumbai</p>
      <p>3+ Years</p>
    </section>
    <section class="job-card">
      <h3>Regional Partnerships Lead</h3>
      <p>Singapore</p>
      <p>6+ Years</p>
    </section>
  </body>
</html>
`

test('Locobuzz local catalog captures the inline first-party openings surface and mailto application handoff', async () => {
  const { LOCOBUZZ_CATALOG, default: defaultCatalog } = await loadCatalog()
  const provider = hydrateProviderCatalogEntry(LOCOBUZZ_CATALOG)
  const report = generateCompanyCoverageReport({
    csvText: 'Locobuzz\n',
    catalog: [provider],
  })

  assert.equal(defaultCatalog, LOCOBUZZ_CATALOG)
  assert.equal(provider.source, 'locobuzz')
  assert.equal(provider.companyName, 'Locobuzz')
  assert.equal(provider.officialBrandName, 'Locobuzz')
  assert.equal(provider.companyCareerPage, 'https://locobuzz.com/careers')
  assert.equal(provider.companyDomain, 'locobuzz.com')
  assert.equal(provider.atsPlatform, 'first-party-inline-careers-accordions')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+inline-open-positions+mailto-apply',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.verifiedPublicJobCount, 13)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /locobuzz[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /SDR/i)
  assert.match(provider.verifiedSurfaceSummary, /careers@locobuzz\.com/i)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Locobuzz extracts inline openings and keeps India roles only', async () => {
  const locobuzz = await loadScript()

  assert.equal(locobuzz.CAREERS_URL, 'https://locobuzz.com/careers')
  assert.equal(locobuzz.APPLICATION_URL, 'mailto:careers@locobuzz.com')
  assert.equal(locobuzz.hasOfficialCareersSignal(careersHtml), true)

  const jobs = locobuzz.extractOpenings(careersHtml)
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'SDR',
    company: 'Locobuzz',
    department: null,
    location: 'Mumbai / Delhi / Bangalore, India',
    city: 'Mumbai',
    country: 'India',
    jobId: 'sdr',
    requisitionId: 'sdr',
    sourceUrl: 'https://locobuzz.com/careers',
    applyUrl: 'mailto:careers@locobuzz.com',
    employmentType: null,
    experienceRequired: '2+ Years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  })
})

test('Locobuzz run decorates inline openings and fails closed when the first-party surface drifts', async () => {
  const locobuzz = await loadScript()

  const jobs = await locobuzz.createLocobuzzScraper().run({
    fetchText: async (url) => {
      assert.equal(url, locobuzz.CAREERS_URL)
      return careersHtml
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'locobuzz')
  assert.equal(jobs[0].link, 'mailto:careers@locobuzz.com')
  assert.equal(jobs[0].scrapedAt, '2026-07-18T00:00:00.000Z')

  await assert.rejects(
    locobuzz.createLocobuzzScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /Locobuzz careers page/i,
  )
})
