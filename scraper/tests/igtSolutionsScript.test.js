import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers at Atain | Grow, Innovate and Create Real Impact</title>
    <link rel="canonical" href="https://atain.com/careers/" />
    <meta name="description" content="Explore careers with us. Find opportunities across roles and global locations." />
  </head>
  <body>
    <a class="elementor-button" href="https://atain.com/join-the-squad/">Join Our Squad</a>
    <p>Explore careers with us. Find opportunities across roles and global locations.</p>
  </body>
</html>
`

const joinTheSquadHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Join Our Squad</title>
  </head>
  <body>
    <h1>Join Our Squad</h1>
    <p>Upload Resume*</p>
    <p>Atain is an Equal Employment Opportunity employer.</p>
    <p>If you are unable or limited in your ability to access job openings through this site, apply for jobs through Atain's online system, or at any point in the selection process, please email Accommodations@atain.com.</p>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en-US">
  <body>
    <span id="tile-search-results-label">Showing 1 to 25 of 80 Jobs</span>
    <a class="jobTitle-link" href="/job/Gurugram-Process-Associate-HR/1168719155/">Process Associate</a>
  </body>
</html>
`

const loadIgtSolutionsModule = async () => {
  try {
    return await import('../igtsolutions/script.js')
  } catch {
    assert.fail('Expected IGT Solutions scraper module at ../igtsolutions/script.js')
  }
}

test('IGT Solutions sentinel constants stay pinned to the verified first-party surfaces from July 16, 2026', async () => {
  const igtsolutions = await loadIgtSolutionsModule()

  assert.equal(igtsolutions.SOURCE, 'igtsolutions')
  assert.equal(igtsolutions.COMPANY, 'IGT Solutions')
  assert.equal(igtsolutions.VERIFIED_ON, '2026-07-16')
  assert.equal(igtsolutions.CAREERS_URL, 'https://www.igtsolutions.com/careers/')
  assert.equal(igtsolutions.JOIN_SQUAD_URL, 'https://atain.com/join-the-squad/')
  assert.deepEqual(igtsolutions.LEGACY_BOARD_URLS, [
    'https://careers.igtsolutions.com/',
    'https://careers.igtsolutions.com/go/India/8956655/',
  ])
  assert.match(igtsolutions.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(igtsolutions.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(igtsolutions.hasJoinSquadSignal(joinTheSquadHtml), true)
  assert.equal(igtsolutions.hasPublicJobsSignal(officialCareersHtml), false)
  assert.equal(igtsolutions.hasPublicJobsSignal(joinTheSquadHtml), false)
  assert.equal(igtsolutions.hasPublicJobsSignal(publicJobsHtml), true)
  assert.equal(
    igtsolutions.isLegacyBoardUnavailable({
      status: 403,
      url: igtsolutions.LEGACY_BOARD_URLS[0],
      html: '',
    }),
    true,
  )
})

test('IGT Solutions returns [] only while the verified careers page remains a join-form flow and the legacy board stays inaccessible', async () => {
  const igtsolutions = await loadIgtSolutionsModule()
  const requestedUrls = []

  const jobs = await igtsolutions.createIgtSolutionsScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === igtsolutions.CAREERS_URL) {
        return { status: 200, url, html: officialCareersHtml }
      }

      if (url === igtsolutions.JOIN_SQUAD_URL) {
        return { status: 200, url, html: joinTheSquadHtml }
      }

      if (igtsolutions.LEGACY_BOARD_URLS.includes(url)) {
        return { status: 403, url, html: '' }
      }

      throw new Error(`Unexpected IGT Solutions URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    igtsolutions.CAREERS_URL,
    igtsolutions.JOIN_SQUAD_URL,
    ...igtsolutions.LEGACY_BOARD_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('IGT Solutions fails closed when the verified careers surface drifts into a public board or the legacy ATS reopens', async () => {
  const igtsolutions = await loadIgtSolutionsModule()

  await assert.rejects(
    igtsolutions.createIgtSolutionsScraper().run({
      fetchPage: async (url) => {
        if (url === igtsolutions.CAREERS_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected IGT Solutions URL: ${url}`)
      },
    }),
    /verified official careers page/i,
  )

  await assert.rejects(
    igtsolutions.createIgtSolutionsScraper().run({
      fetchPage: async (url) => {
        if (url === igtsolutions.CAREERS_URL) {
          return { status: 200, url, html: officialCareersHtml }
        }

        if (url === igtsolutions.JOIN_SQUAD_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        return { status: 403, url, html: '' }
      },
    }),
    /verified join-the-squad page/i,
  )

  await assert.rejects(
    igtsolutions.createIgtSolutionsScraper().run({
      fetchPage: async (url) => {
        if (url === igtsolutions.CAREERS_URL) {
          return { status: 200, url, html: officialCareersHtml }
        }

        if (url === igtsolutions.JOIN_SQUAD_URL) {
          return { status: 200, url, html: joinTheSquadHtml }
        }

        if (url === igtsolutions.LEGACY_BOARD_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        return { status: 403, url, html: '' }
      },
    }),
    /legacy careers board changed/i,
  )
})
