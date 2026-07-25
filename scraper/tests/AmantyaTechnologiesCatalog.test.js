import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../amantyatechnologies/script.js')

const sampleHtml = `
  <section>
    <title>Careers | Amantya Technologies</title>
    <h2>Join Our Team</h2>
    <h5>Sr SW QA Automation Engineer</h5>
    <p>Experience: 4-8 Years</p>
    <p>Location: Gurgaon</p>
    <p>Job Type: Full Time</p>
    <ul><li>Selenium</li><li>Java</li></ul>
    <h5>TAC Engineer</h5>
    <p>Experience: 2-4 Years</p>
    <p>Location: Gurgaon</p>
    <p>Job Type: Full Time</p>
    <ul><li>LTE</li></ul>
    <a href="/apply">Apply Now</a>
  </section>
`

const loadCatalogModule = async () => import('../amantyatechnologies/catalog.js')
const loadScriptModule = async () => import('../amantyatechnologies/script.js')

test('Amantya Technologies local catalog captures the verified first-party careers surface', async () => {
  const { AMANTYA_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(AMANTYA_TECHNOLOGIES_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(defaultCatalog, AMANTYA_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'amantyatechnologies')
  assert.equal(provider.companyName, 'Amantya Technologies')
  assert.equal(provider.companyCareerPage, 'https://www.amantyatech.com/careers')
  assert.equal(provider.companyDomain, 'amantyatech.com')
  assert.equal(provider.atsPlatform, 'official-first-party-job-panels')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Sr SW QA Automation Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /Open Ran Developer/i)
  assert.equal(typeof module.run, 'function')
})

test('Amantya Technologies script extracts inline first-party job panels', async () => {
  const { extractJobPanels, hasOfficialAmantyaCareersSignal } = await loadScriptModule()
  const jobs = extractJobPanels(sampleHtml)

  assert.equal(hasOfficialAmantyaCareersSignal(sampleHtml), true)
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Sr SW QA Automation Engineer')
  assert.equal(jobs[0].employmentType, 'Full Time')
  assert.deepEqual(jobs[0].requiredSkills, ['Selenium', 'Java'])
  assert.equal(jobs[1].title, 'TAC Engineer')
})

test('Amantya Technologies exact backlog row resolves from the local catalog', async () => {
  const { AMANTYA_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Amantya Technologies\n',
    catalog: [hydrateProviderCatalogEntry(AMANTYA_TECHNOLOGIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})
