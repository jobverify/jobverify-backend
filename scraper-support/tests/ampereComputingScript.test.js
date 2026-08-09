import assert from 'node:assert/strict'
import test from 'node:test'

const searchHtml = `
<!doctype html>
<html>
  <body>
    <div class="row">
      <div class="large-6 columns">
        <h3 class="heading-6 space-none">
          <a href="https://careers.amperecomputing.com/jobs/12345-senior-software-engineer">Senior Software Engineer</a>
        </h3>
      </div>
      <div class="large-3 columns"><span class="hide-for-large">Category: </span>Engineering</div>
      <div class="large-3 columns"><span class="hide">Location: </span>Bangalore, Karnataka, India</div>
    </div>
    <div class="row">
      <div class="large-6 columns">
        <h3 class="heading-6 space-none">
          <a href="https://careers.amperecomputing.com/jobs/99999-us-role">US Role</a>
        </h3>
      </div>
      <div class="large-3 columns"><span class="hide-for-large">Category: </span>Engineering</div>
      <div class="large-3 columns"><span class="hide">Location: </span>Santa Clara, California, United States</div>
    </div>
  </body>
</html>
`

const detailHtml = `
<!doctype html>
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Senior Software Engineer",
        "description": "<p>Build platform software for Ampere systems.</p>",
        "employmentType": "FULL_TIME",
        "datePosted": "2026-07-20",
        "validThrough": "2026-08-20",
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Bangalore",
            "addressRegion": "Karnataka",
            "addressCountry": "India"
          }
        }
      }
    </script>
  </head>
  <body></body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/amperecomputing/script.js')
  } catch {
    assert.fail('Expected Ampere Computing scraper module at ../../scraper/amperecomputing/script.js')
  }
}

test('Ampere Computing parses India search results and detail JSON-LD', async () => {
  const ampere = await loadModule()

  const jobs = await ampere.createAmpereComputingScraper().run({
    fetchText: async (url) => {
      if (url === ampere.SEARCH_URL) return searchHtml
      if (url === 'https://careers.amperecomputing.com/jobs/12345-senior-software-engineer') {
        return detailHtml
      }

      throw new Error(`Unexpected Ampere Computing URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Senior Software Engineer')
  assert.equal(jobs[0].location, 'Bangalore, Karnataka, India')
  assert.equal(jobs[0].city, 'Bangalore')
  assert.equal(jobs[0].department, 'Engineering')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].jobId, '12345')
})

test('Ampere Computing stays API-only and surfaces direct-request failures without a browser fallback', async () => {
  const ampere = await loadModule()

  await assert.rejects(
    ampere.createAmpereComputingScraper().run({
      fetchText: async () => {
        throw new Error(`HTTP 403 for ${ampere.SEARCH_URL}`)
      },
    }),
    /HTTP 403 for https:\/\/careers\.amperecomputing\.com\/search\/jobs/,
  )
})
