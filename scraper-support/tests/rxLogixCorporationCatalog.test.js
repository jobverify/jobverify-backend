import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/rxlogixcorporation/script.js')

const careersHtml = `
  <html>
    <head><title>Careers at RxLogix | Join Our Team</title></head>
    <body>
      <h1>Careers</h1>
      <p>Interested to join our growing team? Browse our current openings:</p>
      <h2>Technical / Enterprise Architect</h2>
      <a href="https://rxlogix.com/careers/technical-architect/">Technical Architect Noida, India</a>
      <h2>TECHNOLOGY</h2>
      <a href="https://rxlogix.com/careers/performance-test-engineer/">Performance Test Engineer Noida, India</a>
      <a href="https://rxlogix.com/careers/data-engineer/">Data Engineer Noida, India</a>
      <h2>Sales & Marketing</h2>
      <a href="https://rxlogix.com/careers/director-marketing/">Director – Marketing Princeton, NJ, US</a>
    </body>
  </html>
`

const detailPages = {
  'https://rxlogix.com/careers/technical-architect/': `
    <html><body>
      <h1>Technical Architect</h1>
      <p>Location: Noida, India</p>
      <p>Department: Technical / Enterprise Architect</p>
      <p>Experience: 10+ years</p>
      <p>General Purpose: Lead architecture for pharmacovigilance systems.</p>
    </body></html>
  `,
  'https://rxlogix.com/careers/performance-test-engineer/': `
    <html><body>
      <h1>Performance Test Engineer</h1>
      <p>Location: Noida, India</p>
      <p>Department: Technology</p>
      <p>Experience: 4+ years</p>
      <p>Role Overview: Ensure performance and scalability.</p>
    </body></html>
  `,
  'https://rxlogix.com/careers/data-engineer/': `
    <html><body>
      <h1>Data Engineer</h1>
      <p>Location: Noida, India</p>
      <p>Department: Technology</p>
      <p>Experience: 2-5 years</p>
      <p>Job Summary: Build and maintain data pipelines.</p>
    </body></html>
  `,
}

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/rxlogixcorporation/catalog.js')
  } catch {
    assert.fail('Expected RxLogix Corporation catalog module at ../../scraper/rxlogixcorporation/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/rxlogixcorporation/script.js')
  } catch {
    assert.fail('Expected RxLogix Corporation scraper module at ../../scraper/rxlogixcorporation/script.js')
  }
}

test('RxLogix Corporation catalog captures the official careers page with current India openings', async () => {
  const { RX_LOGIX_CORPORATION_CATALOG, default: defaultCatalog } = await loadCatalogModule()

  assert.equal(defaultCatalog, RX_LOGIX_CORPORATION_CATALOG)
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.source, 'rxlogixcorporation')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.companyName, 'RxLogix Corporation')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.adapter, 'script')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.companyCareerPage, 'https://rxlogix.com/careers/')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.companyDomain, 'rxlogix.com')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.atsPlatform, 'official-company-careers')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.countryFilter, 'India')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.verifiedOn, '2026-07-18')
  assert.equal(RX_LOGIX_CORPORATION_CATALOG.modulePath, modulePath)
  assert.match(RX_LOGIX_CORPORATION_CATALOG.verifiedSurfaceSummary, /Technical Architect/i)
  assert.match(RX_LOGIX_CORPORATION_CATALOG.verifiedSurfaceSummary, /Performance Test Engineer/i)
})

test('RxLogix Corporation scraper keeps only India openings from the official careers page and linked detail pages', async () => {
  const rxLogix = await loadScriptModule()

  assert.equal(rxLogix.hasOfficialRxLogixCareersSignal(careersHtml), true)

  const listings = rxLogix.extractCareerListings(careersHtml)
  assert.equal(listings.length, 3)
  assert.deepEqual(
    listings.map((listing) => [listing.title, listing.location, listing.department]),
    [
      ['Technical Architect', 'Noida, India', 'Technical / Enterprise Architect'],
      ['Performance Test Engineer', 'Noida, India', 'TECHNOLOGY'],
      ['Data Engineer', 'Noida, India', 'TECHNOLOGY'],
    ],
  )

  const jobs = await rxLogix.createRxLogixCorporationScraper().run({
    fetchPage: async (url) => {
      if (url === 'https://rxlogix.com/careers/') {
        return { status: 200, url, html: careersHtml }
      }

      return { status: 200, url, html: detailPages[url] }
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.experienceRequired]),
    [
      ['Technical Architect', 'Noida, India', '10+ years'],
      ['Performance Test Engineer', 'Noida, India', '4+ years'],
      ['Data Engineer', 'Noida, India', '2-5 years'],
    ],
  )
})
