import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREER_PAGE_URL,
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
        <div class="search-dropdown">
          <div class="custom-select">
            <div class="selected-value" id="selDepart">-Select Department-</div>
            <div class="options-container">
              <div class="option" data-value="">-Select Department-</div>
              <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
              <html>
                <head><title>500 Internal Server Error</title></head>
                <body><h1>Internal Server Error</h1></body>
              </html>
            </div>
          </div>
        </div>
      </section>
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
  assert.equal(hasOfficialCareersSignal(verifiedCurrentCareerHtml), true)
  assert.equal(hasEmptyOpeningsSignal(verifiedCurrentCareerHtml), true)
  assert.deepEqual(extractDepartmentOptions(verifiedCurrentCareerHtml), [])
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

test('fails closed when Finolex exposes public department options that need job parsing', async () => {
  const publicOptionsHtml = verifiedCurrentCareerHtml.replace(
    '<div class="option" data-value="">-Select Department-</div>',
    '<div class="option" data-value="">-Select Department-</div><div class="option" data-value="sales">Sales</div>',
  )

  assert.deepEqual(extractDepartmentOptions(publicOptionsHtml), [{ value: 'sales', label: 'Sales' }])

  await assert.rejects(
    createFinolexIndustriesLimitedScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: publicOptionsHtml }),
    }),
    /public department options/i,
  )
})
