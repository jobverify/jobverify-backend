import assert from 'node:assert/strict'
import test from 'node:test'

const loadFinolexModule = async () => {
  try {
    return await import('../../scraper/finolexindustrieslimited/script.js')
  } catch {
    assert.fail('Expected Finolex Industries Limited scraper module at ../../scraper/finolexindustrieslimited/script.js')
  }
}

const careersHtml = `
  <html lang="en">
    <head>
      <title>Careers &amp; Jobs Opportunities | Work with Finolex Pipes</title>
    </head>
    <body>
      <h1><span>Join Us</span> To Shape the Future of Piping Solutions</h1>
      <div>Managing Director, Finolex Industries Ltd.</div>
      <section>
        <p>Job Openings</p>
        <h2>Discover Your Career Path</h2>
      </section>
      <div class="search-dropdown">
        <div class="custom-select">
          <div class="selected-value" id="selDepart">-Select Department-</div>
          <div class="options-container">
            <div class="option" data-value="">-Select Department-</div>
            <div class="option" data-value="Badhalwadi">Badhalwadi</div>
            <div class="option" data-value="FIL Vendor Site">FIL Vendor Site</div>
            <div class="option" data-value="Masar">Masar</div>
            <div class="option" data-value="Gujarat">Gujarat</div>
            <div class="option" data-value="Pune">Pune</div>
          </div>
        </div>
      </div>
      <div class="job-lists">
        <div class="job-list-container" id="jobListData"></div>
        <div class="job-list-container" id="jobListNoData">There are currently no open positions matching your search criteria.</div>
        <div class="job-detail-container" id="jobDetailsDiv"></div>
      </div>
      <div class="mobile-view">
        <div class="body2">
          <div id="modalJobDetails"></div>
        </div>
      </div>
      <a>Apply via Mail</a>
      <a>Apply via Whatsapp</a>
      <p class="contact-email">Email: <a href="mailto:career@finolexind.com">career@finolexind.com</a></p>
    </body>
  </html>
`

test('Finolex scraper targets the official careers page and recognizes the verified empty-state signals', async () => {
  const finolex = await loadFinolexModule()

  assert.equal(finolex.CAREER_PAGE_URL, 'https://www.finolexpipes.com/career/')
  assert.equal(finolex.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(finolex.hasEmptyOpeningsSignal(careersHtml), true)
})

test('run returns no jobs when Finolex exposes the verified no-open-positions public surface', async () => {
  const finolex = await loadFinolexModule()
  const requestedUrls = []

  const jobs = await finolex.createFinolexIndustriesLimitedScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === finolex.CAREER_PAGE_URL) return { status: 200, url, html: careersHtml }
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [finolex.CAREER_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('run fails closed when the Finolex public careers surface changes', async () => {
  const finolex = await loadFinolexModule()

  await assert.rejects(
    finolex.createFinolexIndustriesLimitedScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: '<html><title>Unexpected</title></html>' }),
    }),
    /verified official public surface/i,
  )

  await assert.rejects(
    finolex.createFinolexIndustriesLimitedScraper().run({
      fetchPage: async (url) => ({ status: 200, url, html: `
        <html>
          <head><title>Careers &amp; Jobs Opportunities | Work with Finolex Pipes</title></head>
          <body>
            <h1><span>Join Us</span> To Shape the Future of Piping Solutions</h1>
            <div>Managing Director, Finolex Industries Ltd.</div>
            <p>Job Openings</p>
            <h2>Discover Your Career Path</h2>
            <p class="contact-email">Email: <a href="mailto:career@finolexind.com">career@finolexind.com</a></p>
            <p>Open positions are now available.</p>
          </body>
        </html>
      ` }),
    }),
    /no-open-positions surface/i,
  )
})
