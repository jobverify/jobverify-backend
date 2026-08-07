import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>IndiaMART InterMESH Ltd</h1>
      <a href="field-sales-and-servicing.html">Field Sales</a>
      <a href="tele-sales-and-servicing.html">Tele Sales</a>
      <a href="leadership-product-tech-corporate-roles.html">Leadership</a>
      <a href="https://imerp.intermesh.net/im-job-application/auth/jobid/MjIx">Legacy Apply</a>
    </main>
  </body>
</html>
`

const leadershipHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>Leadership / Product / Tech &amp; Corporate Roles</h1>
      <script src="https://joblist.klimb.io/js/embedscripts/embed.js"></script>
      <div id="klimbjobs"></div>
      <script>
        klimb_init({ company : "indiamart" })
      </script>
    </main>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>IndiaMART InterMESH Ltd. Careers</title>
  </head>
  <body>
    <main>
      <h1>Jobs at IndiaMART InterMESH Ltd.</h1>
      <input id="cusId" value="5dd7966c6c4d197f68105048">
      <script>
        getFilterContent('5dd7966c6c4d197f68105048','indiamart','true','careers')
      </script>
      <div
        data-template-department="Engineering"
        data-template-locaName="Bengaluru"
        onclick="redirectToPage('/indiamart/role-1?source=careers')"
      >
        <div class="role-new role">Platform Engineer</div>
        <ul>
          <li class="info list-inline-item">Engineering</li>
          <li class="info list-inline-item">4-6 years</li>
        </ul>
        <div class="current-opening-desc">Design internal platform systems.</div>
      </div>
    </main>
  </body>
</html>
`

const boardHtmlWithCursor = boardHtml.replace(
  '</main>',
  `<script>loadMoreJobs('careers','cursor-1')</script></main>`,
)

const detailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main data-position="role-1">
      <h1>Platform Engineer</h1>
      <p>IndiaMART InterMESH Ltd.</p>
      <a href="/indiamart/role-1/apply?source=careers">Apply</a>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"JobPosting","title":"Platform Engineer"}
      </script>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/indiamart/script.js')
  } catch {
    assert.fail('Expected IndiaMART scraper module at ../../scraper/indiamart/script.js')
  }
}

test('IndiaMART falls back to a browser-backed page loader when Node fetch times out', async () => {
  const indiamart = await loadModule()
  const requestedPrimaryUrls = []
  const requestedBrowserUrls = []

  const jobs = await indiamart.createIndiaMartScraper({ maxJobs: 1 }).run({
    fetchPage: async (url) => {
      requestedPrimaryUrls.push(url)
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fetchBrowserPage: async (url) => {
      requestedBrowserUrls.push(url)

      if (url === indiamart.CAREERS_HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === indiamart.LEADERSHIP_JOBS_PAGE_URL) {
        return { status: 200, url, html: leadershipHtml }
      }

      if (url === indiamart.JOBS_BOARD_URL) {
        return { status: 200, url, html: boardHtml }
      }

      if (url === 'https://joblist.klimb.io/indiamart/role-1?source=careers') {
        return { status: 200, url, html: detailHtml }
      }

      throw new Error(`Unexpected browser URL: ${url}`)
    },
    fetchJson: async () => {
      throw new Error('Pagination should not be requested for the single verified fixture page')
    },
    now: () => '2026-08-02T10:00:00.000Z',
  })

  assert.deepEqual(requestedPrimaryUrls, [
    indiamart.CAREERS_HOMEPAGE_URL,
    indiamart.LEADERSHIP_JOBS_PAGE_URL,
    indiamart.JOBS_BOARD_URL,
    'https://joblist.klimb.io/indiamart/role-1?source=careers',
  ])
  assert.deepEqual(requestedBrowserUrls, requestedPrimaryUrls)
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].jobId, 'role-1')
  assert.equal(jobs[0].source, 'indiamart')
})

test('IndiaMART falls back to a browser-backed pagination loader when the Klimb JSON request times out', async () => {
  const indiamart = await loadModule()
  const requestedPrimaryJsonUrls = []
  const requestedBrowserJsonUrls = []

  await indiamart.createIndiaMartScraper({ maxJobs: 1, maxPages: 1 }).run({
    fetchPage: async (url) => {
      if (url === indiamart.CAREERS_HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === indiamart.LEADERSHIP_JOBS_PAGE_URL) return { status: 200, url, html: leadershipHtml }
      if (url === indiamart.JOBS_BOARD_URL) return { status: 200, url, html: boardHtmlWithCursor }
      if (url === 'https://joblist.klimb.io/indiamart/role-1?source=careers') {
        return { status: 200, url, html: detailHtml }
      }
      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedPrimaryJsonUrls.push(url)
      throw new TypeError('fetch failed | Connect Timeout Error')
    },
    fetchBrowserJson: async (url, landingUrl) => {
      requestedBrowserJsonUrls.push({ url, landingUrl })
      return {
        jobs: { positions: [] },
        showLoadMore: false,
      }
    },
    now: () => '2026-08-02T10:30:00.000Z',
  })

  assert.deepEqual(requestedPrimaryJsonUrls, [
    `${indiamart.JOBS_BOARD_URL}?lastPosId=cursor-1`,
  ])
  assert.deepEqual(requestedBrowserJsonUrls, [
    {
      url: `${indiamart.JOBS_BOARD_URL}?lastPosId=cursor-1`,
      landingUrl: indiamart.JOBS_BOARD_URL,
    },
  ])
})
