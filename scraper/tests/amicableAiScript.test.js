import assert from 'node:assert/strict'
import test from 'node:test'

const loadAmicableAiModule = async () => {
  try {
    return await import('../amicableai/script.js')
  } catch {
    assert.fail('Expected Amicable AI scraper module at ../amicableai/script.js')
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>amicable | Relationships, divorce, separation, co-parenting</title>
  </head>
  <body>
    <header>
      <nav>
        <a href="/our-story">Our story</a>
        <a href="/careers" class="nav-link nl-dropdown-list">Careers</a>
        <a href="/partnerships">Partnerships</a>
      </nav>
    </header>
    <main>
      <h1>We’re the trusted legal service for separating couples.</h1>
      <p>Our approach is unique in helping couples navigate separation together.</p>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers: explore our vacancies | amicable</title>
  </head>
  <body>
    <main>
      <h1>Explore a career at amicable</h1>
      <p>Join the trusted legal service for separating couples on a mission to help couples separate in a kinder and more affordable way.</p>
      <p>
        Although we currently have no open positions, please feel free to send an email to
        <a href="mailto:jobs@amicable.co.uk">jobs@amicable.co.uk</a>
        as a speculative applicant to be notified of future opportunities.
      </p>
      <a href="#explore-vacancies" class="cta c-home w-button">Explore open vacancies</a>
      <div class="iframe-wrapper">
        <iframe
          frameborder="0"
          src="https://app.screenloop.com/careers/amicable"
          title="Plentific careers page"
        ></iframe>
      </div>
    </main>
  </body>
</html>
`

const staleScreenloopBoardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Screenloop</title>
  </head>
  <body>
    <script>
      window.__SCREENLOOP__ = "{&quot;jobPosts&quot;:[{&quot;id&quot;:8602,&quot;name&quot;:&quot;Marketing Director &quot;,&quot;location&quot;:{&quot;name&quot;:&quot;33 Holborn, London&quot;,&quot;country&quot;:&quot;United Kingdom of Great Britain and Northern Ireland&quot;}},{&quot;id&quot;:8610,&quot;name&quot;:&quot;Negotiation Divorce Specialist&quot;,&quot;location&quot;:{&quot;name&quot;:&quot;Remote&quot;,&quot;country&quot;:&quot;United Kingdom of Great Britain and Northern Ireland&quot;}},{&quot;id&quot;:8626,&quot;name&quot;:&quot;Entry level roles (Tech, Customer support, Legal admin, Finance)&quot;,&quot;location&quot;:{&quot;name&quot;:&quot;London&quot;,&quot;country&quot;:&quot;United Kingdom of Great Britain and Northern Ireland&quot;}}]}";
    </script>
  </body>
</html>
`

test('Amicable AI sentinel helpers stay pinned to the verified homepage, no-openings careers page, and stale Screenloop board', async () => {
  const amicableAi = await loadAmicableAiModule()

  assert.equal(amicableAi.SOURCE, 'amicableai')
  assert.equal(amicableAi.COMPANY, 'Amicable AI')
  assert.equal(amicableAi.VERIFIED_AT, '2026-07-15')
  assert.equal(amicableAi.HOMEPAGE_URL, 'https://amicable.io/')
  assert.equal(amicableAi.CAREERS_URL, 'https://amicable.io/careers')
  assert.equal(amicableAi.SCREENLOOP_BOARD_URL, 'https://app.screenloop.com/careers/amicable')
  assert.equal(amicableAi.SPECULATIVE_APPLY_EMAIL, 'jobs@amicable.co.uk')

  assert.equal(amicableAi.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(
    amicableAi.extractHomepageCareerUrl(homepageHtml),
    'https://amicable.io/careers',
  )
  assert.equal(amicableAi.hasNoOpeningsCareersSignal(careersHtml), true)
  assert.equal(
    amicableAi.extractScreenloopBoardUrl(careersHtml),
    'https://app.screenloop.com/careers/amicable',
  )
  assert.deepEqual(amicableAi.extractStaleScreenloopJobTitles(staleScreenloopBoardHtml), [
    'Marketing Director',
    'Negotiation Divorce Specialist',
    'Entry level roles (Tech, Customer support, Legal admin, Finance)',
  ])
  assert.equal(amicableAi.screenloopBoardHasIndiaRoles(staleScreenloopBoardHtml), false)
  assert.equal(amicableAi.hasStaleScreenloopBoardSignal(staleScreenloopBoardHtml), true)
})

test('Amicable AI returns no jobs only while the verified careers page says there are no open positions and the hidden Screenloop board remains stale', async () => {
  const amicableAi = await loadAmicableAiModule()
  const requestedUrls = []

  const jobs = await amicableAi.createAmicableAiScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === amicableAi.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === amicableAi.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      if (url === amicableAi.SCREENLOOP_BOARD_URL) {
        return { status: 200, url, html: staleScreenloopBoardHtml }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    amicableAi.HOMEPAGE_URL,
    amicableAi.CAREERS_URL,
    amicableAi.SCREENLOOP_BOARD_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Amicable AI fails closed when the verified homepage, careers copy, or stale Screenloop board drift', async () => {
  const amicableAi = await loadAmicableAiModule()

  await assert.rejects(
    amicableAi.createAmicableAiScraper().run({
      fetchPage: async (url) => {
        if (url === amicableAi.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Unexpected homepage</body></html>' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    amicableAi.createAmicableAiScraper().run({
      fetchPage: async (url) => {
        if (url === amicableAi.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === amicableAi.CAREERS_URL) {
          return {
            status: 200,
            url,
            html: careersHtml.replace(
              'Although we currently have no open positions, please feel free to send an email to',
              'We are hiring now, please apply directly to',
            ),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified no-openings careers surface/i,
  )

  await assert.rejects(
    amicableAi.createAmicableAiScraper().run({
      fetchPage: async (url) => {
        if (url === amicableAi.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === amicableAi.CAREERS_URL) {
          return { status: 200, url, html: careersHtml }
        }

        if (url === amicableAi.SCREENLOOP_BOARD_URL) {
          return {
            status: 200,
            url,
            html: staleScreenloopBoardHtml.replace(
              'United Kingdom of Great Britain and Northern Ireland',
              'India',
            ).replace('33 Holborn, London', 'Bengaluru, India'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /no-public-careers surface no longer holds|screenloop board/i,
  )
})
