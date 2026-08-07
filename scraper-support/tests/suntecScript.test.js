import assert from 'node:assert/strict'
import test from 'node:test'

const loadSuntecModule = async () => {
  try {
    return await import('../../scraper/suntec/script.js')
  } catch {
    assert.fail('Expected SunTec scraper module at ../../scraper/suntec/script.js')
  }
}

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Work with us - SunTec</title>
  </head>
  <body>
    <h1>Find the job you love</h1>
    <p>Join SunTec Group and build category-leading products for financial services.</p>
    <div class="elementor-widget-container"><h2 class="elementor-heading-title">Current Openings</h2></div>
    <div class="elementor-element">
      <h2>Analyst - Inside Sales</h2>
      <p>Build high quality pipeline and inspire prospects across the sales lifecycle.</p>
      <a href="https://suntecgroup.com/careers/analyst-inside-sales/">View Openings</a>
    </div>
    <div class="elementor-element">
      <h2>Technical Trainer</h2>
      <p>Deliver technical and functional training programs for SunTec teams.</p>
      <a href="https://www.suntecgroup.com/careers/technical-trainer/">View Openings</a>
    </div>
    <div class="elementor-hidden-desktop elementor-hidden-tablet elementor-hidden-mobile">
      <h2>Computer Systems Analyst</h2>
      <a href="/career-computer-systems-analyst/">View Openings</a>
    </div>
    <div class="gform_wrapper">Gravity Forms</div>
  </body>
</html>
`

const technicalTrainerDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Technical Trainer</h1>
    <p>Department: Learning &amp; Development</p>
    <p>Location: Kochi, India</p>
    <p>Experience: 3-5 years</p>
    <section class="elementor-widget-theme-post-content">
      <h2>Job Summary</h2>
      <p>Deliver product and domain training for enterprise teams.</p>
      <ul>
        <li>Create training plans for implementation teams.</li>
        <li>Facilitate classroom and virtual sessions.</li>
      </ul>
    </section>
    <div class="gform_wrapper">
      <h2>Apply for this Job</h2>
      <label>First Name</label>
      <label>Resume</label>
    </div>
  </body>
</html>
`

const insideSalesDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Analyst - Inside Sales</h1>
    <p>Department: Sales</p>
    <p>Location: Trivandrum, India</p>
    <p>Experience: 1-3 years</p>
    <section class="elementor-widget-theme-post-content">
      <h2>Role Overview</h2>
      <p>Support pipeline generation and outbound prospecting for SunTec markets.</p>
    </section>
    <div class="gform_wrapper">
      <h2>Apply for this Job</h2>
      <label>First Name</label>
      <label>Resume</label>
    </div>
  </body>
</html>
`

test('hasOfficialCareersSignal validates the verified SunTec careers surface', async () => {
  const suntec = await loadSuntecModule()

  assert.equal(suntec.hasOfficialCareersSignal(careersPageHtml), true)
})

test('extractListings keeps only same-domain SunTec detail pages from the careers page', async () => {
  const suntec = await loadSuntecModule()

  assert.deepEqual(suntec.extractListings(careersPageHtml), [
    {
      title: 'Analyst - Inside Sales',
      company: 'SunTec Group',
      jobId: 'analyst-inside-sales',
      requisitionId: 'analyst-inside-sales',
      sourceUrl: 'https://www.suntecgroup.com/careers/analyst-inside-sales/',
      applyUrl: 'https://www.suntecgroup.com/careers/analyst-inside-sales/',
      detailUrl: 'https://www.suntecgroup.com/careers/analyst-inside-sales/',
      inlineDescription: 'Build high quality pipeline and inspire prospects across the sales lifecycle.',
    },
    {
      title: 'Technical Trainer',
      company: 'SunTec Group',
      jobId: 'technical-trainer',
      requisitionId: 'technical-trainer',
      sourceUrl: 'https://www.suntecgroup.com/careers/technical-trainer/',
      applyUrl: 'https://www.suntecgroup.com/careers/technical-trainer/',
      detailUrl: 'https://www.suntecgroup.com/careers/technical-trainer/',
      inlineDescription: 'Deliver technical and functional training programs for SunTec teams.',
    },
  ])
})

test('extractJobDetail maps SunTec detail-page metadata and keeps the detail page as applyUrl', async () => {
  const suntec = await loadSuntecModule()
  const sourceUrl = 'https://www.suntecgroup.com/careers/technical-trainer/'

  assert.deepEqual(suntec.extractJobDetail(technicalTrainerDetailHtml, {
    title: 'Technical Trainer',
    jobId: 'technical-trainer',
    requisitionId: 'technical-trainer',
    sourceUrl,
    applyUrl: sourceUrl,
  }), {
    title: 'Technical Trainer',
    company: 'SunTec Group',
    department: 'Learning & Development',
    location: 'Kochi, India',
    city: 'Kochi',
    country: 'India',
    jobId: 'technical-trainer',
    requisitionId: 'technical-trainer',
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: '3-5 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Job Summary Deliver product and domain training for enterprise teams. Create training plans for implementation teams. Facilitate classroom and virtual sessions.',
    remoteStatus: 'On-site',
  })
})

test('run keeps live inline openings even when one SunTec detail page has drifted to 404', async () => {
  const suntec = await loadSuntecModule()
  const requestedUrls = []

  const jobs = await suntec.createSuntecScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === suntec.CAREERS_URL) return careersPageHtml
      if (url === 'https://www.suntecgroup.com/careers/technical-trainer/') return technicalTrainerDetailHtml
      if (url === 'https://www.suntecgroup.com/careers/analyst-inside-sales/') throw new Error(`HTTP 404 for ${url}`)
      throw new Error(`Unexpected SunTec fixture URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    suntec.CAREERS_URL,
    'https://www.suntecgroup.com/careers/analyst-inside-sales/',
    'https://www.suntecgroup.com/careers/technical-trainer/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'suntec')
  assert.equal(jobs[0].company, 'SunTec Group')
  assert.equal(jobs[0].sourceUrl, suntec.CAREERS_URL)
  assert.equal(jobs[0].applyUrl, suntec.CAREERS_URL)
  assert.equal(jobs[0].link, suntec.CAREERS_URL)
  assert.equal(jobs[0].jobDescription, 'Build high quality pipeline and inspire prospects across the sales lifecycle.')
  assert.equal(jobs[0].scrapedAt, '2026-07-10T00:00:00.000Z')
  assert.equal(jobs[1].sourceUrl, 'https://www.suntecgroup.com/careers/technical-trainer/')
  assert.equal(jobs[1].applyUrl, 'https://www.suntecgroup.com/careers/technical-trainer/')
  assert.equal(jobs[1].link, 'https://www.suntecgroup.com/careers/technical-trainer/')
})

test('run still decorates SunTec jobs from detail pages when they resolve', async () => {
  const suntec = await loadSuntecModule()

  const jobs = await suntec.createSuntecScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      if (url === suntec.CAREERS_URL) return careersPageHtml
      if (url === 'https://www.suntecgroup.com/careers/analyst-inside-sales/') return insideSalesDetailHtml
      throw new Error(`Unexpected SunTec fixture URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].sourceUrl, 'https://www.suntecgroup.com/careers/analyst-inside-sales/')
  assert.equal(jobs[0].applyUrl, 'https://www.suntecgroup.com/careers/analyst-inside-sales/')
  assert.equal(jobs[0].location, 'Trivandrum, India')
  assert.equal(jobs[0].jobDescription, 'Role Overview Support pipeline generation and outbound prospecting for SunTec markets.')
})

test('run fails closed when the verified SunTec careers signal disappears', async () => {
  const suntec = await loadSuntecModule()

  await assert.rejects(
    suntec.createSuntecScraper().run({
      fetchText: async () => '<html><body>No verified public SunTec job links here</body></html>',
    }),
    /verified SunTec careers surface/i,
  )
})
