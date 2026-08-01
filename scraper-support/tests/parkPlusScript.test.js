import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import {
  CAREERS_URL,
  COMPANY,
  createParkPlusScraper,
  extractOfficialJobs,
  SOURCE,
} from '../../scraper/parkplus/script.js'

const COMPANY_CSV_PATH = 'C:/Users/mohv/Downloads/indian_software_companies_500.csv'

const officialCareersHtml = `
  <script id="__NEXT_DATA__" type="application/json">
    {"props":{"pageProps":{"data":{"jobs":[{"id":12,"attributes":{"title":"Sales Manager","department":"Apartment Sales","location":"Gurugram | Chennai | Hyderabad | Kolkata | Pune | Mumbai","experience":"2 to 6 years","whatYouWillDo":"Drive closures across identified societies.","slug":"sales-manager","isClosed":false}}]}}}}
  </script>
`

test('Park+ is covered only by its exact first-party provider', () => {
  const catalog = getScraperCatalog()
  const provider = catalog.find((item) => item.source === SOURCE)
  const report = generateCompanyCoverageReport({
    csvText: readFileSync(COMPANY_CSV_PATH, 'utf8'),
    catalog,
  })

  assert.ok(provider)
  assert.equal(provider.companyName, COMPANY)
  assert.equal(provider.companyDomain, 'parkplus.io')
  assert.equal(provider.exactCompanyMatchOnly, true)
  assert.deepEqual(
    report.matched
      .filter((item) => /^Park\+/.test(item.companyName))
      .map((item) => [item.companyName, item.source]),
    [['Park+', SOURCE]],
  )
  assert.deepEqual(
    report.unmatched.filter((item) => /^Park\+|^Park Plus$/.test(item.companyName))
      .map((item) => item.companyName),
    ['Park+ India', 'Park Plus'],
  )
})

test('Park+ parses only validated jobs from its official careers payload', async () => {
  assert.deepEqual(extractOfficialJobs(officialCareersHtml), [
    {
      id: 12,
      title: 'Sales Manager',
      department: 'Apartment Sales',
      location: 'Gurugram | Chennai | Hyderabad | Kolkata | Pune | Mumbai',
      experienceRequired: '2 to 6 years',
      description: 'Drive closures across identified societies.',
      slug: 'sales-manager',
      isClosed: false,
    },
  ])

  const jobs = await createParkPlusScraper({
    now: () => '2026-07-26T00:00:00.000Z',
  }).run({
    fetchPage: async () => ({ status: 200, url: CAREERS_URL, html: officialCareersHtml }),
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, COMPANY)
  assert.equal(jobs[0].jobId, 'parkplus-12')
  assert.equal(jobs[0].applyUrl, CAREERS_URL)
})

test('Park+ fails closed when the official page or payload is not verified', async () => {
  const scraper = createParkPlusScraper()

  await assert.rejects(
    scraper.run({
      fetchPage: async () => ({ status: 200, url: 'https://parkplus.example/careers', html: officialCareersHtml }),
    }),
    /verified first-party surface/,
  )
  await assert.rejects(
    scraper.run({
      fetchPage: async () => ({ status: 200, url: CAREERS_URL, html: '<html></html>' }),
    }),
    /jobs array/,
  )
  await assert.rejects(
    scraper.run({
      fetchPage: async () => ({
        status: 200,
        url: CAREERS_URL,
        html: officialCareersHtml.replace('"Sales Manager"', '""'),
      }),
    }),
    /invalid job record/,
  )

  const builtScraper = buildScrapers().find((item) => item.name === SOURCE)
  assert.ok(builtScraper)
})
