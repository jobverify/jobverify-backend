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
    <title>Career | SunTec Group</title>
  </head>
  <body>
    <h1>Explore Opportunities at SunTec Group</h1>
    <p>Join SunTec Group and build category-leading products for financial services.</p>
    <a href="/careers/technical-trainer/">Technical Trainer</a>
    <a href="https://www.suntecgroup.com/careers/analyst-inside-sales/">Analyst - Inside Sales</a>
    <a href="/career/">Careers Home</a>
    <a href="https://example.com/external-role/">External Role</a>
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
      title: 'Technical Trainer',
      company: 'SunTec Group',
      jobId: 'technical-trainer',
      requisitionId: 'technical-trainer',
      sourceUrl: 'https://www.suntecgroup.com/careers/technical-trainer/',
      applyUrl: 'https://www.suntecgroup.com/careers/technical-trainer/',
    },
    {
      title: 'Analyst - Inside Sales',
      company: 'SunTec Group',
      jobId: 'analyst-inside-sales',
      requisitionId: 'analyst-inside-sales',
      sourceUrl: 'https://www.suntecgroup.com/careers/analyst-inside-sales/',
      applyUrl: 'https://www.suntecgroup.com/careers/analyst-inside-sales/',
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

test('run fetches the SunTec careers page, follows detail links, and decorates final jobs', async () => {
  const suntec = await loadSuntecModule()
  const requestedUrls = []

  const jobs = await suntec.createSuntecScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === suntec.CAREERS_URL) return careersPageHtml
      if (url === 'https://www.suntecgroup.com/careers/technical-trainer/') return technicalTrainerDetailHtml
      if (url === 'https://www.suntecgroup.com/careers/analyst-inside-sales/') return insideSalesDetailHtml
      throw new Error(`Unexpected SunTec fixture URL: ${url}`)
    },
    now: () => '2026-07-10T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    suntec.CAREERS_URL,
    'https://www.suntecgroup.com/careers/technical-trainer/',
    'https://www.suntecgroup.com/careers/analyst-inside-sales/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'suntec')
  assert.equal(jobs[0].company, 'SunTec Group')
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(jobs[0].applyUrl, jobs[0].sourceUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-10T00:00:00.000Z')
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
