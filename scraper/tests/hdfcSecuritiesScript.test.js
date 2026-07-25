import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-16T00:00:00.000Z'

const officialHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Open Trading Account Online &amp; Invest in Stock, MF, IPO &amp; More with HDFC Securities</title>
  </head>
  <body>
    <footer>
      <a href="https://www.hdfcsec.com/Careers" target="_blank" class="footerLink">Careers</a>
    </footer>
  </body>
</html>
`

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Online Stock Market Trading and Investment in India with HDFC securities</title>
    <link rel="canonical" href="careers">
  </head>
  <body>
    <main>
      <a href="https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/home" target="_self">
        Explore roles
      </a>
      <p>For more details write us on our recruitment mailbox.</p>
    </main>
  </body>
</html>
`

const listingPayload = {
  status: 'success',
  job_counts: 2,
  data: [
    {
      id: 'a6a5616194c0d5',
      title: 'Product Manager',
      department_name: 'Digital Business',
      locations: 'Mumbai, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Permanent',
      experience: '5 - 8 Years',
      posted_on: '14-Jul-2026',
      jd: '<p>Own the product roadmap across investor journeys.</p>',
    },
    {
      id: 'a6a1f9d92c4797',
      title: 'Business Analyst',
      department_name: 'Enterprise Analytics',
      locations: 'Thane, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Permanent',
      experience: '3 - 6 Years',
      posted_on: '03-Jun-2026',
      jd: '<p>Translate business asks into actionable reporting requirements.</p>',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../hdfcsecurities/script.js')
  } catch {
    assert.fail('Expected HDFC Securities scraper module at ../hdfcsecurities/script.js')
  }
}

test('HDFC Securities pins the verified first-party homepage, careers handoff, and Darwinbox routes', async () => {
  const hdfcSecurities = await loadModule()

  assert.equal(hdfcSecurities.COMPANY_NAME, 'HDFC Securities')
  assert.equal(hdfcSecurities.SOURCE, 'hdfcsecurities')
  assert.equal(hdfcSecurities.OFFICIAL_BRAND_NAME, 'HDFC securities')
  assert.equal(hdfcSecurities.VERIFIED_ON, '2026-07-16')
  assert.equal(hdfcSecurities.HOMEPAGE_URL, 'https://www.hdfcsec.com/')
  assert.equal(hdfcSecurities.OFFICIAL_CAREERS_URL, 'https://www.hdfcsec.com/Careers')
  assert.equal(
    hdfcSecurities.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/home',
  )
  assert.equal(
    hdfcSecurities.PUBLIC_ALL_JOBS_URL,
    'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    hdfcSecurities.LISTING_API_URL,
    'https://hdfcsecurities.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )
  assert.equal(hdfcSecurities.hasOfficialHomepageSignal(officialHomepageHtml), true)
  assert.equal(hdfcSecurities.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(
    hdfcSecurities.extractOfficialDarwinboxUrl(officialCareersHtml),
    'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/home',
  )
})

test('HDFC Securities run validates the verified first-party pages and returns Darwinbox India jobs', async () => {
  const hdfcSecurities = await loadModule()
  const requestedPages = []
  const requestedListingCalls = []

  const jobs = await hdfcSecurities.createHdfcSecuritiesScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === hdfcSecurities.HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          html: officialHomepageHtml,
        }
      }

      if (url === hdfcSecurities.OFFICIAL_CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      throw new Error(`Unexpected HDFC Securities page URL: ${url}`)
    },
    fetchListingPage: async (request) => {
      requestedListingCalls.push(request)
      return listingPayload
    },
  })

  assert.deepEqual(requestedPages, [
    hdfcSecurities.HOMEPAGE_URL,
    hdfcSecurities.OFFICIAL_CAREERS_URL,
  ])
  assert.deepEqual(requestedListingCalls, [
    { page: 1, pageSize: 10, companyId: 'main' },
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Product Manager',
      company: 'HDFC Securities',
      department: 'Digital Business',
      location: 'Mumbai, Maharashtra, India',
      city: 'Mumbai',
      jobId: 'a6a5616194c0d5',
      requisitionId: null,
      sourceUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a5616194c0d5',
      applyUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a5616194c0d5',
      employmentType: 'Permanent',
      experienceRequired: '5 - 8 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '14-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Own the product roadmap across investor journeys.</p>',
      source: 'hdfcsecurities',
      link: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a5616194c0d5',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Business Analyst',
      company: 'HDFC Securities',
      department: 'Enterprise Analytics',
      location: 'Thane, Maharashtra, India',
      city: 'Thane',
      jobId: 'a6a1f9d92c4797',
      requisitionId: null,
      sourceUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a1f9d92c4797',
      applyUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a1f9d92c4797',
      employmentType: 'Permanent',
      experienceRequired: '3 - 6 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '03-Jun-2026',
      closingDate: null,
      jobDescription: '<p>Translate business asks into actionable reporting requirements.</p>',
      source: 'hdfcsecurities',
      link: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a1f9d92c4797',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})
