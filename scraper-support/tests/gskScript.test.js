import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSearchResultsPageUrl,
  run,
} from '../../scraper/gsk/script.js'

const searchResultsHtml = `<!doctype html>
<html>
<body>
<script>
var phApp = phApp || {"widgetApiEndpoint":"https://jobs.gsk.com/widgets","country":"us","locale":"en_us","baseUrl":"https://jobs.gsk.com/us/en/","baseDomain":"https://jobs.gsk.com","pageName":"search-results","siteType":"external"};
phApp.ddo = {"eagerLoadRefineSearch":{"totalHits":2,"hits":2,"data":{"jobs":[{"reqId":"443558","jobId":"443558","title":"Associate Director Technology Manager","city":"Bengaluru","country":"India","category":"Digital and Technology","type":"Full time","postedDate":"2026-07-21T00:00:00.000+0000","descriptionTeaser":"Lead technology delivery for global platforms at GSK.","applyUrl":"https://jobs.gsk.com/in/en/job/443558/Associate-Director-Technology-Manager","cityStateCountry":"Bengaluru, Karn\u0101taka, India","location":"Bengaluru, Karn\u0101taka, India","ml_skills":["delivery management","stakeholder management"]},{"reqId":"450001","jobId":"450001","title":"US-only Example","city":"Philadelphia","country":"United States of America","category":"Marketing","type":"Full time","postedDate":"2026-07-20T00:00:00.000+0000","descriptionTeaser":"Not an India job.","applyUrl":"https://jobs.gsk.com/us/en/job/450001/US-only-Example","cityStateCountry":"Philadelphia, Pennsylvania, United States of America","location":"Philadelphia, Pennsylvania, United States of America","ml_skills":["marketing"]}],"aggregations":[{"field":"country","value":{"India":24,"United States of America":237}}]}}};
</script>
</body>
</html>`

const detailHtml = `<!doctype html>
<html>
<head>
<link rel="canonical" href="https://jobs.gsk.com/in/en/job/443558/Associate-Director-Technology-Manager">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Associate Director Technology Manager","datePosted":"2026-07-21","employmentType":"FULL_TIME","description":"<p>What you'll do</p><p>Lead cross-functional technology programs for GSK.</p><p>Experience: 10+ years experience in enterprise technology leadership.</p><p>Bachelor's degree in Computer Science or equivalent.</p><p><strong>Required Skills</strong></p><ul><li>Technology strategy</li><li>Stakeholder management</li></ul>","jobLocation":{"@type":"Place","address":{"addressLocality":"Bengaluru","addressRegion":"Karn\u0101taka","addressCountry":"India"}}}</script>
</head>
<body>
<script>
var phApp = phApp || {};
phApp.ddo = {"jobDetail":{"data":{"job":{"jobId":"443558","reqId":"443558","title":"Associate Director Technology Manager","category":"Digital and Technology","type":"Full time","postedDate":"2026-07-21T00:00:00.000+0000","applyUrl":"https://jobs.gsk.com/in/en/job/443558/Associate-Director-Technology-Manager","city":"Bengaluru","location":"Bengaluru, Karn\u0101taka, India","ml_Description":"<p>What you'll do</p><p>Lead cross-functional technology programs for GSK.</p><p>Experience: 10+ years experience in enterprise technology leadership.</p><p>Bachelor's degree in Computer Science or equivalent.</p>","ml_skills":["technology strategy","stakeholder management"]}}}};
</script>
</body>
</html>`

test('buildSearchResultsPageUrl builds the official GSK Phenom search URL', () => {
  assert.equal(
    buildSearchResultsPageUrl(),
    'https://jobs.gsk.com/us/en/search-results',
  )
  assert.equal(
    buildSearchResultsPageUrl(10),
    'https://jobs.gsk.com/us/en/search-results?from=10',
  )
})

test('run keeps India jobs from GSK search results and enriches them from detail pages', async () => {
  const jobs = await run({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      if (url === 'https://jobs.gsk.com/us/en/search-results') {
        return searchResultsHtml
      }
      if (url === 'https://jobs.gsk.com/us/en/job/443558/Associate-Director-Technology-Manager') {
        return detailHtml
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'GSK')
  assert.equal(jobs[0].source, 'gsk')
  assert.equal(jobs[0].jobId, '443558')
  assert.equal(jobs[0].requisitionId, '443558')
  assert.equal(jobs[0].title, 'Associate Director Technology Manager')
  assert.equal(jobs[0].location, 'Bengaluru, Karn\u0101taka, India')
  assert.equal(jobs[0].city, 'Bengaluru')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].department, 'Digital and Technology')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].postingDate, '2026-07-21')
  assert.equal(
    jobs[0].sourceUrl,
    'https://jobs.gsk.com/us/en/job/443558/Associate-Director-Technology-Manager',
  )
  assert.equal(
    jobs[0].applyUrl,
    'https://jobs.gsk.com/in/en/job/443558/Associate-Director-Technology-Manager',
  )
  assert.match(jobs[0].jobDescription, /Lead cross-functional technology programs for GSK/i)
  assert.match(jobs[0].experienceRequired, /10\+ years/i)
  assert.match(jobs[0].minimumQualification, /Bachelor's degree/i)
  assert.deepEqual(jobs[0].requiredSkills, ['Technology strategy', 'Stakeholder management'])
})

test('run deduplicates GSK roles that resolve to the same public job after detail enrichment', async () => {
  const duplicateSearchResultsPage0 = `<!doctype html>
<html>
<body>
<script>
phApp.ddo = {"eagerLoadRefineSearch":{"totalHits":2,"hits":1,"data":{"jobs":[{"reqId":"Job Code: J003318","title":"Senior Medical Writer","city":"Bengaluru","country":"India","category":"Medical and Clinical","type":"Full time","postedDate":"2026-07-23T00:00:00.000+0000","applyUrl":"https://jobs.gsk.com/in/en/job/443912/Senior-Medical-Writer","cityStateCountry":"Bengaluru, India","location":"Bengaluru, India","ml_skills":["medical writing"]}],"aggregations":[{"field":"country","value":{"India":24}}]}}};
</script>
</body>
</html>`

  const duplicateSearchResultsPage10 = `<!doctype html>
<html>
<body>
<script>
phApp.ddo = {"eagerLoadRefineSearch":{"totalHits":2,"hits":1,"data":{"jobs":[{"reqId":"Job Code: J003318","jobId":"441912","title":"Senior Medical Writer","city":"Bengaluru","country":"India","category":"Medical and Clinical","type":"Full time","postedDate":"2026-07-23T00:00:00.000+0000","applyUrl":"https://jobs.gsk.com/in/en/job/443912/Senior-Medical-Writer","cityStateCountry":"Bengaluru, India","location":"Bengaluru, India","ml_skills":["medical writing"]}],"aggregations":[{"field":"country","value":{"India":24}}]}}};
</script>
</body>
</html>`

  const duplicateJobs = await run({
    maxPages: 2,
    fetchText: async (url) => {
      if (url === 'https://jobs.gsk.com/us/en/search-results') {
        return duplicateSearchResultsPage0
      }
      if (url === 'https://jobs.gsk.com/us/en/search-results?from=1') {
        return duplicateSearchResultsPage10
      }
      if (
        url === 'https://jobs.gsk.com/us/en/job/Job%20Code:%20J003318/Senior-Medical-Writer'
        || url === 'https://jobs.gsk.com/us/en/job/441912/Senior-Medical-Writer'
      ) {
        return detailHtml
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.equal(duplicateJobs.length, 1)
  assert.equal(duplicateJobs[0].jobId, '443558')
})
