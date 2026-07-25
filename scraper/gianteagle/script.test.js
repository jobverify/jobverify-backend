import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const searchResultsHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <script type="text/javascript">
        var phApp = phApp || {"widgetApiEndpoint":"https://jobs.gianteagle.com/widgets","country":"us","locale":"en_us","baseUrl":"https://jobs.gianteagle.com/us/en/","baseDomain":"https://jobs.gianteagle.com","pageName":"search-results","siteType":"external"};
        phApp.ddo = {"eagerLoadRefineSearch":{"totalHits":2,"hits":2,"data":{"jobs":[{"reqId":"383708","jobId":"383708","title":"Chardon Giant Eagle Team Member","cityStateCountry":"Chardon, Ohio, United States of America","country":"United States of America","category":"Supermarket","type":"Part time","postedDate":"2026-01-30T00:00:00.000+0000","descriptionTeaser":"Every Team Member plays a vital role in bringing our core values to life.","applyUrl":"https://gianteagle.wd503.myworkdayjobs.com/GEExternalcareers/job/4098---Chardon---Supermarket/Chardon-Giant-Eagle-Team-Member_383708/apply"},{"reqId":"384000","jobId":"384000","title":"Toronto Team Member","cityStateCountry":"Toronto, Ontario, Canada","country":"Canada","category":"Supermarket","type":"Full time","postedDate":"2026-02-04T00:00:00.000+0000","descriptionTeaser":"Support our Canadian store operations.","applyUrl":"https://example.com/canada/apply"}],"aggregations":[{"field":"country","value":{"United States of America":1,"Canada":1}}]}}};
      </script>
    </head>
    <body></body>
  </html>
`

const detailPageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <link rel="canonical" href="https://jobs.gianteagle.com/us/en/job/383708/Chardon-Giant-Eagle-Team-Member">
      <script type="text/javascript">
        phApp.ddo = {"jobDetail":{"data":{"job":{"reqId":"383708","jobId":"383708","title":"Chardon Giant Eagle Team Member","category":"Supermarket","type":"Part time","postedDate":"2026-01-30T00:00:00.000+0000","applyUrl":"https://gianteagle.wd503.myworkdayjobs.com/GEExternalcareers/job/4098---Chardon---Supermarket/Chardon-Giant-Eagle-Team-Member_383708/apply","city":"Chardon","country":"United States of America","location":"4098 - Chardon - Supermarket","ml_Description":"<p>Every Team Member plays a vital role in bringing our core values to life and enhancing the shopping experience for our guests.</p><p>Experience Required: 0 to 6 months.</p><p>Education Desired: No High School diploma required.</p>"}}}};
      </script>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Chardon Giant Eagle Team Member",
          "description": "<p>Every Team Member plays a vital role in bringing our core values to life and enhancing the shopping experience for our guests.</p><p>Experience Required: 0 to 6 months.</p><p>Education Desired: No High School diploma required.</p>",
          "datePosted": "2026-01-30",
          "employmentType": "PART_TIME",
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Chardon",
              "addressRegion": "Ohio",
              "addressCountry": "United States of America"
            }
          }
        }
      </script>
    </head>
    <body></body>
  </html>
`

test('Giant Eagle Phenom wrapper keeps listings on the official search route', async () => {
  const giantEagle = await loadModule()
  assert.ok(giantEagle, 'Expected scraper module at ./script.js')

  assert.equal(
    giantEagle.buildSearchResultsPageUrl(),
    'https://jobs.gianteagle.com/us/en/search-results',
  )
  assert.equal(
    giantEagle.buildSearchResultsPageUrl(10),
    'https://jobs.gianteagle.com/us/en/search-results?from=10',
  )
})

test('Giant Eagle Phenom wrapper filters to its configured United States jobs and decorates the shared runner fields', async () => {
  const giantEagle = await loadModule()
  assert.ok(giantEagle, 'Expected scraper module at ./script.js')

  const requestedUrls = []

  const jobs = await giantEagle.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === giantEagle.buildSearchResultsPageUrl()) {
        return searchResultsHtml
      }

      if (url === 'https://jobs.gianteagle.com/us/en/job/383708/Chardon-Giant-Eagle-Team-Member') {
        return detailPageHtml
      }

      throw new Error(`Unexpected Giant Eagle fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    giantEagle.buildSearchResultsPageUrl(),
    'https://jobs.gianteagle.com/us/en/job/383708/Chardon-Giant-Eagle-Team-Member',
  ])

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Giant Eagle')
  assert.equal(jobs[0].source, 'gianteagle')
  assert.equal(jobs[0].jobId, '383708')
  assert.equal(jobs[0].country, 'United States of America')
  assert.equal(jobs[0].city, 'Chardon')
  assert.equal(jobs[0].employmentType, null)
  assert.equal(
    jobs[0].applyUrl,
    'https://gianteagle.wd503.myworkdayjobs.com/GEExternalcareers/job/4098---Chardon---Supermarket/Chardon-Giant-Eagle-Team-Member_383708/apply',
  )
  assert.equal(
    jobs[0].link,
    'https://gianteagle.wd503.myworkdayjobs.com/GEExternalcareers/job/4098---Chardon---Supermarket/Chardon-Giant-Eagle-Team-Member_383708/apply',
  )
  assert.match(jobs[0].jobDescription, /Every Team Member plays a vital role/i)
  assert.ok(Date.parse(jobs[0].scrapedAt))
})
