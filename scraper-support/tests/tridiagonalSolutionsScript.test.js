import assert from 'node:assert/strict'
import test from 'node:test'

const loadTridiagonalSolutionsModule = async () => {
  try {
    return await import('../../scraper/tridiagonalsolutions/script.js')
  } catch {
    assert.fail('Expected Tridiagonal Solutions scraper module at ../../scraper/tridiagonalsolutions/script.js')
  }
}

const officialCareersHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Careers - Tridiagonal Solutions</title>
    <meta name="description" content="Careers - Tridiagonal Solutions" />
  </head>
  <body>
    <section class="careers-hero">
      <a href="#jobs-section" class="btn-primary">VIEW OPENING</a>
    </section>
    <section id="jobs-section">
      <div class="jobs-toolbar">
        <input type="text" placeholder="Search by title, department, or location..." class="jobs-search-input" value="" />
        <select class="jobs-dept-select">
          <option value="All Departments" selected="">All Departments</option>
          <option value="Advanced Modeling &amp; Simulation (CFD/FEA)">Advanced Modeling &amp; Simulation (CFD/FEA)</option>
          <option value="Technology Validation &amp; Scale-up Centre">Technology Validation &amp; Scale-up Centre</option>
        </select>
      </div>
      <div class="jobs-list">
        <div class="job-row">
          <div class="job-row-info">
            <h3 class="job-row-title">Business Development Manager | AMS</h3>
            <div class="job-row-meta">
              <span class="job-meta-pill">Advanced Modeling &amp; Simulation (CFD/FEA)</span>
              <span class="job-meta-pill">Pune (Travel based on business meetings)</span>
              <span class="job-meta-pill">July 1, 2026</span>
              <span class="job-meta-pill job-type-pill">Full-time</span>
            </div>
          </div>
          <a class="job-apply-btn" href="/careers/business-development-manager-cfd">APPLY NOW</a>
        </div>
        <div class="job-row">
          <div class="job-row-info">
            <h3 class="job-row-title">Proposal Engineer</h3>
            <div class="job-row-meta">
              <span class="job-meta-pill">Technology Validation &amp; Scale-up Centre</span>
              <span class="job-meta-pill">Shirwal, Dist. - Satara. (Candidate should be willing to relocate)</span>
              <span class="job-meta-pill">March 26, 2026</span>
              <span class="job-meta-pill job-type-pill">Full-time</span>
            </div>
          </div>
          <a class="job-apply-btn" href="/careers/proposal-engineer">APPLY NOW</a>
        </div>
      </div>
    </section>
  </body>
</html>
`

test('Tridiagonal Solutions scraper validates the official careers page and extracts public openings', async () => {
  const tridiagonal = await loadTridiagonalSolutionsModule()

  assert.equal(tridiagonal.SOURCE, 'tridiagonalsolutions')
  assert.equal(tridiagonal.COMPANY, 'Tridiagonal Solutions Pvt Ltd')
  assert.equal(tridiagonal.CAREERS_URL, 'https://www.tridiagonal.com/careers')
  assert.equal(tridiagonal.hasOfficialCareersSignal(officialCareersHtml), true)

  assert.deepEqual(tridiagonal.extractOpenings(officialCareersHtml), [
    {
      title: 'Business Development Manager | AMS',
      department: 'Advanced Modeling & Simulation (CFD/FEA)',
      location: 'Pune (Travel based on business meetings), India',
      city: 'Pune',
      postingDate: 'July 1, 2026',
      employmentType: 'Full-time',
      sourceUrl: 'https://www.tridiagonal.com/careers/business-development-manager-cfd',
      applyUrl: 'https://www.tridiagonal.com/careers/business-development-manager-cfd',
      remoteStatus: 'On-site',
    },
    {
      title: 'Proposal Engineer',
      department: 'Technology Validation & Scale-up Centre',
      location: 'Shirwal, Dist. - Satara. (Candidate should be willing to relocate), India',
      city: 'Shirwal',
      postingDate: 'March 26, 2026',
      employmentType: 'Full-time',
      sourceUrl: 'https://www.tridiagonal.com/careers/proposal-engineer',
      applyUrl: 'https://www.tridiagonal.com/careers/proposal-engineer',
      remoteStatus: 'On-site',
    },
  ])
})

test('Tridiagonal Solutions run decorates the public openings with shared scraper metadata', async () => {
  const tridiagonal = await loadTridiagonalSolutionsModule()
  const requestedUrls = []

  const jobs = await tridiagonal.createTridiagonalSolutionsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return officialCareersHtml
    },
  })

  assert.deepEqual(requestedUrls, [tridiagonal.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Business Development Manager | AMS',
    department: 'Advanced Modeling & Simulation (CFD/FEA)',
    company: 'Tridiagonal Solutions Pvt Ltd',
    location: 'Pune (Travel based on business meetings), India',
    city: 'Pune',
    country: 'India',
    source: 'tridiagonalsolutions',
    jobId: 'tridiagonalsolutions-business-development-manager-cfd',
    requisitionId: 'tridiagonalsolutions-business-development-manager-cfd',
    sourceUrl: 'https://www.tridiagonal.com/careers/business-development-manager-cfd',
    applyUrl: 'https://www.tridiagonal.com/careers/business-development-manager-cfd',
    link: 'https://www.tridiagonal.com/careers/business-development-manager-cfd',
    employmentType: 'Full-time',
    postingDate: 'July 1, 2026',
    closingDate: null,
    preferredQualification: null,
    requiredSkills: [],
    jobDescription: null,
    remoteStatus: 'On-site',
    scrapedAt: jobs[0].scrapedAt,
  })
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
  assert.equal(jobs[1].jobId, 'tridiagonalsolutions-proposal-engineer')
})

test('Tridiagonal Solutions fails closed when the verified official careers surface changes', async () => {
  const tridiagonal = await loadTridiagonalSolutionsModule()

  await assert.rejects(
    tridiagonal.createTridiagonalSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified official public careers surface/i,
  )
})
