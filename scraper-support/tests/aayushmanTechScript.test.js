import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Aayushman Technologies - Your Partner in Web Development, Digital Marketing, and App Solutions</title>
  </head>
  <body>
    <nav>
      <a href="https://www.aayushmantech.com/">Home</a>
      <a href="https://www.aayushmantech.com/blank-3">Services</a>
      <a href="https://www.aayushmantech.com/company">Company</a>
      <a href="#quote">Request A Quote</a>
    </nav>
    <main>
      <h2>A Design & Technology Focused Digital Agency</h2>
      <p>Empower your business's digital journey with Aayushman's transformative web development solutions.</p>
      <section>
        <h3>Hire Experienced Developers</h3>
        <p>Join forces with our team of experienced developers today, and let's embark on a journey to build something extraordinary together.</p>
      </section>
      <section>
        <h3>Why Partner with Aayushman</h3>
        <p>Aayushman Technologies specializes in developing cutting-edge solutions tailored to meet the unique needs of your business.</p>
      </section>
    </main>
    <footer>
      <p>Email: Info@aayushmantechnologies.in</p>
      <p>Tel: +91 9930291005</p>
      <p>Address: B-5, Chandradarshan, Akurli X rd. No. 2, Kandivali East, Mumbai 101, India.</p>
      <p>&copy; 2025 by Aayushman Tech Services Pvt. Ltd.</p>
    </footer>
  </body>
</html>
`

const companyPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Company | Aayushman</title>
    <link rel="canonical" href="https://www.aayushmantech.com/company">
  </head>
  <body>
    <main>
      <h6>We're Aayushman</h6>
      <h3>We're on a Mission to Digitalise Your Business</h3>
      <h2>Our Story</h2>
      <p>Established by a team of seasoned digital professionals, Aayushman emerged from a vision to synchronize traditional business paradigms with the dynamic landscape of the digital age.</p>
      <p>At Aayushman, we are driven by a commitment to excellence and client satisfaction.</p>
      <h3>Try Us for Free</h3>
      <form action="https://www.aayushmantech.com/company">
        <input name="first_name">
        <input name="last_name">
        <input name="phone">
        <input name="email">
        <input name="company">
        <button type="submit">Submit</button>
      </form>
    </main>
    <footer>
      <p>Email: Info@aayushmantechnologies.in</p>
      <p>Tel: +91 9930291005</p>
      <p>Address: B-5, Chandradarshan, Akurli X rd. No. 2, Kandivali East, Mumbai 101, India.</p>
      <p>&copy; 2025 by Aayushman Tech Services Pvt. Ltd.</p>
    </footer>
  </body>
</html>
`

const missingRouteHtml = ''

const loadAayushmanTechModule = async () => {
  try {
    return await import('../../scraper/aayushmantech/script.js')
  } catch {
    assert.fail('Expected Aayushman Tech scraper module at ../../scraper/aayushmantech/script.js')
  }
}

test('Aayushman Tech sentinel pins the verified first-party no-public-jobs surface from July 14, 2026', async () => {
  const aayushmanTech = await loadAayushmanTechModule()

  assert.equal(aayushmanTech.SOURCE, 'aayushmantech')
  assert.equal(aayushmanTech.COMPANY, 'Aayushman Tech')
  assert.equal(aayushmanTech.OFFICIAL_BRAND_NAME, 'Aayushman Technologies')
  assert.equal(aayushmanTech.LEGAL_ENTITY_NAME, 'Aayushman Tech Services Pvt. Ltd.')
  assert.equal(aayushmanTech.VERIFIED_ON, '2026-07-14')
  assert.equal(aayushmanTech.HOMEPAGE_URL, 'https://www.aayushmantech.com/')
  assert.equal(aayushmanTech.COMPANY_PAGE_URL, 'https://www.aayushmantech.com/company')
  assert.deepEqual(aayushmanTech.CAREERS_ROUTE_URLS, [
    'https://www.aayushmantech.com/careers',
    'https://www.aayushmantech.com/career',
    'https://www.aayushmantech.com/jobs',
    'https://www.aayushmantech.com/job',
    'https://www.aayushmantech.com/join-us',
    'https://www.aayushmantech.com/openings',
    'https://www.aayushmantech.com/work-with-us',
    'https://www.aayushmantech.com/hiring',
  ])
  assert.match(aayushmanTech.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)

  assert.equal(aayushmanTech.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(aayushmanTech.hasOfficialCompanyPageSignal(companyPageHtml), true)
  assert.equal(aayushmanTech.hasFirstPartyCareerLikeLink(homepageHtml), false)
  assert.equal(
    aayushmanTech.hasFirstPartyCareerLikeLink('<a href="https://www.aayushmantech.com/careers">Careers</a>'),
    true,
  )
  assert.equal(aayushmanTech.hasPublicJobsSignal(homepageHtml), false)
  assert.equal(
    aayushmanTech.hasPublicJobsSignal('<a href="https://jobs.lever.co/aayushmantech">Open positions</a>'),
    true,
  )
  assert.equal(
    aayushmanTech.isVerifiedMissingFirstPartyRoute({
      status: 404,
      url: aayushmanTech.CAREERS_ROUTE_URLS[0],
      html: missingRouteHtml,
    }),
    true,
  )
})

test('Aayushman Tech sentinel returns [] only while the verified first-party surface exposes no public jobs board', async () => {
  const aayushmanTech = await loadAayushmanTechModule()
  const requestedUrls = []

  const jobs = await aayushmanTech.createAayushmanTechScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === aayushmanTech.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === aayushmanTech.COMPANY_PAGE_URL) {
        return { status: 200, url, html: companyPageHtml }
      }

      if (aayushmanTech.CAREERS_ROUTE_URLS.includes(url)) {
        return { status: 404, url, html: missingRouteHtml }
      }

      throw new Error(`Unexpected Aayushman Tech URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    aayushmanTech.HOMEPAGE_URL,
    aayushmanTech.COMPANY_PAGE_URL,
    ...aayushmanTech.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Aayushman Tech sentinel fails closed when the verified first-party surface drifts into a public jobs surface', async () => {
  const aayushmanTech = await loadAayushmanTechModule()

  await assert.rejects(
    aayushmanTech.createAayushmanTechScraper().run({
      fetchPage: async (url) => {
        if (url === aayushmanTech.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: `${homepageHtml}<a href="https://www.aayushmantech.com/careers">Careers</a>`,
          }
        }

        throw new Error(`Unexpected Aayushman Tech URL: ${url}`)
      },
    }),
    /homepage now exposes a first-party careers or jobs link/i,
  )

  await assert.rejects(
    aayushmanTech.createAayushmanTechScraper().run({
      fetchPage: async (url) => {
        if (url === aayushmanTech.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aayushmanTech.COMPANY_PAGE_URL) {
          return {
            status: 200,
            url,
            html: `${companyPageHtml}<section><h2>Open positions</h2><a href="https://www.aayushmantech.com/jobs/software-engineer">Apply now</a></section>`,
          }
        }

        throw new Error(`Unexpected Aayushman Tech URL: ${url}`)
      },
    }),
    /company page now appears to expose a careers or jobs surface/i,
  )

  await assert.rejects(
    aayushmanTech.createAayushmanTechScraper().run({
      fetchPage: async (url) => {
        if (url === aayushmanTech.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }

        if (url === aayushmanTech.COMPANY_PAGE_URL) {
          return { status: 200, url, html: companyPageHtml }
        }

        if (url === aayushmanTech.CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Careers</h1><a href="https://jobs.lever.co/aayushmantech">Apply now</a></body></html>',
          }
        }

        return { status: 404, url, html: missingRouteHtml }
      },
    }),
    /careers route changed materially or now exposes public jobs/i,
  )
})
