import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const BLOCKED_PAGE_HTML = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Just a moment...</title>
  </head>
  <body>
    <main>
      <p>Please enable cookies.</p>
      <p>Cloudflare</p>
      <script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script>
    </main>
  </body>
</html>
`

const INDIA_SITE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>We are WSP - Engineers, Designers, Planners, Researchers | WSP</title>
  </head>
  <body>
    <main>
      <h1>WSP India</h1>
      <a href="https://www.wsp.com/en-gl/careers/job-opportunities?country=IN">Search and apply</a>
    </main>
  </body>
</html>
`

const JOBS_PAGE_ONE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Find your next opportunity | WSP</title>
  </head>
  <body>
    <section>
      <a href="https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/89283">
        <div>
          <h2 class="typo__24_20">Engineer - Roads <img alt="Link"></h2>
          <div class="office-group">
            <div class="office-address m-t-1">
              <span class="icon job-location"></span>
              <div class="text text-locations overflow-container">Bengaluru | Noida</div>
            </div>
          </div>
        </div>
      </a>
      <div class="pagination">
        <a class="pageprev">1</a>
        <a class="pageprev">2</a>
        <a class="pageprev">28</a>
        <a class="pagenext"></a>
      </div>
    </section>
  </body>
</html>
`

const JOBS_PAGE_TWO_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Find your next opportunity | WSP</title>
  </head>
  <body>
    <section>
      <a href="https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/90362">
        <div>
          <h2 class="typo__24_20">BIM Technician - Rail Civils <img alt="Link"></h2>
          <div class="office-group">
            <div class="office-address m-t-1">
              <span class="icon job-location"></span>
              <div class="text text-locations overflow-container">Noida | Bengaluru</div>
            </div>
          </div>
        </div>
      </a>
    </section>
  </body>
</html>
`

test('WSP India recognizes the verified Cloudflare challenge and extracts rendered Oracle-backed cards cleanly', async () => {
  const wspIndia = await loadModule()
  assert.ok(wspIndia, 'WSP India scraper module should load')

  assert.equal(wspIndia.hasCloudflareChallengeSignal(BLOCKED_PAGE_HTML), true)
  assert.equal(wspIndia.hasOfficialIndiaSiteSignal(INDIA_SITE_HTML), true)
  assert.equal(wspIndia.hasOfficialJobsPageSignal(JOBS_PAGE_ONE_HTML), true)
  assert.equal(wspIndia.extractMaxPageNumber(JOBS_PAGE_ONE_HTML), 28)
  assert.deepEqual(wspIndia.extractJobsFromHtml(JOBS_PAGE_ONE_HTML), [
    {
      title: 'Engineer - Roads',
      company: 'WSP India',
      location: 'Bengaluru | Noida',
      city: 'Bengaluru',
      sourceUrl: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/89283',
      applyUrl: 'https://emit.fa.ca3.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2001/requisitions/preview/89283',
      jobId: '89283',
      requisitionId: '89283',
      jobDescription: null,
    },
  ])
})

test('WSP India returns no jobs when the official India site is blocked to API-only fetches by the verified Cloudflare challenge', async () => {
  const wspIndia = await loadModule()
  assert.ok(wspIndia, 'WSP India scraper module should load')

  const rawRequestedUrls = []
  const jobs = await wspIndia.createWspIndiaScraper({ maxPages: 2 }).run({
    fetchPage: async (url) => {
      rawRequestedUrls.push(url)
      return {
        status: 403,
        url,
        html: BLOCKED_PAGE_HTML,
      }
    },
    now: () => '2026-08-04T00:00:00.000Z',
  })

  assert.deepEqual(rawRequestedUrls, [wspIndia.INDIA_SITE_URL])
  assert.deepEqual(jobs, [])
})

test('WSP India fails closed when the official jobs page surface changes materially', async () => {
  const wspIndia = await loadModule()
  assert.ok(wspIndia, 'WSP India scraper module should load')

  await assert.rejects(
    wspIndia.createWspIndiaScraper({ maxPages: 1 }).run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: url === wspIndia.INDIA_SITE_URL
          ? INDIA_SITE_HTML
          : '<html><body><h1>Jobs</h1></body></html>',
      }),
    }),
    /jobs page surface changed/i,
  )
})
