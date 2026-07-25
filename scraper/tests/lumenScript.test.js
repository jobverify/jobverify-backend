import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadLumenModule = async () => {
  try {
    return await import('../lumen/script.js')
  } catch {
    assert.fail('Expected Lumen scraper module at ../lumen/script.js')
  }
}

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>AI-Ready Networking & Secure Cloud Solutions | Lumen Technologies</title>
  </head>
  <body>
    <main>
      <a href="https://careers.lumen.com/careers?sort_by=hot&start=0">VIEW CAREERS</a>
      <p>AI-Ready Networking & Secure Cloud Solutions</p>
    </main>
  </body>
</html>
`

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Lumen Technologies</title>
  </head>
  <body>
    <main>
      <h1>Challenge Accepted.</h1>
      <h2>Build the Future.</h2>
      <p>View All Jobs</p>
      <script type="application/json" id="lumen-jobs-data">
        ${JSON.stringify({
          items: [
            {
              title: 'Senior Network Engineer',
              publicationDate: '2026-07-08T00:00:00Z',
              url: 'https://careers.lumen.com/careers/job/senior-network-engineer/12345',
              applyNowUrl: 'https://careers.lumen.com/careers/apply/12345',
              location: 'Bengaluru, Karnataka, India',
              primaryLocation: 'Bengaluru, India',
              jobType: 'Full time',
              contractType: 'Regular',
              experience: 'Experienced',
              jobFunction: 'Engineering & Science',
            },
            {
              title: 'Solutions Architect',
              publicationDate: '2026-07-08T00:00:00Z',
              url: 'https://careers.lumen.com/careers/job/solutions-architect/98765',
              applyNowUrl: 'https://careers.lumen.com/careers/apply/98765',
              location: 'Denver, Colorado, United States',
              primaryLocation: 'Denver, United States',
              jobType: 'Full time',
              contractType: 'Regular',
              experience: 'Experienced',
              jobFunction: 'Sales, Marketing & Product Management',
            },
          ],
          loadMore: true,
          totalNumber: 2238,
        })}
      </script>
    </main>
  </body>
</html>
`

test('getScraperCatalog includes Lumen as an official-company-careers provider', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'lumen')

  assert.ok(provider)
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'official-company-careers')
  assert.equal(provider.companyName, 'Lumen Technologies')
  assert.equal(provider.companyCareerPage, 'https://careers.lumen.com/careers?sort_by=hot&start=0')
  assert.equal(provider.companyDomain, 'lumen.com')
  assert.match(provider.modulePath, /lumen[\\/]script\.js$/i)
})

test('createLumenScraper validates the official homepage and extracts India jobs from the careers surface', async () => {
  const lumen = await loadLumenModule()

  assert.equal(lumen.HOMEPAGE_URL, 'https://www.lumen.com/en-us/home.html')
  assert.equal(lumen.CAREERS_URL, 'https://careers.lumen.com/careers?sort_by=hot&start=0')
  assert.equal(lumen.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(lumen.hasVerifiedCareersSignal(CAREERS_HTML), true)

  const requestedUrls = []
  const jobs = await lumen.createLumenScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === lumen.HOMEPAGE_URL) return HOMEPAGE_HTML
      if (url === lumen.CAREERS_URL) return CAREERS_HTML
      throw new Error(`Unexpected Lumen URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    lumen.HOMEPAGE_URL,
    lumen.CAREERS_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(
    {
      title: jobs[0].title,
      company: jobs[0].company,
      location: jobs[0].location,
      city: jobs[0].city,
      country: jobs[0].country,
      source: jobs[0].source,
      sourceUrl: jobs[0].sourceUrl,
      applyUrl: jobs[0].applyUrl,
      link: jobs[0].link,
      department: jobs[0].department,
      employmentType: jobs[0].employmentType,
      experienceRequired: jobs[0].experienceRequired,
      postingDate: jobs[0].postingDate,
      requiredSkills: jobs[0].requiredSkills,
    },
    {
      title: 'Senior Network Engineer',
      company: 'Lumen Technologies',
      location: 'Bengaluru, Karnataka, India',
      city: 'Bengaluru',
      country: 'India',
      source: 'lumen',
      sourceUrl: 'https://careers.lumen.com/careers/job/senior-network-engineer/12345',
      applyUrl: 'https://careers.lumen.com/careers/apply/12345',
      link: 'https://careers.lumen.com/careers/apply/12345',
      department: 'Engineering & Science',
      employmentType: 'Full-time',
      experienceRequired: 'Experienced',
      postingDate: '2026-07-08',
      requiredSkills: [],
    },
  )
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
