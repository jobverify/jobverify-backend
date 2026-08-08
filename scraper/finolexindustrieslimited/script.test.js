import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
  VERIFIED_ON,
  createFinolexIndustriesLimitedScraper,
  extractDepartmentOptions,
  hasEmptyOpeningsSignal,
  hasOfficialCareersSignal,
} from './script.js'

const verifiedCurrentCareerHtml = `
  <html>
    <head>
      <title>Careers &amp; Jobs Opportunities | Work with Finolex Pipes</title>
    </head>
    <body>
      <h1><span>Join Us</span> To Shape the Future of Piping Solutions</h1>
      <div>Managing Director, Finolex Industries Ltd.</div>
      <section class="section2">
        <div class="career-heading">
          <p>Job Openings</p>
          <h2>Discover Your Career Path</h2>
        </div>
        <div class="search-job-container">
          <form class="search-field" id="joblocSearch">
            <div class="search-dropdown">
              <div class="custom-select">
                <div class="selected-value" id="selDepart">-Select Department-</div>
                <div class="options-container">
                  <div class="option" data-value="">-Select Department-</div>
                  <div class="option" data-value="Admin">Admin</div>
                  <div class="option" data-value="Data Analytics">Data Analytics</div>
                </div>
              </div>
            </div>
          </form>
          <div class="job-lists">
            <div class="job-list-container" id="jobListData"></div>
            <div class="job-list-container" id="jobListNoData">There are currently no open positions matching your search criteria.</div>
            <div class="job-detail-container" id="jobDetailsDiv"></div>
          </div>
        </div>
      </section>
      <div class="mobile-view">
        <div class="bottom-sheet" id="jobModal">
          <div class="content">
            <div class="body2">
              <div id="modalJobDetails"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="job-not-found">
        <a>Apply via Mail</a>
        <a>Apply via Whatsapp</a>
        <p class="contact-email">Email: <a href="mailto:career@finolexind.com">career@finolexind.com</a></p>
        <p>500 Internal Server Error</p>
      </div>
      <section class="job-application-modal">
        <form class="application-form" id="applicationForm">
          <input type="text" id="jobDropdown" name="jobDropdown" value="abc" readonly />
          <select id="cityDropdown" name="cityDropdown"></select>
        </form>
      </section>
    </body>
  </html>
`

test('recognizes the current official Finolex careers shell and empty-state markers', () => {
  assert.equal(CAREER_PAGE_URL, 'https://www.finolexpipes.com/career/')
  assert.equal(VERIFIED_ON, '2026-08-07')
  assert.equal(hasOfficialCareersSignal(verifiedCurrentCareerHtml), true)
  assert.equal(hasEmptyOpeningsSignal(verifiedCurrentCareerHtml), true)
  assert.deepEqual(extractDepartmentOptions(verifiedCurrentCareerHtml), [
    { value: 'Admin', label: 'Admin' },
    { value: 'Data Analytics', label: 'Data Analytics' },
  ])
  assert.equal(hasOfficialCareersSignal('<html><body>Finolex Pipes</body></html>'), false)
})

test('returns no jobs for the verified current careers shell even when the route reports HTTP 500', async () => {
  const requestedUrls = []
  const jobs = await createFinolexIndustriesLimitedScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      return { status: 500, url, html: verifiedCurrentCareerHtml }
    },
  })

  assert.deepEqual(requestedUrls, [CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('fails closed when Finolex removes the verified no-openings results surface', async () => {
  const driftedHtml = verifiedCurrentCareerHtml.replace(
    'There are currently no open positions matching your search criteria.',
    'Open positions are now available.',
  )

  await assert.rejects(
    createFinolexIndustriesLimitedScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: driftedHtml }),
    }),
    /no-open-positions surface/i,
  )
})
