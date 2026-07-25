import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join Codewave: React, Python, Flutter Jobs | Remote & Bengaluru</title>
  </head>
  <body>
    <h1>Codewave Careers</h1>
    <h2>Open Positions.</h2>
    <section class="opening">
      <h3>Infra Builder: Senior DevOps & Cloud</h3>
      <p>Bangalore</p>
      <a href="https://codewave.com/careers/infra-builder-senior-devops-cloud/">Find out more</a>
    </section>
    <section class="opening">
      <h3>Infra Builder: DevOps & Cloud</h3>
      <p>Bangalore</p>
      <a href="https://codewave.com/careers/infra-builder-devops-cloud/">Find out more</a>
    </section>
    <section class="opening">
      <h3>AI Builder: Models & Agents</h3>
      <p>Bangalore</p>
      <a href="https://codewave.com/careers/ai-builder-models-agents/">Find out more</a>
    </section>
  </body>
</html>
`

const seniorDevopsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Infra Builder: Senior DevOps & Cloud - Codewave</title>
  </head>
  <body>
    <h1>Infra Builder: Senior DevOps & Cloud</h1>
    <p>Full-time</p>
    <p>Bangalore</p>
    <a href="mailto:jobs@codewave.com">Apply for this job</a>
  </body>
</html>
`

const devopsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Infra Builder: DevOps & Cloud - Codewave</title>
  </head>
  <body>
    <h1>Infra Builder: DevOps & Cloud</h1>
    <p>Full-time</p>
    <p>Bangalore</p>
    <a href="mailto:jobs@codewave.com">Apply for this job</a>
  </body>
</html>
`

const aiBuilderHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>AI Builder: Models & Agents - Codewave</title>
  </head>
  <body>
    <h1>AI Builder: Models & Agents</h1>
    <p>Full-time</p>
    <p>Bangalore</p>
    <a href="mailto:jobs@codewave.com">Apply for this job</a>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../codewavetechnologies/catalog.js')
  } catch {
    assert.fail('Expected Codewave Technologies catalog module at ../codewavetechnologies/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../codewavetechnologies/script.js')
  } catch {
    assert.fail('Expected Codewave Technologies scraper module at ../codewavetechnologies/script.js')
  }
}

test('Codewave Technologies local catalog captures the verified first-party careers contract', async () => {
  const { CODEWAVE_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(CODEWAVE_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, CODEWAVE_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'codewavetechnologies')
  assert.equal(provider.companyName, 'Codewave Technologies')
  assert.equal(provider.officialBrandName, 'Codewave')
  assert.equal(provider.companyCareerPage, 'https://codewave.com/careers/')
  assert.equal(provider.companyDomain, 'codewave.com')
  assert.equal(provider.atsPlatform, 'first-party-html-job-pages')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-listing-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+detail-page-validation+mailto-apply-handoff',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Infra Builder: Senior DevOps & Cloud/i)
  assert.match(provider.verifiedSurfaceSummary, /AI Builder: Models & Agents/i)
})

test('Codewave Technologies helpers stay pinned to the verified careers page and detail pages', async () => {
  const codewave = await loadScriptModule()

  assert.equal(codewave.SOURCE, 'codewavetechnologies')
  assert.equal(codewave.COMPANY, 'Codewave Technologies')
  assert.equal(codewave.CAREERS_URL, 'https://codewave.com/careers/')
  assert.equal(codewave.VERIFIED_ON, '2026-07-18')
  assert.equal(codewave.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(codewave.extractOpeningCards(careersHtml), [
    {
      title: 'Infra Builder: Senior DevOps & Cloud',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/infra-builder-senior-devops-cloud/',
    },
    {
      title: 'Infra Builder: DevOps & Cloud',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/infra-builder-devops-cloud/',
    },
    {
      title: 'AI Builder: Models & Agents',
      location: 'Bangalore',
      detailUrl: 'https://codewave.com/careers/ai-builder-models-agents/',
    },
  ])
  assert.deepEqual(codewave.extractDetailSignals(seniorDevopsHtml), {
    employmentType: 'Full-time',
    location: 'Bangalore',
    applyUrl: 'mailto:jobs@codewave.com',
  })
})

test('Codewave Technologies run validates the first-party careers page and returns job listings', async () => {
  const codewave = await loadScriptModule()
  const requestedUrls = []
  const jobs = await codewave.createCodewaveTechnologiesScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === codewave.CAREERS_URL) return careersHtml
      if (url === 'https://codewave.com/careers/infra-builder-senior-devops-cloud/') return seniorDevopsHtml
      if (url === 'https://codewave.com/careers/infra-builder-devops-cloud/') return devopsHtml
      if (url === 'https://codewave.com/careers/ai-builder-models-agents/') return aiBuilderHtml
      throw new Error(`Unexpected Codewave URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    codewave.CAREERS_URL,
    'https://codewave.com/careers/infra-builder-senior-devops-cloud/',
    'https://codewave.com/careers/infra-builder-devops-cloud/',
    'https://codewave.com/careers/ai-builder-models-agents/',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].location, 'Bangalore, India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].source, 'codewavetechnologies')
  assert.equal(jobs[0].applyUrl, 'mailto:jobs@codewave.com')
})

test('Codewave Technologies fails closed when the verified careers shell changes materially', async () => {
  const codewave = await loadScriptModule()

  await assert.rejects(
    codewave.createCodewaveTechnologiesScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified Codewave careers page/i,
  )
})
