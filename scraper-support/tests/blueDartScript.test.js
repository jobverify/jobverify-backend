import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Blue Dart</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>For more information on job opportunities <a href="https://careers.dhl.com/global/en/search-results?selected_fields=%7b%22businessUnit%22:%5b%22eCommerce%20Solutions%22%5d,%22country%22:%5b%22India%22%5d%7d">Click Here</a></p>
    </main>
  </body>
</html>
`

const OFFICIAL_PORTAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Blue Dart Express Limited- India’s Most Innovative and Awarded Express logistics company. - Bluedart</title>
  </head>
  <body>
    <main>
      <p>Sign in</p>
      <nav>Investors Careers About Us</nav>
      <p>Blue Dart Express Limited- India’s Most Innovative and Awarded Express logistics company.</p>
    </main>
  </body>
</html>
`

const SEARCH_RESULTS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Search Results | DHL Careers</title>
  </head>
  <body>
    <script>
      var phApp = phApp || {};
      phApp.ddo = {
        "siteConfig": {
          "data": {
            "widgetApiEndpoint": "https://careers.dhl.com/widgets"
          }
        },
        "eagerLoadRefineSearch": {
          "totalHits": 1,
          "hits": 1,
          "jobs": [
            {
              "reqId": "250261",
              "jobId": "250261",
              "title": "Supervisor - Operations",
              "country": "India",
              "cityStateCountry": "Mumbai, India",
              "location": "Mumbai, India",
              "category": "Operations",
              "type": "Permanent",
              "descriptionTeaser": "Support ground operations and delivery performance.",
              "postedDate": "2026-07-10",
              "applyUrl": "https://careers.dhl.com/global/en/job/250261",
              "ml_skills": ["operations", "logistics"]
            }
          ],
          "aggregations": [
            { "field": "country", "value": { "India": 1 } }
          ]
        }
      };
    </script>
    <script>
      var phApp = phApp || {"cdnUrl":"https://cdn.phenompeople.com/CareerConnectResources","phenomTrackURL":"careers.dhl.com/global/en/phenomtrack.min.js"};
    </script>
  </body>
</html>
`

const NO_RESULTS_SEARCH_RESULTS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Search Results | DHL Careers</title>
  </head>
  <body>
    <script>
      var phApp = phApp || {};
      phApp.ddo = {
        "siteConfig": {
          "data": {
            "widgetApiEndpoint": "https://careers.dhl.com/widgets"
          }
        },
        "eagerLoadRefineSearch": {
          "totalHits": 0,
          "hits": 0,
          "jobs": [],
          "aggregations": [
            { "field": "country", "value": {} }
          ]
        }
      };
    </script>
    <script>
      var phApp = phApp || {"cdnUrl":"https://cdn.phenompeople.com/CareerConnectResources","phenomTrackURL":"careers.dhl.com/global/en/phenomtrack.min.js"};
    </script>
    <main>
      <h1>SEARCH RESULTS</h1>
      <p>No results for "India"</p>
      <p>Why don't you join the DHL Talent Community?</p>
    </main>
  </body>
</html>
`

const JOB_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="https://careers.dhl.com/global/en/job/250261/Supervisor-Operations" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Supervisor - Operations",
        "description": "<p>Support ground operations and delivery performance.</p><p><strong>Required Skills</strong></p><ul><li>Operations</li><li>Logistics</li></ul>",
        "datePosted": "2026-07-10",
        "employmentType": "FULL_TIME",
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Mumbai",
            "addressCountry": "India"
          }
        }
      }
    </script>
    <script>
      var phApp = phApp || {};
      phApp.ddo = {
        "jobDetail": {
          "data": {
            "job": {
              "jobId": "250261",
              "reqId": "250261",
              "title": "Supervisor - Operations",
              "category": "Operations",
              "type": "Permanent",
              "applyUrl": "https://careers.dhl.com/global/en/job/250261",
              "ml_Description": "<p>Support ground operations and delivery performance.</p>",
              "experience_sentences": ["4+ years experience in logistics operations."],
              "education_sentences": ["Bachelor's degree required."],
              "skills_sentences": ["Operations", "Logistics"],
              "postedDate": "2026-07-10"
            }
          }
        }
      };
    </script>
  </head>
  <body></body>
</html>
`

const JOB_DETAIL_NO_EXPERIENCE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <link rel="canonical" href="https://careers.dhl.com/global/en/job/250261/Supervisor-Operations" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Supervisor - Operations",
        "description": "<p>Support ground operations and delivery performance.</p><p><strong>Required Skills</strong></p><ul><li>Operations</li><li>Logistics</li></ul>",
        "datePosted": "2026-07-10",
        "employmentType": "FULL_TIME",
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Mumbai",
            "addressCountry": "India"
          }
        }
      }
    </script>
    <script>
      var phApp = phApp || {};
      phApp.ddo = {
        "jobDetail": {
          "data": {
            "job": {
              "jobId": "250261",
              "reqId": "250261",
              "title": "Supervisor - Operations",
              "category": "Operations",
              "type": "Permanent",
              "applyUrl": "https://careers.dhl.com/global/en/job/250261",
              "ml_Description": "<p>Support ground operations and delivery performance.</p>",
              "experience_sentences": [],
              "education_sentences": ["Bachelor's degree required."],
              "skills_sentences": ["Operations", "Logistics"],
              "postedDate": "2026-07-10"
            }
          }
        }
      };
    </script>
  </head>
  <body></body>
</html>
`

const loadBlueDartModule = async () => {
  try {
    return await import('../../scraper/bluedart/script.js')
  } catch {
    assert.fail('Expected Blue Dart scraper module at ../../scraper/bluedart/script.js')
  }
}

test('buildSearchResultsPageUrl keeps Blue Dart on the verified DHL Phenom search route', async () => {
  const blueDart = await loadBlueDartModule()

  assert.equal(blueDart.CAREERS_URL, 'https://www.bluedart.com/careers')
  assert.equal(
    blueDart.SEARCH_RESULTS_URL,
    'https://careers.dhl.com/global/en/search-results?selected_fields=%7B%22businessUnit%22%3A%5B%22eCommerce+Solutions%22%5D%2C%22country%22%3A%5B%22India%22%5D%7D',
  )
  assert.equal(blueDart.hasOfficialCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(blueDart.hasOfficialSearchResultsSignal(SEARCH_RESULTS_HTML), true)
  assert.equal(
    blueDart.buildSearchResultsPageUrl(),
    'https://careers.dhl.com/global/en/search-results?selected_fields=%7B%22businessUnit%22%3A%5B%22eCommerce+Solutions%22%5D%2C%22country%22%3A%5B%22India%22%5D%7D',
  )
  assert.equal(
    blueDart.buildSearchResultsPageUrl(20),
    'https://careers.dhl.com/global/en/search-results?selected_fields=%7B%22businessUnit%22%3A%5B%22eCommerce+Solutions%22%5D%2C%22country%22%3A%5B%22India%22%5D%7D&from=20',
  )
})

test('run keeps Blue Dart on the verified handoff path and decorates shared runner fields', async () => {
  const blueDart = await loadBlueDartModule()
  const requestedUrls = []

  const jobs = await blueDart.createBlueDartScraper().run({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === blueDart.CAREERS_URL) return OFFICIAL_CAREERS_HTML
      if (url === blueDart.SEARCH_RESULTS_URL) return SEARCH_RESULTS_HTML
      if (url === 'https://careers.dhl.com/global/en/job/250261/Supervisor-Operations') {
        return JOB_DETAIL_HTML
      }
      throw new Error(`Unexpected Blue Dart fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.bluedart.com/careers',
    'https://careers.dhl.com/global/en/search-results?selected_fields=%7B%22businessUnit%22%3A%5B%22eCommerce+Solutions%22%5D%2C%22country%22%3A%5B%22India%22%5D%7D',
    'https://careers.dhl.com/global/en/job/250261/Supervisor-Operations',
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual({ ...jobs[0], scrapedAt: 'ignored' }, {
    jobId: '250261',
    requisitionId: '250261',
    title: 'Supervisor - Operations',
    company: 'Blue Dart',
    department: 'Operations',
    location: 'Mumbai, India',
    city: 'Mumbai',
    country: 'India',
    link: 'https://careers.dhl.com/global/en/job/250261',
    applyUrl: 'https://careers.dhl.com/global/en/job/250261',
    sourceUrl: 'https://careers.dhl.com/global/en/job/250261/Supervisor-Operations',
    source: 'bluedart',
    employmentType: 'Full-time',
    experienceRequired: '4+ years',
    publicExperienceChecked: true,
    jobDescription: 'Support ground operations and delivery performance.',
    minimumQualification: "Bachelor's degree required.",
    preferredQualification: null,
    requiredSkills: ['Operations', 'Logistics'],
    postingDate: '2026-07-10',
    scrapedAt: 'ignored',
  })
  assert.ok(typeof jobs[0].scrapedAt === 'string' && jobs[0].scrapedAt.length > 0)
})

test('run marks Blue Dart jobs as publicly checked when the detail page exposes no experience requirement', async () => {
  const blueDart = await loadBlueDartModule()

  const jobs = await blueDart.createBlueDartScraper().run({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      if (url === blueDart.CAREERS_URL) return OFFICIAL_CAREERS_HTML
      if (url === blueDart.SEARCH_RESULTS_URL) return SEARCH_RESULTS_HTML
      if (url === 'https://careers.dhl.com/global/en/job/250261/Supervisor-Operations') {
        return JOB_DETAIL_NO_EXPERIENCE_HTML
      }
      throw new Error(`Unexpected Blue Dart no-experience fixture URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].experienceRequired, null)
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.equal(jobs[0].jobDescription, 'Support ground operations and delivery performance.')
})

test('run returns [] when the current Blue Dart portal shell is live and DHL search has no India results', async () => {
  const blueDart = await loadBlueDartModule()
  const requestedUrls = []

  const jobs = await blueDart.createBlueDartScraper().run({
    maxPages: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === blueDart.CAREERS_URL) return OFFICIAL_PORTAL_CAREERS_HTML
      if (url === blueDart.SEARCH_RESULTS_URL) return NO_RESULTS_SEARCH_RESULTS_HTML
      throw new Error(`Unexpected Blue Dart no-results fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.bluedart.com/careers',
    'https://careers.dhl.com/global/en/search-results?selected_fields=%7B%22businessUnit%22%3A%5B%22eCommerce+Solutions%22%5D%2C%22country%22%3A%5B%22India%22%5D%7D',
  ])
  assert.deepEqual(jobs, [])
})
