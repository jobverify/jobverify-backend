import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>iBall - Electronics & Peripherals</title>
  </head>
  <body>
    <main>
      <h1>Designed for Excellence.</h1>
      <p>Since 2001.</p>
      <nav>
        <a href="/pages/about-us">About iBall</a>
        <span>Careers</span>
        <a href="/blogs/news-center">News Center</a>
      </nav>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us - iBall</title>
  </head>
  <body>
    <h1>About iBall</h1>
    <p>Commitment to India</p>
    <p>Corporate Office</p>
    <p>93, Mistry Industrial Complex, M.I.D.C Cross Road 'A', Andheri (East), Mumbai - 400 093</p>
    <p>enquiry@iball.co.in</p>
  </body>
</html>
`

const newsCenterHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>News Center - iBall</title>
  </head>
  <body>
    <h1>Press Release</h1>
    <article>iBall Debuts Cinebar 560 Soundbar Featuring 800W Power with Dolby Audio</article>
    <article>iBall Announces Strategic Expansion with Launch of GLIDR Ai1 AI Mouse</article>
    <article>iBall enters a New Era of growth phase, after acquisition by Zebronics</article>
  </body>
</html>
`

const nonJobsCareersRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>iBall - Electronics & Peripherals</title>
  </head>
  <body>
    <h1>Designed for Excellence.</h1>
    <p>Since 2001.</p>
    <footer>Company Careers News Center</footer>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - iBall</title>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="/jobs/ecommerce-category-specialist">Apply Now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/iball/script.js')
  } catch {
    assert.fail('Expected iBall scraper module at ../../scraper/iball/script.js')
  }
}

test('iBall sentinel pins the verified homepage, about page, news center, and no-public-jobs signals', async () => {
  const iBall = await loadModule()

  assert.equal(iBall.SOURCE, 'iball')
  assert.equal(iBall.COMPANY, 'iBall')
  assert.equal(iBall.HOMEPAGE_URL, 'https://iball.co.in/')
  assert.equal(iBall.ABOUT_URL, 'https://iball.co.in/pages/about-us')
  assert.equal(iBall.NEWS_CENTER_URL, 'https://iball.co.in/blogs/news-center')
  assert.deepEqual(iBall.COMMON_CAREERS_ROUTES, [
    'https://iball.co.in/pages/careers',
    'https://iball.co.in/pages/career',
    'https://iball.co.in/careers',
    'https://iball.co.in/jobs',
    'https://iball.co.in/join-us',
  ])
  assert.equal(iBall.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(iBall.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(iBall.hasOfficialNewsCenterSignal(newsCenterHtml), true)
  assert.equal(iBall.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(iBall.hasPublicJobsSignal(publicJobsHtml), true)
})

test('iBall returns no jobs only while its verified first-party routes remain non-job surfaces', async () => {
  const iBall = await loadModule()
  const requested = []

  const jobs = await iBall.createIBallScraper().run({
    fetchPage: async (url) => {
      requested.push(url)

      if (url === iBall.HOMEPAGE_URL) {
        return { ok: true, status: 200, url, text: homepageHtml }
      }

      if (url === iBall.ABOUT_URL) {
        return { ok: true, status: 200, url, text: aboutHtml }
      }

      if (url === iBall.NEWS_CENTER_URL) {
        return { ok: true, status: 200, url, text: newsCenterHtml }
      }

      if (iBall.COMMON_CAREERS_ROUTES.includes(url)) {
        return { ok: false, status: 404, url, text: nonJobsCareersRouteHtml }
      }

      throw new Error(`Unexpected iBall fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requested, [
    iBall.HOMEPAGE_URL,
    iBall.ABOUT_URL,
    iBall.NEWS_CENTER_URL,
    ...iBall.COMMON_CAREERS_ROUTES,
  ])
  assert.deepEqual(jobs, [])
})

test('iBall fails closed when a verified page drifts or a careers route starts exposing public jobs', async () => {
  const iBall = await loadModule()

  await assert.rejects(
    iBall.createIBallScraper().run({
      fetchPage: async (url) => {
        if (url === iBall.HOMEPAGE_URL) {
          return { ok: true, status: 200, url, text: '<html><body><h1>Unexpected</h1></body></html>' }
        }

        throw new Error(`Unexpected iBall fixture URL: ${url}`)
      },
    }),
    /official iBall homepage/i,
  )

  await assert.rejects(
    iBall.createIBallScraper().run({
      fetchPage: async (url) => {
        if (url === iBall.HOMEPAGE_URL) return { ok: true, status: 200, url, text: homepageHtml }
        if (url === iBall.ABOUT_URL) return { ok: true, status: 200, url, text: '<html><body><h1>About</h1></body></html>' }
        throw new Error(`Unexpected iBall fixture URL: ${url}`)
      },
    }),
    /official iBall about page/i,
  )

  await assert.rejects(
    iBall.createIBallScraper().run({
      fetchPage: async (url) => {
        if (url === iBall.HOMEPAGE_URL) return { ok: true, status: 200, url, text: homepageHtml }
        if (url === iBall.ABOUT_URL) return { ok: true, status: 200, url, text: aboutHtml }
        if (url === iBall.NEWS_CENTER_URL) return { ok: true, status: 200, url, text: newsCenterHtml }
        if (url === iBall.COMMON_CAREERS_ROUTES[0]) {
          return { ok: true, status: 200, url, text: publicJobsHtml }
        }
        if (iBall.COMMON_CAREERS_ROUTES.slice(1).includes(url)) {
          return { ok: false, status: 404, url, text: nonJobsCareersRouteHtml }
        }

        throw new Error(`Unexpected iBall fixture URL: ${url}`)
      },
    }),
    /careers route now exposes public jobs|public jobs surface/i,
  )
})
