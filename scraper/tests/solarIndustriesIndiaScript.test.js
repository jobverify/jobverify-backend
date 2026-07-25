import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Solar Group</title>
  </head>
  <body>
    <nav>
      <a href="https://careers.solargroup.com/solargroup/">Careers</a>
    </nav>
    <h1>Solar Group</h1>
    <p>Consolidating our Position on the Global Scale</p>
  </body>
</html>
`

const blockedBoardPage = {
  status: 403,
  url: 'https://careers.solargroup.com/solargroup/',
  html: '<html><body><h1>403 Forbidden</h1><p>Access denied.</p></body></html>',
  errorKind: null,
}

const blockedJobViewPage = {
  status: 403,
  url: 'https://careers.solargroup.com/solargroup/jobview/sr-executive-uav-2024122016373073',
  html: '<html><body><h1>403 Forbidden</h1><p>Access denied.</p></body></html>',
  errorKind: null,
}

const loadSolarIndustriesIndiaModule = async () => {
  try {
    return await import('../solarindustriesindia/script.js')
  } catch {
    assert.fail('Expected Solar Industries India scraper module at ../solarindustriesindia/script.js')
  }
}

test('Solar Industries India scraper constants stay pinned to the verified Solar Group careers handoff and blocked sample jobview', async () => {
  const solarIndustriesIndia = await loadSolarIndustriesIndiaModule()

  assert.equal(solarIndustriesIndia.SOURCE, 'solarindustriesindia')
  assert.equal(solarIndustriesIndia.COMPANY, 'Solar Industries India')
  assert.equal(solarIndustriesIndia.HOMEPAGE_URL, 'https://www.solargroup.com/')
  assert.equal(solarIndustriesIndia.CAREERS_BOARD_URL, 'https://careers.solargroup.com/solargroup/')
  assert.equal(
    solarIndustriesIndia.SAMPLE_JOB_VIEW_URL,
    'https://careers.solargroup.com/solargroup/jobview/sr-executive-uav-2024122016373073',
  )
  assert.equal(solarIndustriesIndia.VERIFIED_AT, '2026-07-17')
  assert.equal(solarIndustriesIndia.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(
    solarIndustriesIndia.extractCareersBoardUrl(homepageHtml),
    'https://careers.solargroup.com/solargroup/',
  )
  assert.equal(solarIndustriesIndia.hasBlockedOrTimedOutSurface(blockedBoardPage), true)
  assert.equal(solarIndustriesIndia.hasBlockedOrTimedOutSurface({ status: null, html: null, errorKind: 'timeout' }), true)
  assert.equal(
    solarIndustriesIndia.hasUnexpectedPublicBoardSignal({
      status: 200,
      html: '<html><body><h2>Current Openings</h2><button>Search Jobs</button><a href="/jobview/1">Apply</a></body></html>',
    }),
    true,
  )
})

test('Solar Industries India returns no jobs while the board root and sample jobview stay blocked or time out', async () => {
  const solarIndustriesIndia = await loadSolarIndustriesIndiaModule()
  const requestedUrls = []

  const blockedJobs = await solarIndustriesIndia.createSolarIndustriesIndiaScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === solarIndustriesIndia.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml, errorKind: null }
      }

      if (url === solarIndustriesIndia.CAREERS_BOARD_URL) {
        return blockedBoardPage
      }

      if (url === solarIndustriesIndia.SAMPLE_JOB_VIEW_URL) {
        return blockedJobViewPage
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    solarIndustriesIndia.HOMEPAGE_URL,
    solarIndustriesIndia.CAREERS_BOARD_URL,
    solarIndustriesIndia.SAMPLE_JOB_VIEW_URL,
  ])
  assert.deepEqual(blockedJobs, [])

  const timeoutJobs = await solarIndustriesIndia.createSolarIndustriesIndiaScraper().run({
    fetchPage: async (url) => {
      if (url === solarIndustriesIndia.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml, errorKind: null }
      }

      return { status: null, url, html: null, errorKind: 'timeout' }
    },
  })

  assert.deepEqual(timeoutJobs, [])
})

test('Solar Industries India fails closed when the homepage handoff drifts or the careers board becomes directly readable', async () => {
  const solarIndustriesIndia = await loadSolarIndustriesIndiaModule()

  await assert.rejects(
    solarIndustriesIndia.createSolarIndustriesIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === solarIndustriesIndia.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: homepageHtml.replace('https://careers.solargroup.com/solargroup/', 'https://example.com/jobs'),
            errorKind: null,
          }
        }

        return blockedBoardPage
      },
    }),
    /verified careers handoff/i,
  )

  await assert.rejects(
    solarIndustriesIndia.createSolarIndustriesIndiaScraper().run({
      fetchPage: async (url) => {
        if (url === solarIndustriesIndia.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml, errorKind: null }
        }

        if (url === solarIndustriesIndia.CAREERS_BOARD_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h2>Current Openings</h2><button>Search Jobs</button></body></html>',
            errorKind: null,
          }
        }

        return blockedJobViewPage
      },
    }),
    /careers board surface/i,
  )
})
