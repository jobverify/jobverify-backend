import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/extentiainformationtechnology/script.js')

const sampleHtml = `
  <section>
    <h1>Careers Opportunities</h1>
    <h2><a href="/careers/dotnet-fullstack-developer/">.Net Fullstack Developer</a></h2>
    <ul><li>Pune</li><li>Full Time</li></ul>
    <a href="/careers/dotnet-fullstack-developer/">More Details</a>
    <h2><a href="/careers/senior-salesforce-developer/">Senior Salesforce Developer</a></h2>
    <ul><li>Bengaluru</li><li>Full Time</li></ul>
    <a href="/careers/senior-salesforce-developer/">More Details</a>
    <a href="https://www.extentia.com/careers/careers-opportunities/page/2/">Page 2</a>
  </section>
`

const loadCatalogModule = async () => import('../../scraper/extentiainformationtechnology/catalog.js')
const loadScriptModule = async () => import('../../scraper/extentiainformationtechnology/script.js')

test('Extentia Information Technology local catalog captures the verified first-party role archive', async () => {
  const { EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(defaultCatalog, EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG)
  assert.equal(provider.source, 'extentiainformationtechnology')
  assert.equal(provider.companyName, 'Extentia Information Technology')
  assert.equal(provider.companyCareerPage, 'https://www.extentia.com/careers/careers-opportunities/')
  assert.equal(provider.companyDomain, 'extentia.com')
  assert.equal(provider.atsPlatform, 'official-first-party-job-links')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /\.Net Fullstack Developer/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior Salesforce Developer/i)
  assert.equal(typeof module.run, 'function')
})

test('Extentia Information Technology script extracts first-party role links and pagination', async () => {
  const { extractRoleCards, hasOfficialExtentiaCareersSignal } = await loadScriptModule()
  const jobs = extractRoleCards(sampleHtml)

  assert.equal(hasOfficialExtentiaCareersSignal(sampleHtml), true)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, '.Net Fullstack Developer')
  assert.equal(jobs[0].location, 'Pune')
  assert.equal(jobs[0].employmentType, 'Full Time')
  assert.match(jobs[0].sourceUrl, /dotnet-fullstack-developer/i)
})

test('Extentia Information Technology exact backlog row resolves from the local catalog', async () => {
  const { EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Extentia Information Technology\n',
    catalog: [hydrateProviderCatalogEntry(EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
