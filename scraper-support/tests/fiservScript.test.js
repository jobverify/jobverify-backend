import assert from 'node:assert/strict'
import test from 'node:test'

const loadFiservModule = async () => {
  try {
    return await import('../../scraper/fiserv/script.js')
  } catch {
    assert.fail('Expected Fiserv scraper module at ../../scraper/fiserv/script.js')
  }
}

const searchResultsHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Search results | Find available job openings at Fiserv</title>
      <script type="text/javascript">
        var phApp = phApp || {"widgetApiEndpoint":"https://careers.fiserv.com/widgets","country":"us","deviceType":"desktop","locale":"en_us","absUrl":true,"refNum":"FFFYJUS","cdnUrl":"https://cdn.phenompeople.com/CareerConnectResources","baseUrl":"https://careers.fiserv.com/us/en/","baseDomain":"https://careers.fiserv.com","phenomTrackURL":"careers.fiserv.com/us/en/phenomtrack.min.js","pageName":"search-results","siteType":"external","rootDomain":"https://careers.fiserv.com","pageId":"page23"};
        phApp.ddo = {"eagerLoadRefineSearch":{"totalHits":2,"hits":2,"data":{"jobs":[{"reqId":"R-10388141","jobId":"R-10388141","title":"Technology Analyst Program I","cityStateCountry":"Pune, Maharashtra, India","country":"India","category":"Technology","type":"Full time","postedDate":"2026-06-20T00:00:00.000+0000","descriptionTeaser":"Build and support fintech platforms with engineering teams in India.","applyUrl":"https://fiserv.wd5.myworkdayjobs.com/EXT/job/Pune-Maharashtra/Technology-Analyst-Program-I_R-10388141/apply","ml_skills":["java","sql"]},{"reqId":"R-10389066","jobId":"R-10389066","title":"Senior AI Solutions Engineer","cityStateCountry":"Berkeley Heights, New Jersey, United States of America","country":"United States of America","category":"Technology","type":"Full time","postedDate":"2026-06-23T00:00:00.000+0000","descriptionTeaser":"Design production AI agents for enterprise workflows.","applyUrl":"https://fiserv.wd5.myworkdayjobs.com/EXT/job/Berkeley-Heights-New-Jersey/Senior-AI-Solutions-Engineer_R-10389066/apply","ml_skills":["ai","typescript"]}],"aggregations":[{"field":"country","value":{"India":1,"United States of America":1}}]}}};
      </script>
    </head>
    <body></body>
  </html>
`

const detailPageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <link rel="canonical" href="https://careers.fiserv.com/us/en/job/R-10388141/Technology-Analyst-Program-I">
      <script type="text/javascript">
        phApp.ddo = {"jobDetail":{"data":{"job":{"reqId":"R-10388141","jobId":"R-10388141","title":"Technology Analyst Program I","category":"Technology","employmentType":"Full time","postedDate":"2026-06-21","applyUrl":"https://fiserv.wd5.myworkdayjobs.com/EXT/job/Pune-Maharashtra/Technology-Analyst-Program-I_R-10388141/apply","skills_sentences":["Java","SQL"],"education_sentences":["Bachelor's degree in Computer Science or a related field."]}}}};
      </script>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Technology Analyst Program I",
          "description": "<p>Calling all innovators - find your future at Fiserv.</p><p>Required Skills</p><ul><li>Java</li><li>SQL</li></ul><p>Bachelor's degree in Computer Science or a related field.</p>",
          "datePosted": "2026-06-21",
          "employmentType": "FULL_TIME",
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Pune",
              "addressRegion": "Maharashtra",
              "addressCountry": "India"
            }
          }
        }
      </script>
    </head>
    <body></body>
  </html>
`

test('buildSearchResultsPageUrl keeps Fiserv listings on the official Phenom search route', async () => {
  const fiserv = await loadFiservModule()

  assert.equal(
    fiserv.buildSearchResultsPageUrl(),
    'https://careers.fiserv.com/us/en/search-results',
  )
  assert.equal(
    fiserv.buildSearchResultsPageUrl(10),
    'https://careers.fiserv.com/us/en/search-results?from=10',
  )
})

test('extractSearchPayload reads Fiserv embedded Phenom search payloads and India aggregation counts', async () => {
  const fiserv = await loadFiservModule()
  const payload = fiserv.extractSearchPayload(searchResultsHtml)

  assert.equal(payload.widgetApiEndpoint, 'https://careers.fiserv.com/widgets')
  assert.equal(payload.totalHits, 2)
  assert.equal(payload.hits, 2)
  assert.equal(payload.jobs.length, 2)
  assert.equal(payload.aggregations.country.India, 1)
  assert.equal(payload.jobs[0].reqId, 'R-10388141')
})

test('extractSearchResults normalizes Fiserv India listings into the shared scraper fields', async () => {
  const fiserv = await loadFiservModule()
  const jobs = fiserv.extractSearchResults(
    fiserv.extractSearchPayload(searchResultsHtml),
  )
  const indiaJob = jobs.find((job) => job.jobId === 'R-10388141')
  const usJob = jobs.find((job) => job.jobId === 'R-10389066')

  assert.deepEqual(indiaJob, {
    title: 'Technology Analyst Program I',
    location: 'Pune, Maharashtra, India',
    city: 'Pune',
    country: 'India',
    jobId: 'R-10388141',
    requisitionId: 'R-10388141',
    department: 'Technology',
    employmentType: 'Full-time',
    experienceRequired: null,
    jobDescription: 'Build and support fintech platforms with engineering teams in India.',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: ['java', 'sql'],
    postingDate: '2026-06-20T00:00:00.000+0000',
    applyUrl: 'https://fiserv.wd5.myworkdayjobs.com/EXT/job/Pune-Maharashtra/Technology-Analyst-Program-I_R-10388141/apply',
    sourceUrl: 'https://careers.fiserv.com/us/en/job/R-10388141/Technology-Analyst-Program-I',
  })
  assert.equal(usJob.country, 'United States of America')
})

test('run keeps Fiserv jobs on the official Phenom route, filters India, and decorates shared runner fields', async () => {
  const fiserv = await loadFiservModule()
  const requestedUrls = []

  const jobs = await fiserv.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === fiserv.buildSearchResultsPageUrl()) {
        return searchResultsHtml
      }
      if (url === 'https://careers.fiserv.com/us/en/job/R-10388141/Technology-Analyst-Program-I') {
        return detailPageHtml
      }
      throw new Error(`Unexpected Fiserv fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    fiserv.buildSearchResultsPageUrl(),
    'https://careers.fiserv.com/us/en/job/R-10388141/Technology-Analyst-Program-I',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Fiserv')
  assert.equal(jobs[0].source, 'fiserv')
  assert.equal(jobs[0].jobId, 'R-10388141')
  assert.equal(
    jobs[0].applyUrl,
    'https://fiserv.wd5.myworkdayjobs.com/EXT/job/Pune-Maharashtra/Technology-Analyst-Program-I_R-10388141/apply',
  )
  assert.equal(
    jobs[0].link,
    'https://fiserv.wd5.myworkdayjobs.com/EXT/job/Pune-Maharashtra/Technology-Analyst-Program-I_R-10388141/apply',
  )
  assert.match(jobs[0].jobDescription, /find your future at Fiserv/i)
  assert.ok(Date.parse(jobs[0].scrapedAt))
})
