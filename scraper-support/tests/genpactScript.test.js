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

  assert.equal(genpact.CAREER_PAGE_URL, 'https://www.genpact.com/careers')
  assert.equal(genpact.BASE_URL, 'https://genpact.wd108.myworkdayjobs.com/External_Careers')
  assert.equal(genpact.COMPANY_NAME, 'Genpact')
  assert.equal(genpact.SOURCE, 'genpact')
  assert.equal(options.company, 'Genpact')
  assert.equal(options.baseUrl, 'https://genpact.wd108.myworkdayjobs.com/External_Careers')
  assert.equal(options.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.equal(options.source, 'genpact')
  assert.match(options.scraperDir, /genpact$/)
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
  assert.equal(receivedOptions.baseUrl, 'https://genpact.wd108.myworkdayjobs.com/External_Careers')
  assert.equal(receivedOptions.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.equal(receivedOptions.source, 'genpact')
  assert.match(receivedOptions.scraperDir, /genpact$/)
})
