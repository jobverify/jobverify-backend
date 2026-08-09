import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aalekh Designs, Rajkot | Packaging Designer in Rajkot | Corrugated Box Manufacturer in Rajkot | Graphics Designer in Rajkot | Catalogue Designer in Rajkot | Logo Designer in Rajkot</title>
  </head>
  <body>
    <a href="https://aalekh.co">Home</a>
    <a href="#about-us">About</a>
    <a href="#portfolio">Portfolio</a>
    <a href="#testimonial">Testimonial</a>
    <a href="https://aalekh.co/contactUs">Contact Us</a>
    <h1>HELLO NAMASTHE !</h1>
    <h2>Creative and Unique Design</h2>
    <p>We are more than just a Creative Agency! As a Premier Designing hub in Rajkot (Gujarat - India), <b>Aalekh Designs</b> develops Logos, Catalogues & Brochures, Attractive Corporate Identity, Packaging Design & Stationery Design along with Web Development.</p>
    <p>Our Designs are always exclusively designed for you.</p>
    <a href="https://aalekh.co/contactUs">Get in Touch</a>
    <p>© 2026 - All RIGHTS RESERVED - AALEKH DESIGNS</p>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Aalekh Designs Rajkot, graphics design rajkot, catalog designer rajkot, brochure designer rajkot, logo design rajkot, visiting card maker rajkot, graphic design company rajkot, visiting card printing rajkot, Outsourcing company rajkot, graphics design outsourcing companies rajkot, box designing rajkot, packaging designing rajkot</title>
  </head>
  <body>
    <h1>GET IN TOUCH.</h1>
    <h2>CONTACT US</h2>
    <p>If you are looking for Logos, Catalogues & Brochures, Attractive Corporate Identity, Packaging Design & Stationery Design along with Web Development then, you are at the right foot step.</p>
    <h3>CALL US</h3>
    <p><a href="tel:+91 88667 88663">+91 88667 88663</a></p>
    <h3>EMAIL US</h3>
    <p><a href="mailto:info@aalekh.co">info@aalekh.co</a></p>
    <h3>ADDRESS</h3>
    <p>Rajkot, Gujarat</p>
    <h2>CONTACT FORM</h2>
    <form action="https://aalekh.co/sendMail">
      <input name="person_name">
      <input name="company_name">
      <input name="email">
      <input name="mobile">
      <textarea name="description"></textarea>
      <button type="submit">SUBMIT</button>
    </form>
  </body>
</html>
`

const missingRouteHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Not Found</title>
  </head>
  <body>
    <div class="code">404</div>
    <div class="message">Not Found</div>
  </body>
</html>
`

const loadAalekhModule = async () => {
  try {
    return await import('../../scraper/aalekh/script.js')
  } catch {
    assert.fail('Expected Aalekh scraper module at ../../scraper/aalekh/script.js')
  }
}

test('Aalekh sentinel pins the verified first-party no-public-careers surface from July 14, 2026', async () => {
  const aalekh = await loadAalekhModule()

  assert.equal(aalekh.SOURCE, 'aalekh')
  assert.equal(aalekh.COMPANY, 'Aalekh')
  assert.equal(aalekh.OFFICIAL_BRAND_NAME, 'Aalekh Designs')
  assert.equal(aalekh.VERIFIED_ON, '2026-07-14')
  assert.equal(aalekh.HOMEPAGE_URL, 'https://aalekh.co/')
  assert.equal(aalekh.CONTACT_URL, 'https://aalekh.co/contactUs')
  assert.equal(aalekh.ROBOTS_TXT_URL, 'https://aalekh.co/robots.txt')
  assert.equal(aalekh.SITEMAP_URL, 'https://aalekh.co/sitemap.xml')
  assert.deepEqual(aalekh.CAREERS_ROUTE_URLS, [
    'https://aalekh.co/careers',
    'https://aalekh.co/career',
    'https://aalekh.co/jobs',
    'https://aalekh.co/job',
    'https://aalekh.co/join-us',
    'https://aalekh.co/openings',
  ])
  assert.match(aalekh.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)

  assert.equal(aalekh.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(aalekh.hasOfficialContactSignal(contactHtml), true)
  assert.equal(aalekh.hasFirstPartyCareerLikeLink(homepageHtml), false)
  assert.equal(aalekh.hasFirstPartyCareerLikeLink('<a href="https://aalekh.co/careers">Careers</a>'), true)
  assert.equal(aalekh.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(
    aalekh.hasPublicJobsSignal('<a href="https://jobs.lever.co/aalekh">Open positions</a>'),
    true,
  )
  assert.equal(
    aalekh.isVerifiedMissingFirstPartyRoute({
      status: 404,
      url: aalekh.CAREERS_ROUTE_URLS[0],
      html: missingRouteHtml,
    }),
    true,
  )
})

test('Aalekh sentinel returns [] only while the verified first-party surface exposes no public jobs board', async () => {
  const aalekh = await loadAalekhModule()
  const requestedUrls = []

  const jobs = await aalekh.createAalekhScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === aalekh.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === aalekh.CONTACT_URL) {
        return { status: 200, url, html: contactHtml }
      }

      if (url === aalekh.ROBOTS_TXT_URL || url === aalekh.SITEMAP_URL) {
        return { status: 404, url, html: missingRouteHtml }
      }

      if (aalekh.CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected Aalekh URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    aalekh.HOMEPAGE_URL,
    aalekh.CONTACT_URL,
    aalekh.ROBOTS_TXT_URL,
    aalekh.SITEMAP_URL,
    ...aalekh.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Aalekh sentinel fails closed when the verified first-party surface drifts into a public jobs surface', async () => {
  const aalekh = await loadAalekhModule()

  await assert.rejects(
    aalekh.createAalekhScraper().run({
      fetchPage: async (url) => {
        if (url === aalekh.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: `${homepageHtml}<a href="https://aalekh.co/careers">Careers</a>`,
          }
        }

        throw new Error(`Unexpected Aalekh URL: ${url}`)
      },
    }),
    /homepage now exposes a first-party careers or jobs link/i,
  )

  await assert.rejects(
    aalekh.createAalekhScraper().run({
      fetchPage: async (url) => {
        if (url === aalekh.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aalekh.CONTACT_URL) {
          return { status: 200, url, html: contactHtml }
        }

        if (url === aalekh.ROBOTS_TXT_URL) {
          return { status: 404, url, html: missingRouteHtml }
        }

        if (url === aalekh.SITEMAP_URL) {
          return { status: 200, url, html: '<html><body><a href="/careers">Careers</a></body></html>' }
        }

        return { status: 404, url, html: missingRouteHtml }
      },
    }),
    /sitemap surface no longer matches the verified first-party no-careers surface/i,
  )

  await assert.rejects(
    aalekh.createAalekhScraper().run({
      fetchPage: async (url) => {
        if (url === aalekh.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aalekh.CONTACT_URL) {
          return { status: 200, url, html: contactHtml }
        }

        if (url === aalekh.ROBOTS_TXT_URL || url === aalekh.SITEMAP_URL) {
          return { status: 404, url, html: missingRouteHtml }
        }

        if (url === aalekh.CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><a href="https://jobs.lever.co/aalekh">Apply now</a></body></html>',
          }
        }

        return { status: 404, url, html: missingRouteHtml }
      },
    }),
    /careers route changed materially or now exposes public jobs/i,
  )
})
