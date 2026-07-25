import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Loyal Wingman Technologies scraper module at ./script.js')
  }
}

const comingSoonHtml = `
<!doctype html>
<html>
<head>
  <meta http-equiv="X-UA-Compatible" content="chrome=1">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Coming Soon</title>
  <link rel="stylesheet" type="text/css" href="//assets.squarespace.com/universal/styles-compressed/parking-page-32145bd77d42b5ff-min.en-US.css">
</head>
<body class="loading align-content-center-vertical content">
  <div class="squarespace-logo">
    <a href="http://www.squarespace.com" target="_blank">
      <img src="//assets.squarespace.com/universal/images-v6/damask/logo-light.svg" />
    </a>
  </div>
  <div class="text-align-center">
    <h1>loyalwingman.ai</h1>
  </div>
  <div class="footer text-align-center">
    <p>We&apos;re under construction.<span class="line-break"> </span>Please check back for an update soon.</p>
  </div>
</body>
</html>
`

const privateSiteHtml = `
<!DOCTYPE HTML>
<html>
<head>
  <title>Private Site</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <meta name="robots" content="noindex">
  <script crossorigin="anonymous" src="//assets.squarespace.com/universal/scripts-compressed/system-page-8a5652fc738703ea-min.en-US.js"></script>
  <link rel="stylesheet" type="text/css" href="//assets.squarespace.com/universal/styles-compressed/system-page-7ab307ece9d3c3cb-min.en-US.css">
</head>
<body class="squarespace-config squarespace-system-page">
  <div class="minimal-logo">&nbsp;</div>
  <main>
    <h1>Private Site</h1>
    <p>This site is currently private. If you’re the owner or contributor, <a href="/config">log in</a>.</p>
  </main>
</body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
<head>
  <title>Careers | Loyal Wingman Technologies</title>
</head>
<body>
  <main>
    <h1>Current Openings</h1>
    <a href="https://jobs.lever.co/loyalwingman/software-engineer">Apply now</a>
  </main>
</body>
</html>
`

test('Loyal Wingman Technologies sentinel pins the verified placeholder first-party surface from July 13, 2026', async () => {
  const scraper = await loadModule()

  assert.equal(scraper.SOURCE, 'loyalwingmantechnologies')
  assert.equal(scraper.COMPANY, 'Loyal Wingman Technologies')
  assert.equal(scraper.VERIFIED_AT, '2026-07-13')
  assert.equal(scraper.HOMEPAGE_URL, 'https://loyalwingman.ai/')
  assert.equal(scraper.WWW_HOMEPAGE_URL, 'https://www.loyalwingman.ai/')
  assert.equal(scraper.ROBOTS_URL, 'https://loyalwingman.ai/robots.txt')
  assert.deepEqual(scraper.NO_PUBLIC_CAREERS_ROUTE_URLS, [
    'https://loyalwingman.ai/careers',
    'https://loyalwingman.ai/jobs',
    'https://loyalwingman.ai/join-us',
    'https://loyalwingman.ai/openings',
    'https://loyalwingman.ai/current-openings',
  ])

  assert.equal(scraper.hasVerifiedComingSoonSignal(comingSoonHtml), true)
  assert.equal(scraper.hasVerifiedPrivateSiteSignal(privateSiteHtml), true)
  assert.equal(scraper.hasPublicJobsSignal(comingSoonHtml), false)
  assert.equal(scraper.hasPublicJobsSignal(publicJobsHtml), true)
})

test('Loyal Wingman Technologies sentinel returns [] only while the verified placeholder surface remains unchanged', async () => {
  const scraper = await loadModule()
  const requestedUrls = []

  const jobs = await scraper.createLoyalWingmanTechnologiesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === scraper.HOMEPAGE_URL || url === scraper.WWW_HOMEPAGE_URL) {
        return comingSoonHtml
      }

      if (url === scraper.ROBOTS_URL) {
        return privateSiteHtml
      }

      if (scraper.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
        return comingSoonHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    scraper.HOMEPAGE_URL,
    scraper.WWW_HOMEPAGE_URL,
    scraper.ROBOTS_URL,
    ...scraper.NO_PUBLIC_CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Loyal Wingman Technologies sentinel fails closed when the placeholder contract drifts into a jobs surface', async () => {
  const scraper = await loadModule()

  await assert.rejects(
    scraper.createLoyalWingmanTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL) {
          return '<html><head><title>Loyal Wingman</title></head><body><h1>Loyal Wingman</h1></body></html>'
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /homepage no longer matches the verified placeholder surface/i,
  )

  await assert.rejects(
    scraper.createLoyalWingmanTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL || url === scraper.WWW_HOMEPAGE_URL) {
          return comingSoonHtml
        }

        if (url === scraper.ROBOTS_URL) {
          return '<html><head><title>robots.txt</title></head><body>User-agent: * Allow: /</body></html>'
        }

        if (scraper.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
          return comingSoonHtml
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /robots\.txt no longer matches the verified placeholder surface/i,
  )

  await assert.rejects(
    scraper.createLoyalWingmanTechnologiesScraper().run({
      fetchText: async (url) => {
        if (url === scraper.HOMEPAGE_URL || url === scraper.WWW_HOMEPAGE_URL) {
          return comingSoonHtml
        }

        if (url === scraper.ROBOTS_URL) {
          return privateSiteHtml
        }

        if (url === scraper.NO_PUBLIC_CAREERS_ROUTE_URLS[0]) {
          return publicJobsHtml
        }

        if (scraper.NO_PUBLIC_CAREERS_ROUTE_URLS.includes(url)) {
          return comingSoonHtml
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified no-public-careers route changed/i,
  )
})
