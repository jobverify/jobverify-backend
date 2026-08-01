import assert from 'node:assert/strict'
import test from 'node:test'

const loadMuSigmaModule = async () => {
  try {
    return await import('../../scraper/musigma/script.js')
  } catch {
    assert.fail('Expected Mu Sigma scraper module at ../../scraper/musigma/script.js')
  }
}

const sampleOfficialCareersHtml = `
<html>
  <head><title>Careers | Mu Sigma</title></head>
  <body>
    <h1>Build what matters at Mu Sigma</h1>
    <a href="https://www.linkedin.com/jobs/search/?f_C=37734&geoId=102713980">Explore current openings</a>
  </body>
</html>
`

const sampleSearchHtml = `
<div class="base-card base-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4432100001">
  <a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/senior-data-engineer-at-mu-sigma-4432100001?position=1&amp;pageNum=0">
    <h3 class="base-search-card__title">Senior Data Engineer</h3>
  </a>
  <h4 class="base-search-card__subtitle">
    <a>Mu Sigma</a>
  </h4>
  <span class="job-search-card__location">Bengaluru, Karnataka, India</span>
  <time class="job-search-card__listdate" datetime="2026-07-08"></time>
</div>
<div class="base-card base-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4432100999">
  <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/us-market-role-4432100999">
    <h3 class="base-search-card__title">US Market Role</h3>
  </a>
  <h4 class="base-search-card__subtitle">
    <a>Mu Sigma</a>
  </h4>
  <span class="job-search-card__location">Chicago, Illinois, United States</span>
  <time class="job-search-card__listdate" datetime="2026-07-08"></time>
</div>
`

const sampleDetailHtml = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Senior Data Engineer",
  "description": "<p>Build decision sciences data products for global enterprise clients.</p>",
  "datePosted": "2026-07-08",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Mu Sigma"
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
`

test('Mu Sigma constants stay pinned to the verified official careers and LinkedIn search surfaces', async () => {
  const musigma = await loadMuSigmaModule()

  assert.equal(musigma.OFFICIAL_CAREERS_URL, 'https://www.mu-sigma.com/career/')
  assert.equal(musigma.LINKEDIN_INDIA_JOBS_URL, 'https://www.linkedin.com/jobs/search/?f_C=37734&geoId=102713980')
  assert.equal(musigma.COMPANY, 'Mu Sigma')
  assert.equal(musigma.SOURCE, 'musigma')
  assert.equal(musigma.hasOfficialCareersSignal(sampleOfficialCareersHtml), true)
})

test('extractSearchResults keeps only India roles from the Mu Sigma LinkedIn guest search page', async () => {
  const musigma = await loadMuSigmaModule()
  const listings = musigma.extractSearchResults(sampleSearchHtml)
  const detail = musigma.extractJobDetail(sampleDetailHtml)

  assert.equal(listings.length, 1)
  assert.deepEqual(
    {
      ...listings[0],
      ...Object.fromEntries(
        Object.entries(detail).filter(([, value]) => value != null),
      ),
    },
    {
      title: 'Senior Data Engineer',
      company: 'Mu Sigma',
      department: null,
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: '4432100001',
      requisitionId: '4432100001',
      sourceUrl: 'https://in.linkedin.com/jobs/view/senior-data-engineer-at-mu-sigma-4432100001?position=1&pageNum=0',
      applyUrl: 'https://in.linkedin.com/jobs/view/senior-data-engineer-at-mu-sigma-4432100001?position=1&pageNum=0',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-08',
      closingDate: null,
      jobDescription: 'Build decision sciences data products for global enterprise clients.',
    },
  )
})

test('run validates the official Mu Sigma careers page and decorates LinkedIn openings', async () => {
  const musigma = await loadMuSigmaModule()
  const requestedUrls = []

  const jobs = await musigma.createMuSigmaScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === musigma.OFFICIAL_CAREERS_URL) return sampleOfficialCareersHtml
      if (url === musigma.LINKEDIN_INDIA_JOBS_URL) return sampleSearchHtml
      if (url === 'https://in.linkedin.com/jobs/view/senior-data-engineer-at-mu-sigma-4432100001?position=1&pageNum=0') {
        return sampleDetailHtml
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-09T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://www.mu-sigma.com/career/',
    'https://www.linkedin.com/jobs/search/?f_C=37734&geoId=102713980',
    'https://in.linkedin.com/jobs/view/senior-data-engineer-at-mu-sigma-4432100001?position=1&pageNum=0',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'musigma')
  assert.equal(
    jobs[0].link,
    'https://in.linkedin.com/jobs/view/senior-data-engineer-at-mu-sigma-4432100001?position=1&pageNum=0',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-09T00:00:00.000Z')
})
