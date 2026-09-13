import assert from 'node:assert/strict'
import test from 'node:test'

const loadGenpactModule = async () => {
  try {
    return await import('../../scraper/genpact.workday/script.js')
  } catch {
    assert.fail('Expected Genpact scraper module at ../../scraper/genpact.workday/script.js')
  }
}

test('buildScraperOptions keeps Genpact on the official careers page and Workday tenant', async () => {
  const genpact = await loadGenpactModule()
  const options = genpact.buildScraperOptions()
  const baseUrl = new URL(genpact.BASE_URL)

  assert.equal(genpact.CAREER_PAGE_URL, 'https://www.genpact.com/careers')
  assert.equal(baseUrl.origin + baseUrl.pathname, 'https://genpact.wd108.myworkdayjobs.com/External_Careers')
  assert.equal(genpact.INDIA_LOCATION_IDS.length, 67)
  assert.equal(new Set(genpact.INDIA_LOCATION_IDS).size, 67)
  assert.deepEqual(baseUrl.searchParams.getAll('locations'), genpact.INDIA_LOCATION_IDS)
  assert.ok(genpact.INDIA_LOCATION_IDS.includes('faddece16d451000bc257f189c3e0000'), 'Noida JP')
  assert.ok(genpact.INDIA_LOCATION_IDS.includes('faddece16d451000bc259994ffbd0000'), 'Pune JP')
  assert.ok(!genpact.INDIA_LOCATION_IDS.includes('faddece16d451000bf34011582eb0000'), 'London')
  assert.equal(genpact.COMPANY_NAME, 'Genpact')
  assert.equal(genpact.SOURCE, 'genpact')
  assert.equal(options.company, 'Genpact')
  assert.equal(options.baseUrl, genpact.BASE_URL)
  assert.equal(options.locationCountry, null)
  assert.equal(options.source, 'genpact')
  assert.match(options.scraperDir, /genpact\.workday$/)
})

test('run delegates Genpact scraping to the shared Workday runner with the official tenant options', async () => {
  const genpact = await loadGenpactModule()
  const expectedJobs = [{ jobId: 'JP-1', title: 'Sample Job' }]
  let receivedOptions = null

  const jobs = await genpact.run({
    workdayRunner: async (options) => {
      receivedOptions = options
      return expectedJobs
    },
  })

  assert.equal(jobs, expectedJobs)
  assert.ok(receivedOptions)
  assert.equal(receivedOptions.company, 'Genpact')
  assert.equal(receivedOptions.baseUrl, genpact.BASE_URL)
  assert.equal(receivedOptions.locationCountry, null)
  assert.equal(receivedOptions.source, 'genpact')
  assert.match(receivedOptions.scraperDir, /genpact\.workday$/)
})
