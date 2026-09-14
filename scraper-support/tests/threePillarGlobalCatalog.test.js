import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>3Pillar Career Opportunities</title>
  </head>
  <body>
    <h1>3Pillar Career Opportunities</h1>
  </body>
</html>
`

const LEVER_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <meta property="og:title" content="Job openings at 3Pillar" />
  </head>
  <body>
    <h1>Job openings at 3Pillar</h1>
  </body>
</html>
`

const SAMPLE_LEVER_JOBS = [
  {
    id: 'role-1',
    text: 'AI ML Architect',
    hostedUrl: 'https://jobs.lever.co/3pillarglobal/role-1',
    applyUrl: 'https://jobs.lever.co/3pillarglobal/role-1/apply',
    createdAt: 1_784_889_600_000,
    categories: {
      location: 'Noida, India',
      team: 'Engineering',
      commitment: 'Full-time',
    },
    descriptionPlain: 'Lead applied AI programs across delivery teams.',
  },
]

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/3pillarglobal/catalog.js')
  } catch {
    assert.fail('Expected 3Pillar Global catalog module at ../../scraper/3pillarglobal/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/3pillarglobal/script.js')
  } catch {
    assert.fail('Expected 3Pillar Global scraper module at ../../scraper/3pillarglobal/script.js')
  }
}

test('3Pillar Global local catalog captures the first-party careers page plus official Lever contract', async () => {
  const { THREE_PILLAR_GLOBAL_CATALOG } = await loadCatalogModule()
  const threePillar = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(THREE_PILLAR_GLOBAL_CATALOG)

  assert.equal(provider.source, '3pillarglobal')
  assert.equal(provider.companyName, '3Pillar Global')
  assert.equal(provider.companyCareerPage, 'https://www.3pillar.ai/careers/career-opportunities/')
  assert.equal(provider.officialLeverBoardUrl, 'https://jobs.lever.co/3pillarglobal')
  assert.equal(provider.leverApiUrl, 'https://api.lever.co/v0/postings/3pillarglobal?mode=json')
  assert.equal(provider.atsPlatform, 'lever')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(threePillar.PROVIDER_METADATA.source, provider.source)
})

test('3Pillar Global exact backlog row resolves from the local catalog object', async () => {
  const { THREE_PILLAR_GLOBAL_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: '3Pillar Global\n',
    catalog: [hydrateProviderCatalogEntry(THREE_PILLAR_GLOBAL_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('3Pillar Global scraper validates the first-party careers page and maps official Lever jobs into shared job fields', async () => {
  const threePillar = await loadScraperModule()

  assert.equal(threePillar.hasOfficialThreePillarCareersSignal(CAREERS_HTML), true)
  assert.equal(threePillar.hasOfficialThreePillarLeverBoardSignal(LEVER_BOARD_HTML), true)

  const jobs = await threePillar.createThreePillarGlobalScraper({
    now: () => '2026-07-18T00:00:00.000Z',
    maxJobs: 1,
  }).run({
    fetchText: async (url) => {
      if (url === threePillar.CAREERS_URL) return CAREERS_HTML
      if (url === threePillar.LEVER_BOARD_URL) return LEVER_BOARD_HTML
      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchJson: async () => SAMPLE_LEVER_JOBS,
  })

  assert.deepEqual(jobs, [
    {
      title: 'AI ML Architect',
      company: '3Pillar Global',
      department: 'Engineering',
      location: 'Noida, India',
      city: 'Noida',
      country: 'India',
      jobId: 'role-1',
      requisitionId: 'role-1',
      sourceUrl: 'https://jobs.lever.co/3pillarglobal/role-1',
      applyUrl: 'https://jobs.lever.co/3pillarglobal/role-1/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-24T10:40:00.000Z',
      closingDate: null,
      jobDescription: 'Lead applied AI programs across delivery teams.',
      remoteStatus: null,
      source: '3pillarglobal',
      link: 'https://jobs.lever.co/3pillarglobal/role-1/apply',
      scrapedAt: '2026-07-18T00:00:00.000Z',
      companyCareerPage: 'https://www.3pillar.ai/careers/career-opportunities/',
      companyDomain: '3pillar.ai',
      atsPlatform: 'lever',
    },
  ])
})
