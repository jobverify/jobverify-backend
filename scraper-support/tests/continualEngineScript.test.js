import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
  <div class="elementor-accordion-item">
    <h3 id="elementor-tab-title-3311" class="elementor-tab-title" aria-controls="elementor-tab-content-3311">
      <a class="elementor-accordion-title" tabindex="0">Product Analyst</a>
    </h3>
    <div id="elementor-tab-content-3311" class="elementor-tab-content elementor-clearfix">
      <ul><li>Minimum of 2 years of experience as a Product Analyst or in a similar role.</li></ul>
      <a class="apply_now" href="mailto:contact@continualengine.com">Apply now</a>
    </div>
  </div>
  <div class="elementor-accordion-item">
    <h3 id="elementor-tab-title-3312" class="elementor-tab-title" aria-controls="elementor-tab-content-3312">
      <a class="elementor-accordion-title" tabindex="0">Editor - Alt text <span>(All engineering subjects)</span></a>
    </h3>
    <div id="elementor-tab-content-3312" class="elementor-tab-content elementor-clearfix">
      <ul><li>Minimum of 2 years of experience in alt text creation and eLearning content editing.</li></ul>
      <a class="apply_now" href="mailto:contact@continualengine.com">Apply now</a>
    </div>
  </div>
`

test('extractCareerListings maps official Continual Engine accordion openings', async () => {
  const continualEngine = await import('../../scraper/continualengine/script.js')

  const jobs = continualEngine.extractCareerListings(careersHtml)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Product Analyst',
    company: 'Continual Engine',
    department: null,
    location: null,
    city: null,
    country: 'India',
    jobId: 'continualengine-product-analyst',
    requisitionId: 'continualengine-product-analyst',
    sourceUrl: 'https://www.continualengine.com/careers/#elementor-tab-title-3311',
    applyUrl: 'mailto:contact@continualengine.com',
    employmentType: null,
    experienceRequired: '2 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Minimum of 2 years of experience as a Product Analyst or in a similar role.',
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].title, 'Editor - Alt text (All engineering subjects)')
  assert.equal(jobs[1].jobId, 'continualengine-editor-alt-text-all-engineering-subjects')
})

test('run fetches the official Continual Engine careers page and decorates its listings', async () => {
  const continualEngine = await import('../../scraper/continualengine/script.js')
  const requestedUrls = []

  const jobs = await continualEngine.createContinualEngineScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://www.continualengine.com/careers/'])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'continualengine')
  assert.equal(jobs[0].link, 'mailto:contact@continualengine.com')
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})
