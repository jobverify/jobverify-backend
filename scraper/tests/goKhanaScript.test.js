import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers - GoKhana</title>
    <link rel="canonical" href="https://gokhana.com/careers/" />
  </head>
  <body>
    <h1>Careers</h1>
    <p>Open <b>Positions</b></p>
    <div class="elementor-element elementor-element-ddb6f27 e-con-full e-flex e-con e-child">
      <div class="elementor-widget-container">
        <h2 class="elementor-heading-title elementor-size-default">Compliance Executive (HR)</h2>
      </div>
      <div class="elementor-widget-container">
        <h2 class="elementor-heading-title elementor-size-default">Location : Bangalore, Karnataka</h2>
      </div>
      <div class="elementor-widget-container">
        <h2 class="elementor-heading-title elementor-size-default">Employment type: Full-time</h2>
      </div>
      <div class="elementor-button-wrapper">
        <a class="elementor-button elementor-button-link elementor-size-sm" href="https://www.linkedin.com/jobs/view/4176111780" target="_blank" rel="noopener">
          <span class="elementor-button-text">Apply Now</span>
        </a>
      </div>
    </div>
    <div class="elementor-element elementor-element-6ca5c0f e-con-full e-flex e-con e-child">
      <div class="elementor-widget-container">
        <h2 class="elementor-heading-title elementor-size-default">Manager - Supply / Vendor (F&amp;B)</h2>
      </div>
      <div class="elementor-widget-container">
        <h2 class="elementor-heading-title elementor-size-default">Location : Chennai, Tamil Nadu</h2>
      </div>
      <div class="elementor-widget-container">
        <h2 class="elementor-heading-title elementor-size-default">Employment type: Full-time</h2>
      </div>
      <div class="elementor-button-wrapper">
        <a class="elementor-button elementor-button-link elementor-size-sm" href="https://www.linkedin.com/jobs/view/4176120401" target="_blank" rel="noopener">
          <span class="elementor-button-text">Apply Now</span>
        </a>
      </div>
    </div>
  </body>
</html>
`

const careersWithoutOpeningsHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers - GoKhana</title>
    <link rel="canonical" href="https://gokhana.com/careers/" />
  </head>
  <body>
    <h1>Careers</h1>
    <p>Open Positions</p>
    <p>No jobs right now.</p>
  </body>
</html>
`

const loadGoKhanaModule = async () => {
  try {
    return await import('../gokhana/script.js')
  } catch {
    assert.fail('Expected GoKhana scraper module at ../gokhana/script.js')
  }
}

test('GoKhana extracts the verified official careers cards into conservative job records', async () => {
  const gokhana = await loadGoKhanaModule()
  const jobs = gokhana.extractJobsFromCareerPage(careersHtml)

  assert.equal(gokhana.SOURCE, 'gokhana')
  assert.equal(gokhana.COMPANY, 'GoKhana')
  assert.equal(gokhana.VERIFIED_ON, '2026-07-16')
  assert.equal(gokhana.CAREER_PAGE_URL, 'https://gokhana.com/careers/')
  assert.equal(gokhana.pageHasOfficialGoKhanaSignals(careersHtml), true)
  assert.equal(
    gokhana.extractLinkedInJobId('https://www.linkedin.com/jobs/view/4176111780'),
    '4176111780',
  )

  assert.deepEqual(jobs, [
    {
      title: 'Compliance Executive (HR)',
      company: 'GoKhana',
      department: null,
      location: 'Bangalore, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '4176111780',
      requisitionId: '4176111780',
      sourceUrl: 'https://gokhana.com/careers/',
      applyUrl: 'https://www.linkedin.com/jobs/view/4176111780',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Official GoKhana careers page lists Compliance Executive (HR) in Bangalore, Karnataka, India. Employment type: Full-time. Apply via LinkedIn.',
    },
    {
      title: 'Manager - Supply / Vendor (F&B)',
      company: 'GoKhana',
      department: null,
      location: 'Chennai, Tamil Nadu, India',
      city: 'Chennai',
      country: 'India',
      jobId: '4176120401',
      requisitionId: '4176120401',
      sourceUrl: 'https://gokhana.com/careers/',
      applyUrl: 'https://www.linkedin.com/jobs/view/4176120401',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Official GoKhana careers page lists Manager - Supply / Vendor (F&B) in Chennai, Tamil Nadu, India. Employment type: Full-time. Apply via LinkedIn.',
    },
  ])
})

test('GoKhana run fetches the official careers page and decorates the extracted openings', async () => {
  const gokhana = await loadGoKhanaModule()
  const requestedUrls = []
  const scraper = gokhana.createGoKhanaScraper({
    now: () => FIXED_SCRAPED_AT,
    maxJobs: 1,
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [gokhana.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [
    {
      title: 'Compliance Executive (HR)',
      company: 'GoKhana',
      department: null,
      location: 'Bangalore, Karnataka, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '4176111780',
      requisitionId: '4176111780',
      sourceUrl: 'https://gokhana.com/careers/',
      applyUrl: 'https://www.linkedin.com/jobs/view/4176111780',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Official GoKhana careers page lists Compliance Executive (HR) in Bangalore, Karnataka, India. Employment type: Full-time. Apply via LinkedIn.',
      source: 'gokhana',
      link: 'https://www.linkedin.com/jobs/view/4176111780',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('GoKhana fails closed when the official careers shell drifts or stops exposing verified job cards', async () => {
  const gokhana = await loadGoKhanaModule()

  await assert.rejects(
    gokhana.createGoKhanaScraper().run({
      fetchText: async () => careersHtml.replace('Open <b>Positions</b>', 'Careers'),
    }),
    /official careers page no longer matches the verified public surface/i,
  )

  await assert.rejects(
    gokhana.createGoKhanaScraper().run({
      fetchText: async () => careersWithoutOpeningsHtml,
    }),
    /official careers page no longer matches the verified public surface/i,
  )
})
