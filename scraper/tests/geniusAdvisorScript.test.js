import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>The Genius Advisors | Homepage</title>
  </head>
  <body>
    <nav>
      <a href="index.html">Home</a>
      <a href="about.html">Who We Are?</a>
      <a href="services.html">What We Do?</a>
      <a href="insights.html">Insights</a>
      <a href="contact.html">Start a Conversation</a>
    </nav>
    <h1>Building Brands. Creating Value.</h1>
    <p>We help retail and consumer businesses build clarity, strong systems, and sustainable growth.</p>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>The Genius Advisors | About Us</title>
  </head>
  <body>
    <h1>Who We Are?</h1>
    <h2>Experience That Guides Real Growth.</h2>
    <p>The Genius Advisors is a founder-led advisory firm helping retail and consumer businesses build, transform, and grow.</p>
    <p>Jai M Bihani Founder &amp; Principal Advisor</p>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>The Genius Advisors | Contact Us</title>
  </head>
  <body>
    <h1>Get in Touch</h1>
    <p>Founder &amp; Principal Advisor</p>
    <p>Jai M Bihani</p>
    <p>Mumbai, India</p>
    <a href="mailto:hello@thegeniusadvisor.com">hello@thegeniusadvisor.com</a>
    <a href="tel:+919686204879">+91 96862 04879</a>
  </body>
</html>
`

const loadGeniusAdvisorModule = async () => {
  try {
    return await import('../geniusadvisor/script.js')
  } catch {
    assert.fail('Expected Genius Advisor scraper module at ../geniusadvisor/script.js')
  }
}

test('Genius Advisor scraper constants stay pinned to the verified first-party brochure surface', async () => {
  const geniusAdvisor = await loadGeniusAdvisorModule()

  assert.equal(geniusAdvisor.SOURCE, 'geniusadvisor')
  assert.equal(geniusAdvisor.COMPANY, 'Genius Advisor')
  assert.equal(geniusAdvisor.COMPANY_DOMAIN, 'thegeniusadvisor.in')
  assert.equal(geniusAdvisor.VERIFIED_AT, '2026-07-17')
  assert.deepEqual(geniusAdvisor.FIRST_PARTY_PAGE_URLS, [
    'https://www.thegeniusadvisor.in/',
    'https://www.thegeniusadvisor.in/about.html',
    'https://www.thegeniusadvisor.in/contact.html',
  ])
  assert.deepEqual(geniusAdvisor.FIRST_PARTY_CAREER_ROUTES, [
    'https://www.thegeniusadvisor.in/careers',
    'https://www.thegeniusadvisor.in/jobs',
    'https://www.thegeniusadvisor.in/join-us',
    'https://www.thegeniusadvisor.in/work-with-us',
    'https://www.thegeniusadvisor.in/openings',
  ])
  assert.equal(geniusAdvisor.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(geniusAdvisor.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(geniusAdvisor.hasOfficialContactSignal(contactHtml), true)
  assert.equal(
    geniusAdvisor.isExpectedTimedOutSurface({ errorKind: 'timeout', status: null, html: null }),
    true,
  )
  assert.equal(
    geniusAdvisor.isUnexpectedReachableSurface({
      status: 200,
      html: '<html><body><h1>Careers</h1><a href="/apply">Apply now</a></body></html>',
    }),
    true,
  )
})

test('Genius Advisor run verifies the trusted brochure pages and returns [] when adjacent careers routes stay timed out', async () => {
  const geniusAdvisor = await loadGeniusAdvisorModule()
  const requestedPages = []
  const requestedRoutes = []

  const jobs = await geniusAdvisor.createGeniusAdvisorScraper().run({
    fetchBrowserText: async (url) => {
      requestedPages.push(url)

      if (url === 'https://www.thegeniusadvisor.in/') return homepageHtml
      if (url === 'https://www.thegeniusadvisor.in/about.html') return aboutHtml
      if (url === 'https://www.thegeniusadvisor.in/contact.html') return contactHtml
      throw new Error(`Unexpected brochure URL: ${url}`)
    },
    probeUrl: async (url) => {
      requestedRoutes.push(url)
      return {
        url,
        finalUrl: url,
        status: null,
        html: null,
        errorKind: 'timeout',
      }
    },
  })

  assert.deepEqual(requestedPages, geniusAdvisor.FIRST_PARTY_PAGE_URLS)
  assert.deepEqual(requestedRoutes, geniusAdvisor.FIRST_PARTY_CAREER_ROUTES)
  assert.deepEqual(jobs, [])
})

test('Genius Advisor fails closed when a brochure page drifts or a public jobs surface becomes reachable', async () => {
  const geniusAdvisor = await loadGeniusAdvisorModule()

  await assert.rejects(
    geniusAdvisor.createGeniusAdvisorScraper().run({
      fetchBrowserText: async (url) => {
        if (url === 'https://www.thegeniusadvisor.in/') return homepageHtml
        if (url === 'https://www.thegeniusadvisor.in/about.html') return '<html><title>Unexpected</title></html>'
        if (url === 'https://www.thegeniusadvisor.in/contact.html') return contactHtml
        throw new Error(`Unexpected brochure URL: ${url}`)
      },
      probeUrl: async () => ({
        status: null,
        html: null,
        errorKind: 'timeout',
      }),
    }),
    /about page/i,
  )

  await assert.rejects(
    geniusAdvisor.createGeniusAdvisorScraper().run({
      fetchBrowserText: async (url) => {
        if (url === 'https://www.thegeniusadvisor.in/') return homepageHtml
        if (url === 'https://www.thegeniusadvisor.in/about.html') return aboutHtml
        if (url === 'https://www.thegeniusadvisor.in/contact.html') return contactHtml
        throw new Error(`Unexpected brochure URL: ${url}`)
      },
      probeUrl: async (url) => {
        if (url === 'https://www.thegeniusadvisor.in/careers') {
          return {
            url,
            finalUrl: url,
            status: 200,
            html: '<html><body><h1>Current Openings</h1><a href="/apply">Apply now</a></body></html>',
            errorKind: null,
          }
        }

        return {
          url,
          finalUrl: url,
          status: null,
          html: null,
          errorKind: 'timeout',
        }
      },
    }),
    /public jobs surface/i,
  )
})
