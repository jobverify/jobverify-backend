import assert from 'node:assert/strict'
import test from 'node:test'

const loadG7CrModule = async () => {
  try {
    return await import('../g7cr/script.js')
  } catch {
    assert.fail('Expected G7 CR scraper module at ../g7cr/script.js')
  }
}

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers - G7 CR Technologies | Noventiq</title>
      <link rel="canonical" href="https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-listings/">
    </head>
    <body>
      <main>
        <h1>Job Listings</h1>
        <p>Explore open positions across G7 CR Technologies.</p>
      </main>
    </body>
  </html>
`

const careersSitemapXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/associate-consultant-azure-bengaluru-india/</loc>
      <lastmod>2026-07-01</lastmod>
    </url>
    <url>
      <loc>https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/senior-data-engineer-hyderabad-india/</loc>
      <lastmod>2026-07-02</lastmod>
    </url>
    <url>
      <loc>https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/account-executive-dubai-uae/</loc>
      <lastmod>2026-07-03</lastmod>
    </url>
    <url>
      <loc>https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-listings/</loc>
      <lastmod>2026-07-04</lastmod>
    </url>
  </urlset>
`

test('G7 CR constants and verified careers signal stay pinned to the researched public careers site', async () => {
  const g7cr = await loadG7CrModule()

  assert.equal(g7cr.CAREERS_URL, 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-listings/')
  assert.equal(g7cr.CAREERS_SITEMAP_URL, 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/careers-sitemap.xml')
  assert.equal(g7cr.COMPANY, 'G7 CR Technologies')
  assert.equal(g7cr.SOURCE, 'g7cr')
  assert.equal(g7cr.hasOfficialCareersSignal(careersHtml), true)
})

test('extractJobsFromSitemap keeps only India detail pages and maps apply handoff anchors', async () => {
  const g7cr = await loadG7CrModule()

  assert.deepEqual(g7cr.extractJobsFromSitemap(careersSitemapXml), [
    {
      title: 'Associate Consultant Azure',
      company: 'G7 CR Technologies',
      department: null,
      location: 'Bengaluru, India',
      city: 'Bangalore',
      country: 'India',
      jobId: 'associate-consultant-azure-bengaluru-india',
      requisitionId: 'associate-consultant-azure-bengaluru-india',
      sourceUrl: 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/associate-consultant-azure-bengaluru-india/',
      applyUrl: 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/associate-consultant-azure-bengaluru-india/#career_detail',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-01',
      closingDate: null,
      jobDescription: null,
    },
    {
      title: 'Senior Data Engineer',
      company: 'G7 CR Technologies',
      department: null,
      location: 'Hyderabad, India',
      city: 'Hyderabad',
      country: 'India',
      jobId: 'senior-data-engineer-hyderabad-india',
      requisitionId: 'senior-data-engineer-hyderabad-india',
      sourceUrl: 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/senior-data-engineer-hyderabad-india/',
      applyUrl: 'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/senior-data-engineer-hyderabad-india/#career_detail',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-02',
      closingDate: null,
      jobDescription: null,
    },
  ])
})

test('run validates the official G7 careers page and decorates shared runner fields', async () => {
  const g7cr = await loadG7CrModule()
  const requestedUrls = []

  const jobs = await g7cr.createG7CrScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === g7cr.CAREERS_URL) return careersHtml
      if (url === g7cr.CAREERS_SITEMAP_URL) return careersSitemapXml
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-09T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-listings/',
    'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/careers-sitemap.xml',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'g7cr')
  assert.equal(
    jobs[0].link,
    'https://g7cr-site-dev-update-12-12-25.azurewebsites.net/job-details/associate-consultant-azure-bengaluru-india/#career_detail',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-09T00:00:00.000Z')
})

test('run fails closed when the official G7 careers page signal disappears', async () => {
  const g7cr = await loadG7CrModule()

  await assert.rejects(
    g7cr.createG7CrScraper().run({
      fetchText: async (url) => {
        if (url === g7cr.CAREERS_URL) return '<html><body>Unexpected page</body></html>'
        return careersSitemapXml
      },
    }),
    /official G7 CR careers page/i,
  )
})
