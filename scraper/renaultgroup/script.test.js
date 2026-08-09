import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Renault Group scraper module at ./script.js')
  }
}

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <h1>Renault Group</h1>
        <p>Careers</p>
        <p>News about the group</p>
        <a href="https://www.renaultgroup.com/en/careers/">Careers</a>
      </main>
      <footer>
        <p>Legal notices</p>
        <p>Security and confidentiality</p>
      </footer>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <h1>A career at the centre of the automotive revolution</h1>
        <p>Joining Renault Group means being part of a pioneering automotive company.</p>
        <h2>Find your next job</h2>
        <a href="https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers">View our offers</a>
        <p>ReKnow University</p>
      </main>
      <footer>
        <p>Legal notices</p>
        <p>Security and confidentiality</p>
      </footer>
    </body>
  </html>
`

const workdayBoardHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <link rel="canonical" href="https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers" />
      <meta property="og:title" content="Careers | Renault Group" />
      <meta property="og:description" content="Since 1889, Renault Group has relied on a legacy of innovation to shape the future of mobility." />
      <script>
        window.workday = {
          tenant: "alliancewd",
          siteId: "renault-group-careers",
          requestLocale: "en-US",
          appName: "cxs",
        }
      </script>
    </head>
    <body>
      <main>
        <h1>Careers at Renault Group</h1>
      </main>
    </body>
  </html>
`

test('Renault Group validates the verified homepage, careers page, and public Workday board', async () => {
  const renault = await loadModule()

  assert.equal(renault.SOURCE, 'renaultgroup')
  assert.equal(renault.COMPANY, 'Renault Group')
  assert.equal(renault.HOMEPAGE_URL, 'https://www.renaultgroup.com/en/')
  assert.equal(renault.CAREERS_URL, 'https://www.renaultgroup.com/en/careers/')
  assert.equal(
    renault.WORKDAY_BOARD_URL,
    'https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers',
  )
  assert.equal(
    renault.WORKDAY_JOBS_API_URL,
    'https://alliancewd.wd3.myworkdayjobs.com/wday/cxs/alliancewd/renault-group-careers/jobs',
  )
  assert.equal(renault.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(renault.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(renault.hasOfficialWorkdayBoardSignal(workdayBoardHtml), true)
})

test('Renault Group run delegates to the Workday engine after verifying the first-party surfaces', async () => {
  const renault = await loadModule()

  const requestedUrls = []
  const jobs = await renault.createRenaultGroupScraper({
    now: () => '2026-08-04T00:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === renault.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === renault.CAREERS_URL) return { status: 200, url, html: careersHtml }
      if (url === renault.WORKDAY_BOARD_URL) return { status: 200, url, html: workdayBoardHtml }
      throw new Error(`Unexpected Renault Group URL: ${url}`)
    },
    runWorkday: async (options) => {
      assert.equal(options.company, 'Renault Group')
      assert.equal(options.source, 'renaultgroup')
      assert.equal(
        options.baseUrl,
        'https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers',
      )
      assert.match(options.scraperDir, /renaultgroup$/i)
      return [{
        title: 'Officer - Process Associate Accounts Payable',
        location: 'Chennai, India',
        link: 'https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers/job/Chennai/Officer---Process-Associate-Accounts-Payable_JOBREQ_50268105',
        jobId: 'JOBREQ_50268105',
      }]
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.renaultgroup.com/en/',
    'https://www.renaultgroup.com/en/careers/',
    'https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers',
  ])
  assert.deepEqual(jobs, [{
    title: 'Officer - Process Associate Accounts Payable',
    location: 'Chennai, India',
    link: 'https://alliancewd.wd3.myworkdayjobs.com/en-US/renault-group-careers/job/Chennai/Officer---Process-Associate-Accounts-Payable_JOBREQ_50268105',
    jobId: 'JOBREQ_50268105',
    company: 'Renault Group',
    source: 'renaultgroup',
    scrapedAt: '2026-08-04T00:00:00.000Z',
  }])
})

test('Renault Group fails closed when a trusted first-party surface changes materially', async () => {
  const renault = await loadModule()

  await assert.rejects(
    renault.createRenaultGroupScraper().run({
      fetchPage: async () => ({ status: 200, url: 'https://www.renaultgroup.com/en/', html: '<html><body><h1>Unexpected homepage</h1></body></html>' }),
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    renault.createRenaultGroupScraper().run({
      fetchPage: async (url) => {
        if (url === renault.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        return { status: 200, url, html: '<html><body><h1>Unexpected careers page</h1></body></html>' }
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    renault.createRenaultGroupScraper().run({
      fetchPage: async (url) => {
        if (url === renault.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === renault.CAREERS_URL) return { status: 200, url, html: careersHtml }
        return { status: 200, url, html: '<html><body><h1>Unexpected Workday shell</h1></body></html>' }
      },
    }),
    /verified Workday board/i,
  )
})
