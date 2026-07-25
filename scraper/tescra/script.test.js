import assert from 'node:assert/strict'
import test from 'node:test'

const loadTescraModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>TESCRA | Engineering the future</title>
  </head>
  <body>
    <header>
      <a href="https://www.tescra.com/">Home</a>
      <a href="https://www.tescra.com/about-us/">About</a>
      <a href="https://www.tescra.com/careers/">Careers</a>
    </header>
    <main>
      <h1>TESCRA</h1>
      <p>Engineering services and digital transformation solutions.</p>
    </main>
  </body>
</html>
`

const linkedinCompanyHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>TESCRA | LinkedIn</title>
  </head>
  <body>
    <h1>TESCRA</h1>
    <p>IT Services and IT Consulting</p>
    <a href="https://www.tescra.com/">Website</a>
  </body>
</html>
`

const linkedinFeedHtml = `
<article data-urn="urn:li:activity:1">
  <a href="https://www.linkedin.com/posts/tescra_hiring-salesforce-developer-activity-111">
    TESCRA's Post
  </a>
  <div class="feed-shared-update-v2__description">
    TESCRA is hiring now.
    Position: Salesforce Developer
    Location: Pune
    Employment Type: Full Time
    <a href="https://lnkd.in/tescra-salesforce">Apply Now</a>
  </div>
</article>
<article data-urn="urn:li:activity:2">
  <a href="https://www.linkedin.com/posts/tescra_culture-update-activity-222">
    TESCRA's Post
  </a>
  <div class="feed-shared-update-v2__description">
    Celebrating our delivery milestone this week.
  </div>
</article>
<article data-urn="urn:li:activity:3">
  <a href="https://www.linkedin.com/posts/tescra_hiring-cloud-architect-activity-333">
    TESCRA's Post
  </a>
  <div class="feed-shared-update-v2__description">
    We are hiring across engineering.
    Position: Cloud Architect
    Location: Bengaluru / Hybrid
    Employment Type: Contract
    <a href="https://lnkd.in/tescra-cloud">Apply here</a>
  </div>
</article>
`

test('TESCRA scraper recognizes the verified homepage, LinkedIn company page, and hiring-post feed', async () => {
  const tescra = await loadTescraModule()
  assert.ok(tescra, 'Expected scraper module at ./script.js')

  assert.equal(tescra.SOURCE, 'tescra')
  assert.equal(tescra.COMPANY, 'TESCRA')
  assert.equal(tescra.HOMEPAGE_URL, 'https://www.tescra.com/')
  assert.equal(tescra.LINKEDIN_COMPANY_URL, 'https://www.linkedin.com/company/tescra')
  assert.equal(tescra.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(tescra.pageIndicatesTescraLinkedinCompany(linkedinCompanyHtml), true)
  assert.deepEqual(tescra.extractJobPostings(linkedinFeedHtml), [
    {
      title: 'Salesforce Developer',
      company: 'TESCRA',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      employmentType: 'Full Time',
      sourceUrl: 'https://www.linkedin.com/posts/tescra_hiring-salesforce-developer-activity-111',
      applyUrl: 'https://lnkd.in/tescra-salesforce',
      jobDescription: 'TESCRA is hiring now.',
      remoteStatus: 'On-site',
    },
    {
      title: 'Cloud Architect',
      company: 'TESCRA',
      location: 'Bengaluru / Hybrid, India',
      city: 'Bengaluru',
      country: 'India',
      employmentType: 'Contract',
      sourceUrl: 'https://www.linkedin.com/posts/tescra_hiring-cloud-architect-activity-333',
      applyUrl: 'https://lnkd.in/tescra-cloud',
      jobDescription: 'We are hiring across engineering.',
      remoteStatus: 'Hybrid',
    },
  ])
})

test('TESCRA scraper run() fetches the official homepage and public LinkedIn company feed and returns only hiring posts', async () => {
  const tescra = await loadTescraModule()
  assert.ok(tescra, 'Expected scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await tescra.createTescraScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === tescra.HOMEPAGE_URL) return homepageHtml
      if (url === tescra.LINKEDIN_COMPANY_URL) return `${linkedinCompanyHtml}${linkedinFeedHtml}`
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    tescra.HOMEPAGE_URL,
    tescra.LINKEDIN_COMPANY_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'tescra')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('TESCRA scraper fails closed when the verified public surface drifts', async () => {
  const tescra = await loadTescraModule()
  assert.ok(tescra, 'Expected scraper module at ./script.js')

  await assert.rejects(
    tescra.createTescraScraper().run({
      fetchText: async (url) => {
        if (url === tescra.HOMEPAGE_URL) {
          return '<html><body><h1>Unexpected</h1></body></html>'
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    tescra.createTescraScraper().run({
      fetchText: async (url) => {
        if (url === tescra.HOMEPAGE_URL) return homepageHtml
        if (url === tescra.LINKEDIN_COMPANY_URL) return '<html><body><h1>Unknown company</h1></body></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified linkedin company page/i,
  )
})
