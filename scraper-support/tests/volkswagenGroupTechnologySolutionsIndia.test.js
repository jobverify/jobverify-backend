import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { getScraperCatalog } from '../providers/index.js'

const loadModule = () => import('../../scraper/volkswagengrouptechnologysolutionsindia/script.js')

const officialSiteHtml = '<html><body><h1>Volkswagen Group Digital Solutions [India]</h1><h2>Careers</h2></body></html>'
const noOpeningsHtml = '<html><body><h1>Career Opportunities</h1><p>No jobs match your selections</p></body></html>'
const loadingShellHtml = `
  <html>
    <body>
      <h1>Career Opportunities</h1>
      <p>Loading...</p>
      <script>
        window.shellData = {
          emptyState: 'No jobs match your selections'
        }
      </script>
    </body>
  </html>
`

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

test('the Volkswagen sentinel can recover from SuccessFactors certificate failures with a browser-rendered empty state', async () => {
  const volkswagen = await loadModule()
  const directUrls = []
  const browserUrls = []

  const jobs = await volkswagen.createVolkswagenGroupTechnologySolutionsIndiaScraper().run({
    fetchText: async (url) => {
      directUrls.push(url)
      if (url === volkswagen.CAREERS_URL) return officialSiteHtml
      if (url === volkswagen.BOARD_URL) {
        throw new Error('fetch failed | unable to verify the first certificate')
      }
      throw new Error(`Unexpected direct URL: ${url}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      if (url === volkswagen.BOARD_URL) return noOpeningsHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(directUrls, [volkswagen.CAREERS_URL, volkswagen.BOARD_URL])
  assert.deepEqual(browserUrls, [volkswagen.BOARD_URL])
  assert.deepEqual(jobs, [])
})

test('the Volkswagen sentinel can recover when the first-party careers surface requires browser rendering', async () => {
  const volkswagen = await loadModule()
  const directUrls = []
  const browserUrls = []

  const jobs = await volkswagen.createVolkswagenGroupTechnologySolutionsIndiaScraper().run({
    fetchText: async (url) => {
      directUrls.push(url)
      if (url === volkswagen.CAREERS_URL) {
        throw new Error('fetch failed | unable to verify the first certificate')
      }
      if (url === volkswagen.BOARD_URL) return noOpeningsHtml
      throw new Error(`Unexpected direct URL: ${url}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      if (url === volkswagen.CAREERS_URL) return officialSiteHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(directUrls, [volkswagen.CAREERS_URL, volkswagen.BOARD_URL])
  assert.deepEqual(browserUrls, [volkswagen.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('the Volkswagen sentinel can recover when the SuccessFactors board only exposes the empty-state through browser rendering', async () => {
  const volkswagen = await loadModule()
  const directUrls = []
  const browserUrls = []

  const jobs = await volkswagen.createVolkswagenGroupTechnologySolutionsIndiaScraper().run({
    fetchText: async (url) => {
      directUrls.push(url)
      if (url === volkswagen.CAREERS_URL) return officialSiteHtml
      if (url === volkswagen.BOARD_URL) return loadingShellHtml
      throw new Error(`Unexpected direct URL: ${url}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      if (url === volkswagen.BOARD_URL) return noOpeningsHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
  })

  assert.deepEqual(directUrls, [volkswagen.CAREERS_URL, volkswagen.BOARD_URL])
  assert.deepEqual(browserUrls, [volkswagen.BOARD_URL])
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
