import assert from 'node:assert/strict'
import test from 'node:test'

const loadLixilModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected LIXIL scraper module at ./script.js')
  }
}

const officialCareersHtml = `
  <main>
    <h1>Careers</h1>
    <p>Apply directly on LinkedIn or on our dedicated regional career websites.</p>
    <a href="https://www.linkedin.com/company/lixil-global/jobs/">LinkedIn</a>
    <a href="https://www.lixil.co.jp/corporate/recruit/">Japan</a>
    <a href="https://careers.lixilamericas.com/">Americas</a>
  </main>
`

const searchResultsHtml = `
  <section class="two-pane-serp-page__results-list">
    <ul class="jobs-search__results-list">
      <li>
        <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4477001001">
          <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/senior-data-engineer-at-lixil-4477001001?position=1&amp;pageNum=0"></a>
          <div class="base-search-card__info">
            <h3 class="base-search-card__title">Senior Data Engineer</h3>
            <h4 class="base-search-card__subtitle">
              <a class="hidden-nested-link" href="https://www.linkedin.com/company/lixil-global/">LIXIL</a>
            </h4>
            <div class="base-search-card__metadata">
              <span class="job-search-card__location">Bengaluru, Karnataka, India</span>
              <time class="job-search-card__listdate" datetime="2026-07-09">1 day ago</time>
            </div>
          </div>
        </div>
      </li>
      <li>
        <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4477001002">
          <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/regional-specification-manager-at-lixil-4477001002?position=2&amp;pageNum=0"></a>
          <div class="base-search-card__info">
            <h3 class="base-search-card__title">Regional Specification Manager</h3>
            <h4 class="base-search-card__subtitle">
              <a class="hidden-nested-link" href="https://www.linkedin.com/company/lixil-global/">LIXIL</a>
            </h4>
            <div class="base-search-card__metadata">
              <span class="job-search-card__location">London Area, United Kingdom</span>
              <time class="job-search-card__listdate" datetime="2026-07-10">5 hours ago</time>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </section>
`

const detailHtml = `
  <html>
    <head>
      <title>LIXIL hiring Senior Data Engineer in Bengaluru, Karnataka, India | LinkedIn</title>
      <script type="application/ld+json">
        {
          "@context": "http://schema.org",
          "@type": "JobPosting",
          "datePosted": "2026-07-09T05:45:00.000Z",
          "employmentType": "FULL_TIME",
          "description": "&lt;p&gt;Build analytics pipelines and platform tooling for digital teams.&lt;/p&gt;",
          "title": "Senior Data Engineer",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "LIXIL"
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bengaluru",
              "addressRegion": "Karnataka",
              "addressCountry": "IN"
            }
          }
        }
      </script>
    </head>
    <body></body>
  </html>
`

test('LIXIL scraper validates the official careers handoff and keeps only India jobs from LinkedIn', async () => {
  const lixil = await loadLixilModule()

  assert.equal(lixil.pageIndicatesOfficialCareersHandoff(officialCareersHtml), true)

  const jobs = lixil.extractSearchResults(searchResultsHtml)
  assert.equal(jobs.length, 1)
  assert.deepEqual(jobs[0], {
    title: 'Senior Data Engineer',
    company: 'LIXIL',
    department: null,
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: '4477001001',
    requisitionId: '4477001001',
    sourceUrl: 'https://www.linkedin.com/jobs/view/senior-data-engineer-at-lixil-4477001001?position=1&pageNum=0',
    applyUrl: 'https://www.linkedin.com/jobs/view/senior-data-engineer-at-lixil-4477001001?position=1&pageNum=0',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-07-09',
    closingDate: null,
    jobDescription: null,
  })
})

test('LIXIL scraper enriches a LinkedIn job detail page via JobPosting JSON-LD', async () => {
  const lixil = await loadLixilModule()

  const detail = lixil.extractJobDetail(detailHtml)
  assert.deepEqual(detail, {
    company: 'LIXIL',
    location: 'Bengaluru, Karnataka, IN',
    city: 'Bengaluru',
    country: 'India',
    employmentType: 'Full-time',
    postingDate: '2026-07-09',
    jobDescription: 'Build analytics pipelines and platform tooling for digital teams.',
  })
})

test('LIXIL scraper follows the official careers page to LinkedIn and decorates India jobs', async () => {
  const lixil = await loadLixilModule()
  const requestedUrls = []

  const jobs = await lixil.createLixilScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === lixil.CAREER_PAGE_URL) return officialCareersHtml
      if (url === lixil.LINKEDIN_COMPANY_JOBS_URL) return searchResultsHtml
      if (url.startsWith('https://www.linkedin.com/jobs/view/senior-data-engineer-at-lixil-4477001001')) {
        return detailHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    lixil.CAREER_PAGE_URL,
    lixil.LINKEDIN_COMPANY_JOBS_URL,
    'https://www.linkedin.com/jobs/view/senior-data-engineer-at-lixil-4477001001?position=1&pageNum=0',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'lixil')
  assert.equal(jobs[0].company, 'LIXIL')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].link, 'https://www.linkedin.com/jobs/view/senior-data-engineer-at-lixil-4477001001?position=1&pageNum=0')
})
