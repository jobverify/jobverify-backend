import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!doctype html>
<html>
  <head>
    <title>Dealshare</title>
  </head>
  <body>
    <a href="https://about.dealshare.in/">About Us</a>
    <a href="https://about.dealshare.in/">Careers</a>
    <a href="https://www.dealshare.in/store-locator">Visit Our Store</a>
    <p>support@dealshare.in</p>
    <p>We Deliver To Rajasthan West Bengal Delhi & NCR Uttar Pradesh</p>
    <p>Something went wrong... please try again later</p>
  </body>
</html>
`

const directAccessDeniedHtml = `
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
</Error>
`

const aboutHubHtml = `
<!doctype html>
<html>
  <head>
    <title>DealShare</title>
  </head>
  <body>
    <a href="/about">About</a>
    <a href="/careers">Careers</a>
    <a href="/media">Media</a>
    <a href="/contact">Contact</a>
    <h1>Mass Market for Mass India, Online</h1>
    <p>Watch Our Story</p>
    <p>Crafting extraordinarily simple tech solutions to help Bharat shop with ease</p>
    <p>Our Impact in numbers</p>
    <p>Build. Innovate. Create Value.</p>
  </body>
</html>
`

const careersSpaHtml = `
<!doctype html>
<html>
  <head>
    <title>DealShare</title>
  </head>
  <body>
    <a href="/about">About</a>
    <a href="/careers">Careers</a>
    <a href="/media">Media</a>
    <a href="/contact">Contact</a>
    <h1>Building everyday savings for India</h1>
    <p>Haq Se Bachao</p>
    <h2>Why DealShare</h2>
    <p>India deserves honest prices — every day</p>
    <h2>Our Culture</h2>
    <p>Flat Hierarchy</p>
    <h2>Growth & Innovation</h2>
    <p>Technology enables how we deliver value</p>
    <h2>PDA - Public Display of Appreciation</h2>
    <h2>Financial Benefits</h2>
    <p>From ESOPs to incentives and promotions, we are big on material expression of appreciation</p>
    <h2>Fast Paced</h2>
    <h2>Testimonials</h2>
    <h2>Contact</h2>
    <p>Bangalore</p>
    <p>E-mail: support@dealshare.in</p>
    <p>Jaipur</p>
    <p>Kolkata</p>
    <p>Gurgaon</p>
  </body>
</html>
`

const publicJobsCareersHtml = `
<!doctype html>
<html>
  <head>
    <title>DealShare Careers</title>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="https://jobs.lever.co/dealshare/software-engineer">Apply now</a>
  </body>
</html>
`

const loadDealShareModule = async () => {
  try {
    return await import('../dealshare/script.js')
  } catch {
    assert.fail('Expected DealShare scraper module at ../dealshare/script.js')
  }
}

test('DealShare sentinel constants stay pinned to the verified homepage, SPA careers route, and direct-route access denied state', async () => {
  const dealShare = await loadDealShareModule()

  assert.equal(dealShare.SOURCE, 'dealshare')
  assert.equal(dealShare.COMPANY, 'DealShare')
  assert.equal(dealShare.VERIFIED_ON, '2026-07-15')
  assert.equal(dealShare.HOMEPAGE_URL, 'https://www.dealshare.in/')
  assert.equal(dealShare.ABOUT_HUB_URL, 'https://about.dealshare.in/')
  assert.equal(dealShare.CAREERS_SPA_URL, 'https://about.dealshare.in/careers')
  assert.equal(dealShare.DIRECT_CAREERS_ROUTE_URL, 'https://about.dealshare.in/careers')
  assert.match(dealShare.VERIFIED_SURFACE_SUMMARY, /no trustworthy public jobs surface/i)
  assert.equal(dealShare.hasHomepageSignal(homepageHtml), true)
  assert.equal(
    dealShare.hasAccessDeniedDirectRouteSignal({
      status: 403,
      html: directAccessDeniedHtml,
    }),
    true,
  )
  assert.equal(dealShare.hasAboutHubSignal(aboutHubHtml), true)
  assert.equal(dealShare.hasCareersSpaNoJobsSignal(careersSpaHtml), true)
  assert.equal(dealShare.hasCareersSpaNoJobsSignal(publicJobsCareersHtml), false)
  assert.deepEqual(dealShare.extractSuspiciousJobLinks(careersSpaHtml), [])
  assert.deepEqual(
    dealShare.extractSuspiciousJobLinks(publicJobsCareersHtml),
    ['https://jobs.lever.co/dealshare/software-engineer'],
  )
})

test('DealShare sentinel returns [] only while the verified SPA careers content stays job-free and the direct route remains access denied', async () => {
  const dealShare = await loadDealShareModule()
  const requestedPages = []

  let stage = 'about'
  let currentUrl = dealShare.ABOUT_HUB_URL

  const fakePage = {
    goto: async (url) => {
      requestedPages.push(url)
      currentUrl = url
      stage = 'about'
    },
    waitForTimeout: async () => {},
    content: async () => (stage === 'careers' ? careersSpaHtml : aboutHubHtml),
    click: async (selector) => {
      if (!/careers/i.test(selector)) {
        throw new Error(`Unexpected click selector: ${selector}`)
      }
      stage = 'careers'
      currentUrl = dealShare.CAREERS_SPA_URL
    },
    url: () => currentUrl,
  }

  const jobs = await dealShare.createDealShareScraper().run({
    fetchPage: async (url) => {
      if (url === dealShare.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === dealShare.DIRECT_CAREERS_ROUTE_URL) {
        return { status: 403, url, html: directAccessDeniedHtml }
      }

      throw new Error(`Unexpected fetch URL: ${url}`)
    },
    launchBrowser: async () => ({
      close: async () => {},
    }),
    createOptimizedPage: async () => fakePage,
  })

  assert.deepEqual(requestedPages, [dealShare.ABOUT_HUB_URL])
  assert.deepEqual(jobs, [])
})

test('DealShare sentinel fails closed when the homepage, direct careers route, SPA about hub, or careers content drifts into a public jobs surface', async () => {
  const dealShare = await loadDealShareModule()

  await assert.rejects(
    dealShare.createDealShareScraper().run({
      fetchPage: async (url) => {
        if (url === dealShare.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }
        throw new Error('Should not fetch further')
      },
      launchBrowser: async () => ({ close: async () => {} }),
      createOptimizedPage: async () => ({}),
    }),
    /homepage no longer matches the verified public surface/i,
  )

  await assert.rejects(
    dealShare.createDealShareScraper().run({
      fetchPage: async (url) => {
        if (url === dealShare.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }
        if (url === dealShare.DIRECT_CAREERS_ROUTE_URL) {
          return { status: 200, url, html: careersSpaHtml }
        }
        throw new Error('Should not fetch further')
      },
      launchBrowser: async () => ({ close: async () => {} }),
      createOptimizedPage: async () => ({}),
    }),
    /direct careers route no longer matches the verified access-denied state/i,
  )

  let stage = 'about'
  let currentUrl = dealShare.ABOUT_HUB_URL
  const browserWithPublicCareers = {
    goto: async (url) => {
      currentUrl = url
      stage = 'about'
    },
    waitForTimeout: async () => {},
    content: async () => (stage === 'careers' ? publicJobsCareersHtml : aboutHubHtml),
    click: async () => {
      stage = 'careers'
      currentUrl = dealShare.CAREERS_SPA_URL
    },
    url: () => currentUrl,
  }

  await assert.rejects(
    dealShare.createDealShareScraper().run({
      fetchPage: async (url) => {
        if (url === dealShare.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }
        if (url === dealShare.DIRECT_CAREERS_ROUTE_URL) {
          return { status: 403, url, html: directAccessDeniedHtml }
        }
        throw new Error(`Unexpected fetch URL: ${url}`)
      },
      launchBrowser: async () => ({ close: async () => {} }),
      createOptimizedPage: async () => browserWithPublicCareers,
    }),
    /careers page no longer matches the verified no-openings surface|public jobs links/i,
  )

  const browserWithBrokenAbout = {
    goto: async (url) => {
      currentUrl = url
    },
    waitForTimeout: async () => {},
    content: async () => '<html><body><h1>Welcome</h1></body></html>',
    click: async () => {
      currentUrl = dealShare.CAREERS_SPA_URL
    },
    url: () => currentUrl,
  }

  await assert.rejects(
    dealShare.createDealShareScraper().run({
      fetchPage: async (url) => {
        if (url === dealShare.HOMEPAGE_URL) {
          return { status: 200, url, html: homepageHtml }
        }
        if (url === dealShare.DIRECT_CAREERS_ROUTE_URL) {
          return { status: 403, url, html: directAccessDeniedHtml }
        }
        throw new Error(`Unexpected fetch URL: ${url}`)
      },
      launchBrowser: async () => ({ close: async () => {} }),
      createOptimizedPage: async () => browserWithBrokenAbout,
    }),
    /about hub no longer matches the verified public surface/i,
  )
})
