import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const OFFICIAL_SITE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Online shopping for Men, Women &amp; Kids Fashion, Home Decor, lifestyle &amp; More</title>
  </head>
  <body>
    <main>
      <div>FREE Delivery</div>
      <div>7 Days Easy Returns</div>
      <div>Best Prices</div>
      <section>
        <h2>Company</h2>
        <a href="https://snapdeal.darwinbox.in/ms/candidate/careers">Careers</a>
        <a href="https://blog.snapdeal.com/">Blog</a>
      </section>
      <p>Snapdeal is India's leading pure-play value Ecommerce platform.</p>
      <p>Snapdeal's vision is to enable the shoppers of Bharat to experience the joy of living their aspirations.</p>
      <p>Copyright © 2021, Acevector Limited. All Rights Reserved</p>
    </main>
  </body>
</html>
`

const LISTING_PAYLOAD = {
  job_counts: 2,
  data: [
    {
      id: 'snap-001',
      title: 'Growth Manager',
      department_name: 'Marketing',
      locations: 'Gurugram, Haryana, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '4 - 6 Years',
      posted_on: '17-Jul-2026',
      jd: '<p>Own growth levers for value commerce.</p>',
    },
    {
      id: 'snap-nonindia-001',
      title: 'Regional Seller Manager',
      department_name: 'Business',
      locations: 'Dubai, UAE',
      country: 'United Arab Emirates',
      emp_type_name: 'Full Time',
      experience: '5 - 7 Years',
      posted_on: '17-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../snapdeal/script.js')
  } catch {
    assert.fail('Expected Snapdeal scraper module at ../snapdeal/script.js')
  }
}

test('Snapdeal pins the verified homepage footer handoff before Darwinbox scraping begins', async () => {
  const snapdeal = await loadModule()

  assert.equal(snapdeal.SOURCE, 'snapdeal')
  assert.equal(snapdeal.COMPANY_NAME, 'Snapdeal')
  assert.equal(snapdeal.OFFICIAL_BRAND_NAME, 'Snapdeal')
  assert.equal(snapdeal.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(snapdeal.DARWINBOX_ORIGIN, 'https://snapdeal.darwinbox.in')
  assert.equal(snapdeal.OFFICIAL_CAREERS_URL, 'https://www.snapdeal.com/')
  assert.equal(
    snapdeal.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://snapdeal.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    snapdeal.PUBLIC_PORTAL_URL,
    'https://snapdeal.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    snapdeal.extractOfficialDarwinboxUrl(OFFICIAL_SITE_HTML),
    snapdeal.OFFICIAL_CAREERS_HANDOFF_URL,
  )
  assert.equal(snapdeal.hasOfficialSnapdealCareersSignals(OFFICIAL_SITE_HTML), true)
  assert.equal(
    snapdeal.hasOfficialSnapdealCareersSignals(
      OFFICIAL_SITE_HTML.replace(
        'https://snapdeal.darwinbox.in/ms/candidate/careers',
        'https://example.com/jobs',
      ),
    ),
    false,
  )
})

test('Snapdeal run validates the official homepage handoff before mapping India Darwinbox jobs', async () => {
  const { createSnapdealScraper } = await loadModule()
  const requestedPages = []
  const scraper = createSnapdealScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedPages.push(url)
      return OFFICIAL_SITE_HTML
    },
    fetchListingPage: async ({ page }) => {
      assert.equal(page, 1)
      return LISTING_PAYLOAD
    },
  })

  assert.deepEqual(requestedPages, ['https://www.snapdeal.com/'])
  assert.deepEqual(jobs, [
    {
      title: 'Growth Manager',
      company: 'Snapdeal',
      department: 'Marketing',
      location: 'Gurugram, Haryana, India',
      city: 'Gurugram',
      jobId: 'snap-001',
      requisitionId: null,
      sourceUrl: 'https://snapdeal.darwinbox.in/ms/candidatev2/main/careers/jobDetails/snap-001',
      applyUrl: 'https://snapdeal.darwinbox.in/ms/candidatev2/main/careers/jobDetails/snap-001',
      employmentType: 'Full Time',
      experienceRequired: '4 - 6 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '17-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Own growth levers for value commerce.</p>',
      source: 'snapdeal',
      link: 'https://snapdeal.darwinbox.in/ms/candidatev2/main/careers/jobDetails/snap-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Snapdeal fails closed when the verified homepage careers handoff drifts', async () => {
  const { createSnapdealScraper } = await loadModule()
  const scraper = createSnapdealScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async () => OFFICIAL_SITE_HTML.replace(
        'https://snapdeal.darwinbox.in/ms/candidate/careers',
        'https://example.com/jobs',
      ),
      fetchListingPage: async () => LISTING_PAYLOAD,
    }),
    /verified official careers page/i,
  )
})
