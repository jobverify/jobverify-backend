import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const tipsConfig = JSON.parse(
  readFileSync(
    path.resolve(currentDir, '../../scraper/theindianpublicschool.workday/config.json'),
    'utf8',
  ),
)

const loadTipsModule = async () => {
  try {
    return await import('../../scraper/theindianpublicschool.workday/script.js')
  } catch {
    assert.fail('Expected The Indian Public School scraper module at ../../scraper/theindianpublicschool.workday/script.js')
  }
}

test('buildScraperOptions keeps TIPS on the verified official careers handoff and Workday tenant', async () => {
  const tips = await loadTipsModule()
  const options = tips.buildScraperOptions()

  assert.equal(tips.CAREER_PAGE_URL, 'https://www.theindianpublicschool.org/careers')
  assert.equal(
    tips.BASE_URL,
    'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers',
  )
  assert.equal(tips.COMPANY_NAME, 'The Indian Public School (TIPS)')
  assert.equal(tips.SOURCE, 'theindianpublicschool')
  assert.equal(options.company, 'The Indian Public School (TIPS)')
  assert.equal(
    options.baseUrl,
    'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers',
  )
  assert.equal(options.locationCountry, null)
  assert.equal(options.source, 'theindianpublicschool')
  assert.match(options.scraperDir, /theindianpublicschool\.workday$/)
  assert.deepEqual(tipsConfig, {
    locationCountry: null,
    searchText: 'TIPS',
  })
})

test('run delegates TIPS scraping to the shared Workday runner with the verified tenant options', async () => {
  const tips = await loadTipsModule()
  const expectedJobs = [{ jobId: 'JR-123', title: 'Sample TIPS Role' }]
  let receivedOptions = null

  const jobs = await tips.run({
    workdayRunner: async (options) => {
      receivedOptions = options
      return expectedJobs
    },
  })

  assert.equal(jobs, expectedJobs)
  assert.ok(receivedOptions)
  assert.equal(receivedOptions.company, 'The Indian Public School (TIPS)')
  assert.equal(
    receivedOptions.baseUrl,
    'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers',
  )
  assert.equal(receivedOptions.locationCountry, null)
  assert.equal(receivedOptions.source, 'theindianpublicschool')
  assert.match(receivedOptions.scraperDir, /theindianpublicschool\.workday$/)
})
