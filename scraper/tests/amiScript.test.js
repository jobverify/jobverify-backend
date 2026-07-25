import assert from 'node:assert/strict'
import test from 'node:test'

const loadAmiModule = async () => {
  try {
    return await import('../ami/script.js')
  } catch {
    assert.fail('Expected AMI scraper module at ../scraper/ami/script.js')
  }
}

const sampleCompanyHtml = `
<html>
  <head><title>AMI | LinkedIn</title></head>
  <body>
    <meta content="urn:li:organization:635771">
  </body>
</html>
`

const sampleSearchHtml = `
<div class="base-card base-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4445556667">
  <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/firmware-engineer-at-ami-4445556667?trk=public_jobs_topcard-title">
    <h3 class="base-search-card__title">Firmware Engineer</h3>
  </a>
  <h4 class="base-search-card__subtitle">
    <a>AMI</a>
  </h4>
  <span class="job-search-card__location">Chennai, Tamil Nadu, India</span>
  <time class="job-search-card__listdate" datetime="2026-06-26"></time>
</div>
`

const sampleDetailHtml = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Firmware Engineer",
  "description": "<p>Build firmware and low-level platform software for AMI products.</p>",
  "datePosted": "2026-06-26",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "AMI"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Chennai",
      "addressRegion": "Tamil Nadu",
      "addressCountry": "IN"
    }
  }
}
</script>
`

test('extractSearchResults maps AMI LinkedIn guest results into conservative job records', async () => {
  const ami = await loadAmiModule()
  const listings = ami.extractSearchResults(sampleSearchHtml)
  const detail = ami.extractJobDetail(sampleDetailHtml)

  assert.equal(ami.pageIndicatesAmiCompany(sampleCompanyHtml), true)
  assert.equal(listings.length, 1)
  assert.deepEqual(
    {
      ...listings[0],
      ...Object.fromEntries(
        Object.entries(detail).filter(([, value]) => value != null),
      ),
    },
    {
      title: 'Firmware Engineer',
      company: 'AMI',
      department: null,
      location: 'Chennai, Tamil Nadu, India',
      city: 'Chennai',
      country: 'India',
      jobId: '4445556667',
      requisitionId: '4445556667',
      sourceUrl: 'https://www.linkedin.com/jobs/view/firmware-engineer-at-ami-4445556667?trk=public_jobs_topcard-title',
      applyUrl: 'https://www.linkedin.com/jobs/view/firmware-engineer-at-ami-4445556667?trk=public_jobs_topcard-title',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-26',
      closingDate: null,
      jobDescription: 'Build firmware and low-level platform software for AMI products.',
    },
  )
})

test('run fetches AMI company, search, and detail pages and decorates openings', async () => {
  const ami = await loadAmiModule()
  const requestedUrls = []
  const scraper = ami.createAmiScraper({ maxJobs: 1 })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === ami.LINKEDIN_COMPANY_PAGE_URL) return sampleCompanyHtml
      if (url === ami.LINKEDIN_INDIA_JOBS_URL) return sampleSearchHtml
      if (url === 'https://www.linkedin.com/jobs/view/firmware-engineer-at-ami-4445556667?trk=public_jobs_topcard-title') {
        return sampleDetailHtml
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(
    requestedUrls,
    [
      ami.LINKEDIN_COMPANY_PAGE_URL,
      ami.LINKEDIN_INDIA_JOBS_URL,
      'https://www.linkedin.com/jobs/view/firmware-engineer-at-ami-4445556667?trk=public_jobs_topcard-title',
    ],
  )
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'ami')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
