import assert from 'node:assert/strict'
import test from 'node:test'

const aboutPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us - Lava International Limited</title>
  </head>
  <body>
    <h1>About Us</h1>
    <nav>
      <a href="https://www.lavamobiles.com/about-us">About Us</a>
      <a href="https://www.lavamobiles.com/career">Career</a>
    </nav>
    <h2>OUR CULTURE AND PHILOSOPHY</h2>
    <p>A strong culture is what separates great companies from those that perish sooner or later.</p>
    <p>To empower people to do more, to be more.</p>
    <h2>LEADERSHIP</h2>
    <p>Hari Om Rai</p>
    <p>Started in 2009 | 30,000+ people | Most Trusted Brand in India</p>
    <p>Lava International Limited is a leading Mobile Handset Company in India</p>
    <p>Make In India phones with complete control on design and manufacturing within India.</p>
    <p>Head Office: Noida, India</p>
  </body>
</html>
`

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>career - Lava International Limited</title>
  </head>
  <body>
    <h1>career</h1>
    <a href="https://www.lavamobiles.com/">Home</a>
    <p>It isn’t just a career. It’s an opportunity that lets you create possibilities.</p>
    <p>Join two of the fastest growing consumer brands in India - Lava and Xolo.</p>
    <p>Come join us and together lets create products that make a difference for the rest of the world.</p>
    <p>To explore the opportunities at Lava, please share your updated Resume on mail id : careers@lavainternational.in</p>
    <a href="mailto:careers@lavainternational.in">Apply by email</a>
    <footer>Copyright © Lava International Limited</footer>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Open Positions</h1>
    <a href="https://jobs.example.com/software-engineer">Apply now</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/lavainternational/script.js')
  } catch {
    assert.fail('Expected Lava International scraper module at ../../scraper/lavainternational/script.js')
  }
}

test('Lava International scraper exports the verified resume-only careers contract', async () => {
  const lavainternational = await loadModule()

  assert.equal(lavainternational.COMPANY, 'Lava International')
  assert.equal(lavainternational.OFFICIAL_BRAND_NAME, 'Lava International Limited')
  assert.equal(lavainternational.VERIFIED_ON, '2026-07-16')
  assert.equal(lavainternational.HOMEPAGE_URL, 'https://shop.lavamobiles.com/')
  assert.equal(lavainternational.ABOUT_PAGE_URL, 'https://shop.lavamobiles.com/pages/about-us')
  assert.equal(lavainternational.CAREERS_URL, 'https://shop.lavamobiles.com/pages/career')
  assert.equal(lavainternational.APPLICATION_EMAIL, 'careers@lavainternational.in')
  assert.equal(lavainternational.APPLICATION_URL, 'mailto:careers@lavainternational.in')
  assert.equal(lavainternational.hasOfficialAboutPageSignal(aboutPageHtml), true)
  assert.equal(lavainternational.hasResumeOnlyCareersSignal(careersPageHtml), true)
  assert.equal(lavainternational.pageExposesPublicJobListings(aboutPageHtml), false)
  assert.equal(lavainternational.pageExposesPublicJobListings(careersPageHtml), false)
  assert.equal(lavainternational.pageExposesPublicJobListings(publicJobsHtml), true)
})

test('Lava International returns [] only while the verified about page and resume-only careers page stay unchanged', async () => {
  const lavainternational = await loadModule()
  const requestedUrls = []

  const jobs = await lavainternational.createLavaInternationalScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === lavainternational.ABOUT_PAGE_URL) {
        return { ok: true, status: 200, url, text: aboutPageHtml }
      }

      if (url === lavainternational.CAREERS_URL) {
        return { ok: true, status: 200, url, text: careersPageHtml }
      }

      if (lavainternational.NO_PUBLIC_CAREER_ROUTE_URLS.includes(url)) {
        return { ok: false, status: 404, url, text: '<html><body>Not found</body></html>' }
      }

      throw new Error(`Unexpected Lava International URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    lavainternational.ABOUT_PAGE_URL,
    lavainternational.CAREERS_URL,
    ...lavainternational.NO_PUBLIC_CAREER_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Lava International fails closed when the verified surface drifts into public job listings or new live routes', async () => {
  const lavainternational = await loadModule()

  await assert.rejects(
    lavainternational.createLavaInternationalScraper().run({
      fetchPage: async (url) => {
        if (url === lavainternational.ABOUT_PAGE_URL) {
          return { ok: true, status: 200, url, text: '<html><body>Unexpected</body></html>' }
        }

        if (url === lavainternational.CAREERS_URL) {
          return { ok: true, status: 200, url, text: careersPageHtml }
        }

        if (lavainternational.NO_PUBLIC_CAREER_ROUTE_URLS.includes(url)) {
          return { ok: false, status: 404, url, text: '<html><body>Not found</body></html>' }
        }

        throw new Error(`Unexpected Lava International URL: ${url}`)
      },
    }),
    /verified official about page/i,
  )

  await assert.rejects(
    lavainternational.createLavaInternationalScraper().run({
      fetchPage: async (url) => {
        if (url === lavainternational.ABOUT_PAGE_URL) {
          return { ok: true, status: 200, url, text: aboutPageHtml }
        }

        if (url === lavainternational.CAREERS_URL) {
          return { ok: true, status: 200, url, text: publicJobsHtml }
        }

        if (lavainternational.NO_PUBLIC_CAREER_ROUTE_URLS.includes(url)) {
          return { ok: false, status: 404, url, text: '<html><body>Not found</body></html>' }
        }

        throw new Error(`Unexpected Lava International URL: ${url}`)
      },
    }),
    /resume-only careers page/i,
  )

  await assert.rejects(
    lavainternational.createLavaInternationalScraper().run({
      fetchPage: async (url) => {
        if (url === lavainternational.ABOUT_PAGE_URL) {
          return { ok: true, status: 200, url, text: aboutPageHtml }
        }

        if (url === lavainternational.CAREERS_URL) {
          return { ok: true, status: 200, url, text: careersPageHtml }
        }

        if (lavainternational.NO_PUBLIC_CAREER_ROUTE_URLS.includes(url)) {
          return { ok: true, status: 200, url, text: publicJobsHtml }
        }

        throw new Error(`Unexpected Lava International URL: ${url}`)
      },
    }),
    /verified no-public-careers route changed/i,
  )
})
