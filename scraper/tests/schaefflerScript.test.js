import assert from 'node:assert/strict'
import test from 'node:test'

const loadSchaefflerModule = async () => {
  try {
    return await import('../schaeffler/script.js')
  } catch {
    assert.fail('Expected Schaeffler scraper module at ../schaeffler/script.js')
  }
}

const listingHtml = `
  <html>
    <body>
      <span class="paginationLabel">1 - 1 of 1 jobs</span>
      <span class="srHelp">Page 1 of 1</span>
      <table>
        <tr class="data-row">
          <td class="colTitle">
            <a class="jobTitle-link" href="/job/Pune-Senior-Software-Engineer/123456789/">
              Senior Software Engineer
            </a>
          </td>
          <td>
            <span class="jobLocation">Pune, MH, IN, 411057</span>
          </td>
        </tr>
      </table>
    </body>
  </html>
`

const detailHtml = `
  <html>
    <body>
      <h1 itemprop="title">Senior Software Engineer</h1>
      <span itemprop="description">
        <p>Build platform integrations for Schaeffler engineering systems.</p>
        <ul>
          <li>Node.js</li>
          <li>REST APIs</li>
        </ul>
      </span>
      <meta itemprop="datePosted" content="2026-07-01" />
      <meta itemprop="validThrough" content="2026-07-31" />
      <meta itemprop="addressLocality" content="Pune" />
      <a
        class="btn btn-primary btn-large btn-lg apply dialogApplyBtn "
        href="/talentcommunity/apply/123456789/?locale=en_US"
      >
        Apply
      </a>
    </body>
  </html>
`

test('Schaeffler uses the official India search route and decorates shared scraper fields', async () => {
  const {
    buildIndiaSearchUrl,
    run,
  } = await loadSchaefflerModule()
  const requestedUrls = []

  const jobs = await run({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === buildIndiaSearchUrl()) return listingHtml
      if (url === 'https://jobs.schaeffler.com/job/Pune-Senior-Software-Engineer/123456789/') {
        return detailHtml
      }
      throw new Error(`Unexpected Schaeffler URL: ${url}`)
    },
  })

  assert.equal(
    buildIndiaSearchUrl(),
    'https://jobs.schaeffler.com/search/?createNewAlert=false&q=&locationsearch=India&locale=en_US',
  )
  assert.deepEqual(requestedUrls, [
    'https://jobs.schaeffler.com/search/?createNewAlert=false&q=&locationsearch=India&locale=en_US',
    'https://jobs.schaeffler.com/job/Pune-Senior-Software-Engineer/123456789/',
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(
    {
      jobId: jobs[0].jobId,
      requisitionId: jobs[0].requisitionId,
      title: jobs[0].title,
      company: jobs[0].company,
      location: jobs[0].location,
      city: jobs[0].city,
      source: jobs[0].source,
      sourceUrl: jobs[0].sourceUrl,
      applyUrl: jobs[0].applyUrl,
      employmentType: jobs[0].employmentType,
      postingDate: jobs[0].postingDate,
      closingDate: jobs[0].closingDate,
      requiredSkills: jobs[0].requiredSkills,
    },
    {
      jobId: '123456789',
      requisitionId: '123456789',
      title: 'Senior Software Engineer',
      company: 'Schaeffler',
      location: 'Pune, MH, IN, 411057',
      city: 'Pune',
      source: 'schaeffler',
      sourceUrl: 'https://jobs.schaeffler.com/job/Pune-Senior-Software-Engineer/123456789/',
      applyUrl: 'https://jobs.schaeffler.com/talentcommunity/apply/123456789/?locale=en_US',
      employmentType: 'Full-time',
      postingDate: '2026-07-01',
      closingDate: '2026-07-31',
      requiredSkills: ['Node.js', 'REST APIs'],
    },
  )
  assert.match(
    jobs[0].jobDescription,
    /build platform integrations for schaeffler engineering systems/i,
  )
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.match(jobs[0].scrapedAt, /\d{4}-\d{2}-\d{2}T/)
})
