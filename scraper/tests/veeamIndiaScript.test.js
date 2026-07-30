import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures', 'veeamindia')

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const loadVeeamIndiaModule = async () => {
  try {
    return await import('../veeamindia/script.js')
  } catch {
    assert.fail('Expected Veeam India scraper module at ../veeamindia/script.js')
  }
}

test('Veeam India is registered against the verified first-party India careers surface without alias churn', async () => {
  const veeamIndia = await loadVeeamIndiaModule()
  const provider = getScraperCatalog().find((item) => item.source === 'veeamindia')

  assert.ok(provider, 'Expected Veeam India provider to be registered in customProviders.json')
  assert.equal(provider.companyName, 'Veeam India')
  assert.equal(provider.officialBrandName, 'Veeam')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.veeam.com/india')
  assert.equal(provider.officialSearchPageUrl, 'https://careers.veeam.com/location/india-jobs/22681/1269750/2')
  assert.equal(provider.companyDomain, 'careers.veeam.com')
  assert.equal(provider.atsPlatform, 'phenom-first-party-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-india-location-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-india-location-page+first-party-job-detail-pages+external-apply-handoff',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.veeam\.com\/india/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/careers\.veeam\.com\/location\/india-jobs\/22681\/1269750\/2/i)
  assert.match(provider.verifiedSurfaceSummary, /Software Engineer III - Frontend/i)
  assert.match(provider.verifiedSurfaceSummary, /job-boards\.eu\.greenhouse\.io/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Veeam India'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Veeam'), false)

  assert.equal(veeamIndia.SOURCE, 'veeamindia')
  assert.equal(veeamIndia.COMPANY, 'Veeam India')
  assert.equal(veeamIndia.OFFICIAL_BRAND_NAME, 'Veeam')
  assert.equal(veeamIndia.INDIA_CAREERS_URL, 'https://careers.veeam.com/india')
  assert.equal(veeamIndia.INDIA_JOBS_URL, 'https://careers.veeam.com/location/india-jobs/22681/1269750/2')
})

test('Veeam India scraper parses the first-party India location page and detail page into jobs', async () => {
  const veeamIndia = await loadVeeamIndiaModule()
  const listingHtml = readFixture('india-jobs.html')
  const detailHtml = readFixture('detail-software-engineer-frontend.html')

  assert.equal(
    veeamIndia.buildIndiaJobsUrl(),
    'https://careers.veeam.com/location/india-jobs/22681/1269750/2',
  )

  const listings = veeamIndia.extractJobCards(listingHtml)
  assert.deepEqual(listings, [{
    title: 'Software Engineer III - Frontend',
    location: 'Hyderabad, Telangana',
    city: 'Hyderabad',
    sourceUrl: 'https://careers.veeam.com/job/hyderabad/software-engineer-iii-frontend/22681/95712716624',
    jobId: '95712716624',
    postingDate: '2026-07-14',
  }])

  assert.deepEqual(veeamIndia.extractJobDetail(detailHtml, listings[0]), {
    title: 'Software Engineer III - Frontend',
    location: 'Hyderabad, Telangana',
    city: 'Hyderabad',
    sourceUrl: 'https://careers.veeam.com/job/hyderabad/software-engineer-iii-frontend/22681/95712716624',
    jobId: '95712716624',
    jobDescription: 'You will be working as part of a distributed agile team building a new SaaS platform.',
    employmentType: 'Permanent',
    department: 'Tech',
    team: 'Securiti AI',
    workLocation: 'Hybrid',
    postingDate: '2026-07-14',
    applyUrl: 'https://job-boards.eu.greenhouse.io/veeamsoftware/jobs/95712716624',
    requiredSkills: ['ReactJS', 'JavaScript', 'Docker', 'REST'],
  })

  const requestedUrls = []
  const jobs = await veeamIndia.createVeeamIndiaScraper().run({
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === veeamIndia.buildIndiaJobsUrl()) return listingHtml
      if (url === listings[0].sourceUrl) return detailHtml
      throw new Error(`Unexpected Veeam India URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    veeamIndia.buildIndiaJobsUrl(),
    listings[0].sourceUrl,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Veeam India')
  assert.equal(jobs[0].source, 'veeamindia')
  assert.equal(jobs[0].title, 'Software Engineer III - Frontend')
  assert.equal(jobs[0].city, 'Hyderabad')
  assert.equal(jobs[0].employmentType, 'Permanent')
  assert.equal(jobs[0].department, 'Tech')
  assert.equal(jobs[0].applyUrl, 'https://job-boards.eu.greenhouse.io/veeamsoftware/jobs/95712716624')
  assert.equal(jobs[0].link, 'https://job-boards.eu.greenhouse.io/veeamsoftware/jobs/95712716624')
})

test('Veeam India exact backlog row matches directly and stays runnable through the shared script registry', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'Veeam India\n',
    catalog: getScraperCatalog(),
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Veeam India', 'veeamindia', 'Veeam India']],
  )

  const scraper = buildScrapers().find((item) => item.name === 'veeamindia')

  assert.ok(scraper, 'Expected buildScrapers() to return the Veeam India scraper')
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'veeamindia')
  assert.equal(scraper.provider.adapter, 'script')
  assert.match(scraper.dryRunFile, /veeamindia[\\/]jobs\.json$/i)
})
