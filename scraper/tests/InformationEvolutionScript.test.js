import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../informationevolution/script.js')

const jobsPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs - Information Evolution Inc.</title>
  </head>
  <body>
    <h1>Join our team!</h1>
    <h2>Jobs</h2>
    <h3>Coimbatore, India</h3>
    <a href="https://dev.informationevolution.com/job/team-leader/">Team Leader</a>
    <h3>Austin, Texas</h3>
    <p>Currently there are no jobs available.</p>
  </body>
</html>
`

const teamLeaderDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Team Leader - Information Evolution Inc.</title>
  </head>
  <body>
    <h1>Team Leader</h1>
    <p>Location: Coimbatore, Tamil Nadu, India</p>
    <p>Type: Full Time</p>
    <div class="job-description">
      <p>Lead, mentor, and guide a team of data processing and scraping specialists.</p>
      <p>Oversee the development and implementation of web scraping and data extraction processes.</p>
    </div>
    <a href="mailto:hr@informationevolution.com">Apply</a>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../informationevolution/catalog.js')
  } catch {
    assert.fail('Expected Information Evolution catalog module at ../informationevolution/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../informationevolution/script.js')
  } catch {
    assert.fail('Expected Information Evolution scraper module at ../informationevolution/script.js')
  }
}

test('Information Evolution local catalog captures the verified first-party jobs page', async () => {
  const { INFORMATION_EVOLUTION_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(INFORMATION_EVOLUTION_CATALOG)

  assert.equal(defaultCatalog, INFORMATION_EVOLUTION_CATALOG)
  assert.equal(provider.source, 'informationevolution')
  assert.equal(provider.companyName, 'Information Evolution')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://dev.informationevolution.com/jobs/')
  assert.equal(provider.companyDomain, 'dev.informationevolution.com')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-jobs-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-jobs-page+coimbatore-section+first-party-detail-pages',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Team Leader/i)
  assert.match(provider.verifiedSurfaceSummary, /Coimbatore/i)
})

test('Information Evolution scraper extracts the current Coimbatore role from the first-party jobs page', async () => {
  const informationEvolution = await loadScriptModule()

  assert.equal(informationEvolution.hasOfficialJobsSignal(jobsPageHtml), true)

  const listings = informationEvolution.extractJobCards(jobsPageHtml)
  assert.deepEqual(listings, [
    {
      title: 'Team Leader',
      detailUrl: 'https://dev.informationevolution.com/job/team-leader/',
      location: 'Coimbatore, India',
    },
  ])

  const detail = informationEvolution.extractJobDetail(teamLeaderDetailHtml, listings[0])
  assert.equal(detail.title, 'Team Leader')
  assert.equal(detail.location, 'Coimbatore, Tamil Nadu, India')
  assert.equal(detail.employmentType, 'Full Time')
  assert.match(detail.jobDescription, /scraping specialists/i)
})

test('Information Evolution run validates the jobs page and returns first-party India roles', async () => {
  const informationEvolution = await loadScriptModule()
  const requestedUrls = []

  const jobs = await informationEvolution.createInformationEvolutionScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === informationEvolution.JOBS_URL) return jobsPageHtml
      if (url === 'https://dev.informationevolution.com/job/team-leader/') return teamLeaderDetailHtml
      throw new Error(`Unexpected Information Evolution URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    informationEvolution.JOBS_URL,
    'https://dev.informationevolution.com/job/team-leader/',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Team Leader')
  assert.equal(jobs[0].company, 'Information Evolution')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].link, 'mailto:hr@informationevolution.com')
})
