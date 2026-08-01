import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

const loadModule = () => import('../../scraper/volkswagengrouptechnologysolutionsindia/script.js')

const officialSiteHtml = '<html><body><h1>Volkswagen Group Digital Solutions [India]</h1><h2>Careers</h2></body></html>'
const noOpeningsHtml = '<html><body><h1>Career Opportunities</h1><p>No jobs match your selections</p></body></html>'

test('the exact Volkswagen Group Technology Solutions India CSV name resolves to its verified provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nVolkswagen Group Technology Solutions India\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.equal(report.matched[0]?.source, 'volkswagengrouptechnologysolutionsindia')
})

test('the verified Volkswagen SuccessFactors no-openings surface fails closed', async () => {
  const volkswagen = await loadModule()
  const requestedUrls = []

  const jobs = await volkswagen.createVolkswagenGroupTechnologySolutionsIndiaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return url === volkswagen.CAREERS_URL ? officialSiteHtml : noOpeningsHtml
    },
  })

  assert.deepEqual(requestedUrls, [volkswagen.CAREERS_URL, volkswagen.BOARD_URL])
  assert.deepEqual(jobs, [])
})

test('the Volkswagen sentinel rejects surface drift instead of masking new openings', async () => {
  const volkswagen = await loadModule()

  await assert.rejects(
    volkswagen.createVolkswagenGroupTechnologySolutionsIndiaScraper().run({
      fetchText: async (url) => (url === volkswagen.CAREERS_URL ? officialSiteHtml : '<html><body>Software Engineer Pune</body></html>'),
    }),
    /no-openings contract/i,
  )
})
