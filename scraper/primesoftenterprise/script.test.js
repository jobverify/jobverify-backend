import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedBlockedHomepageHtml = `
<!DOCTYPE html>
<html style="height:100%">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
<title> 403 Forbidden
</title>
</head>
<body>
<div>
<h1>403</h1>
<h2>Forbidden</h2>
<p>Access to this resource on the server is denied!</p>
</div>
</body>
</html>
`

const verifiedMissingCareersHtml = `
<!DOCTYPE html>
<html>
<head>
<title>This Page Does Not Exist</title>
</head>
<body>
<div class="page-not-found">
<div class="title">This Page Does Not Exist</div>
<div class="text">
Sorry, the page you are looking for could not be found. It's just an accident that was not intentional.
</div>
</div>
</body>
</html>
`

const loadPrimesoftEnterpriseModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected Primesoft Enterprise scraper module at ./script.js')
  }
}

test('Primesoft Enterprise sentinel recognizes the verified blocked homepage and absent careers routes', async () => {
  const primesoft = await loadPrimesoftEnterpriseModule()

  assert.equal(primesoft.SOURCE, 'primesoftenterprise')
  assert.equal(primesoft.COMPANY, 'Primesoft Enterprise')
  assert.equal(primesoft.HOMEPAGE_URL, 'https://www.primesoftindia.com/')
  assert.deepEqual(primesoft.CAREERS_ROUTE_URLS, [
    'https://www.primesoftindia.com/careers',
    'https://www.primesoftindia.com/careers/',
    'https://www.primesoftindia.com/career',
    'https://www.primesoftindia.com/career/',
    'https://www.primesoftindia.com/jobs',
    'https://www.primesoftindia.com/jobs/',
    'https://www.primesoftindia.com/join-us',
    'https://www.primesoftindia.com/join-us/',
    'https://www.primesoftindia.com/current-openings',
    'https://www.primesoftindia.com/current-openings/',
  ])

  assert.equal(
    primesoft.isVerifiedBlockedHomepage({
      status: 403,
      url: primesoft.HOMEPAGE_URL,
      headers: {
        server: 'LiteSpeed',
        platform: 'hostinger',
        panel: 'hpanel',
      },
      html: verifiedBlockedHomepageHtml,
    }),
    true,
  )

  assert.equal(primesoft.hasPublicJobsSignal(verifiedBlockedHomepageHtml), false)
  assert.equal(
    primesoft.isVerifiedAbsentCareersRoute({
      status: 404,
      url: primesoft.CAREERS_ROUTE_URLS[0],
      headers: {},
      html: verifiedMissingCareersHtml,
    }),
    true,
  )
})

test('Primesoft Enterprise sentinel returns no jobs only while the verified blocked root and absent careers routes remain unchanged', async () => {
  const primesoft = await loadPrimesoftEnterpriseModule()
  const requestedUrls = []

  const jobs = await primesoft.createPrimesoftEnterpriseScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === primesoft.HOMEPAGE_URL) {
        return {
          status: 403,
          url,
          headers: {
            server: 'LiteSpeed',
            platform: 'hostinger',
            panel: 'hpanel',
          },
          html: verifiedBlockedHomepageHtml,
        }
      }

      if (primesoft.CAREERS_ROUTE_URLS.includes(url)) {
        return {
          status: 404,
          url,
          headers: {},
          html: verifiedMissingCareersHtml,
        }
      }

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    primesoft.HOMEPAGE_URL,
    ...primesoft.CAREERS_ROUTE_URLS,
  ])
  assert.deepEqual(jobs, [])
})

test('Primesoft Enterprise sentinel fails closed when the homepage or careers-route contract changes', async () => {
  const primesoft = await loadPrimesoftEnterpriseModule()

  await assert.rejects(
    primesoft.createPrimesoftEnterpriseScraper().run({
      fetchPage: async (url) => {
        if (url === primesoft.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><body><h1>Unexpected homepage</h1></body></html>',
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: verifiedMissingCareersHtml,
        }
      },
    }),
    /blocked homepage contract|verified homepage/i,
  )

  await assert.rejects(
    primesoft.createPrimesoftEnterpriseScraper().run({
      fetchPage: async (url) => {
        if (url === primesoft.HOMEPAGE_URL) {
          return {
            status: 403,
            url,
            headers: {
              server: 'LiteSpeed',
              platform: 'hostinger',
              panel: 'hpanel',
            },
            html: verifiedBlockedHomepageHtml,
          }
        }

        if (url === primesoft.CAREERS_ROUTE_URLS[0]) {
          return {
            status: 200,
            url,
            headers: {},
            html: '<html><body><h1>Careers</h1><a href="/jobs/software-engineer">Apply now</a></body></html>',
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: verifiedMissingCareersHtml,
        }
      },
    }),
    /careers routes changed materially or now expose public jobs/i,
  )

  await assert.rejects(
    primesoft.createPrimesoftEnterpriseScraper().run({
      fetchPage: async (url) => {
        if (url === primesoft.HOMEPAGE_URL) {
          return {
            status: 403,
            url,
            headers: {
              server: 'LiteSpeed',
              platform: 'hostinger',
              panel: 'hpanel',
            },
            html: verifiedBlockedHomepageHtml.replace(
              '</body>',
              '<a href="https://jobs.ashbyhq.com/primesoftenterprise">Current Openings</a></body>',
            ),
          }
        }

        return {
          status: 404,
          url,
          headers: {},
          html: verifiedMissingCareersHtml,
        }
      },
    }),
    /public jobs surface/i,
  )
})
