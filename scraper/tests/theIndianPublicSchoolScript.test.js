import assert from 'node:assert/strict'
import test from 'node:test'

const loadTipsModule = async () => {
  try {
    return await import('../theindianpublicschool/script.js')
  } catch {
    assert.fail('Expected The Indian Public School scraper module at ../theindianpublicschool/script.js')
  }
}

test('buildScraperOptions keeps TIPS on the verified official careers handoff and Workday tenant', async () => {
  const tips = await loadTipsModule()
  const options = tips.buildScraperOptions()

  assert.equal(tips.CAREER_PAGE_URL, 'https://www.theindianpublicschool.org/careers')
  assert.equal(
    tips.BASE_URL,
    'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers?q=TIPS&jobFamilyGroup=2d491c2214bf1000c1f6c9eeac980001&CF_LRV_Job_Category__From_Job_Profile__Extended=2d491c2214bf1000c1f6c9eeac980001',
  )
  assert.equal(tips.COMPANY_NAME, 'The Indian Public School (TIPS)')
  assert.equal(tips.SOURCE, 'theindianpublicschool')
  assert.equal(options.company, 'The Indian Public School (TIPS)')
  assert.equal(
    options.baseUrl,
    'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers?q=TIPS&jobFamilyGroup=2d491c2214bf1000c1f6c9eeac980001&CF_LRV_Job_Category__From_Job_Profile__Extended=2d491c2214bf1000c1f6c9eeac980001',
  )
  assert.equal(options.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.equal(options.source, 'theindianpublicschool')
  assert.match(options.scraperDir, /theindianpublicschool$/)
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
    'https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers?q=TIPS&jobFamilyGroup=2d491c2214bf1000c1f6c9eeac980001&CF_LRV_Job_Category__From_Job_Profile__Extended=2d491c2214bf1000c1f6c9eeac980001',
  )
  assert.equal(receivedOptions.locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.equal(receivedOptions.source, 'theindianpublicschool')
  assert.match(receivedOptions.scraperDir, /theindianpublicschool$/)
})
