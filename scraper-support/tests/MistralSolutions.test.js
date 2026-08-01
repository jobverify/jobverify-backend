import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/mistralsolutions/script.js')

const careersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers Job Listings - Mistral Solutions</title>
  </head>
  <body>
    <h1>Careers</h1>
    <h2>Explore Our Career Opportunities</h2>
    <table class="career-table">
      <thead>
        <tr>
          <th>Job ID</th>
          <th>Position</th>
          <th>Experience</th>
          <th>Location</th>
          <th>Required Skills</th>
          <th>Job Description</th>
          <th>Apply</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>JID-021</td>
          <td>Test Engineer - Senior Engineer</td>
          <td>3 to 7 Years</td>
          <td>Bangalore</td>
          <td>Expertise in electronics testing, embedded systems, troubleshooting, and oscilloscopes.</td>
          <td>
            <a
              href="https://mistralsolutions.com/wp-content/uploads/2026/07/18.Test-Engineer-Senior-Engineer.docx"
              class="job-description-btn"
              target="_blank">View Details</a>
          </td>
          <td>
            <a
              href="#"
              class="apply-btn career-popup-btn"
              data-form="https://form.jotform.com/261900894262460?positionApplyingFor=Test%20Engineer%20-%20Senior%20Engineer%20">
              Apply
            </a>
          </td>
        </tr>
        <tr>
          <td>JID-001</td>
          <td>Pre-Sales Lead - Module Lead/ Project Lead</td>
          <td>5 to 8 years</td>
          <td>Bangalore</td>
          <td>Expertise in electronics, embedded software, proposals, and stakeholder communication.</td>
          <td>
            <a
              href="https://mistralsolutions.com/wp-content/uploads/2026/07/Pre-Sales-Lead-Module-Lead_-Project-Lead.docx"
              class="job-description-btn"
              target="_blank">View Details</a>
          </td>
          <td>
            <a
              href="#"
              class="apply-btn career-popup-btn"
              data-form="https://form.jotform.com/261788550500054?positionApplyingFor=Pre-Sales%20Lead%20-%20Module%20Lead/%20Project%20Lead">
              Apply
            </a>
          </td>
        </tr>
      </tbody>
    </table>
    <p><strong>Don't find a role matching your skills?</strong></p>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/mistralsolutions/catalog.js')
  } catch {
    assert.fail('Expected Mistral Solutions catalog module at ../../scraper/mistralsolutions/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/mistralsolutions/script.js')
  } catch {
    assert.fail('Expected Mistral Solutions scraper module at ../../scraper/mistralsolutions/script.js')
  }
}

test('Mistral Solutions local catalog captures the verified first-party careers table', async () => {
  const { MISTRAL_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const scriptModule = await loadScriptModule()

  assert.equal(defaultCatalog, MISTRAL_SOLUTIONS_CATALOG)
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.source, 'mistralsolutions')
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.companyName, 'Mistral Solutions')
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.officialBrandName, 'Mistral Solutions')
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.adapter, 'script')
  assert.equal(
    MISTRAL_SOLUTIONS_CATALOG.companyCareerPage,
    'https://mistralsolutions.com/career/careers-job-listings/',
  )
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.atsPlatform, 'official-company-careers-table')
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.countryFilter, 'India')
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.paginationStrategy, 'single-careers-table-page')
  assert.equal(
    MISTRAL_SOLUTIONS_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+html-job-table+docx-detail-links+jotform-apply-links',
  )
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.companyDomain, 'mistralsolutions.com')
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.verifiedOn, '2026-07-18')
  assert.equal(MISTRAL_SOLUTIONS_CATALOG.modulePath, modulePath)
  assert.match(MISTRAL_SOLUTIONS_CATALOG.verifiedSurfaceSummary, /JID-021/i)
  assert.match(MISTRAL_SOLUTIONS_CATALOG.verifiedSurfaceSummary, /JID-001/i)
  assert.match(MISTRAL_SOLUTIONS_CATALOG.verifiedSurfaceSummary, /Jotform/i)
  assert.deepEqual(scriptModule.PROVIDER_METADATA, MISTRAL_SOLUTIONS_CATALOG)

  const report = generateCompanyCoverageReport({
    csvText: 'Mistral Solutions\n',
    catalog: [MISTRAL_SOLUTIONS_CATALOG],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Mistral Solutions extracts first-party careers table rows with docx detail links and jotform apply links', async () => {
  const mistral = await loadScriptModule()

  assert.equal(mistral.hasOfficialCareersPageSignal(careersHtml), true)

  const extractedJobs = mistral.extractJobsFromHtml(careersHtml)
  assert.deepEqual(
    extractedJobs.map((job) => [job.jobId, job.title, job.location, job.sourceUrl, job.applyUrl]),
    [
      [
        'JID-021',
        'Test Engineer - Senior Engineer',
        'Bangalore, India',
        'https://mistralsolutions.com/wp-content/uploads/2026/07/18.Test-Engineer-Senior-Engineer.docx',
        'https://form.jotform.com/261900894262460?positionApplyingFor=Test%20Engineer%20-%20Senior%20Engineer%20',
      ],
      [
        'JID-001',
        'Pre-Sales Lead - Module Lead/ Project Lead',
        'Bangalore, India',
        'https://mistralsolutions.com/wp-content/uploads/2026/07/Pre-Sales-Lead-Module-Lead_-Project-Lead.docx',
        'https://form.jotform.com/261788550500054?positionApplyingFor=Pre-Sales%20Lead%20-%20Module%20Lead/%20Project%20Lead',
      ],
    ],
  )

  const jobs = await mistral.createMistralSolutionsScraper().run({
    fetchText: async () => careersHtml,
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'mistralsolutions')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].city, 'Bangalore')
  assert.equal(jobs[0].country, 'India')
})

test('Mistral Solutions fails closed when the verified careers table disappears', async () => {
  const mistral = await loadScriptModule()

  await assert.rejects(
    mistral.createMistralSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1><p>No listings here.</p></body></html>',
    }),
    /verified first-party careers table/i,
  )
})
