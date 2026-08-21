import assert from 'node:assert/strict'
import test from 'node:test'

const verifiedHomepageHtml = `
  <html>
    <head>
      <title>Allcargo Logistics</title>
      <link rel="canonical" href="https://www.allcargologistics.com/" />
    </head>
    <body>
      <h1>AllcargoGATI: India's Premier Express Distribution and Supply Chain Solutions</h1>
      <p>Driven by Precision and Experience</p>
      <a href="https://www.allcargologistics.com/about-us/careers">Careers</a>
    </body>
  </html>
`

const verifiedCareersHtml = `
  <html>
    <head>
      <title>Careers At Allcargo Logistics</title>
      <link rel="canonical" href="https://www.allcargologistics.com/about-us/careers" />
    </head>
    <body>
      <div>AllCargo Gati</div>
      <h1>Spotting future logistics leaders, now</h1>
      <a href="https://allcargologistics.darwinbox.in/ms/candidatev2/main/careers/home">Join Our Team</a>
      <a href="https://allcargologistics.darwinbox.in/ms/candidatev2/main/careers/home">Explore job openings today!</a>
    </body>
  </html>
`

const brokenTenantResponse = {
  status: 500,
  body: '{"status":"error","data":{"message":"Internal Server Error - Invalid subdomain: gatikwe"}}',
}

const loadGatiModule = async () => {
  try {
    return await import('../../scraper/gati/script.js')
  } catch {
    assert.fail('Expected Gati scraper module at ../../scraper/gati/script.js')
  }
}

test('Gati scraper pins the verified redirecting homepage, parent careers page, and broken Darwinbox tenant', async () => {
  const gati = await loadGatiModule()

  assert.equal(gati.SOURCE, 'gati')
  assert.equal(gati.COMPANY_NAME, 'Gati')
  assert.equal(gati.HOMEPAGE_URL, 'https://www.gati.com/')
  assert.equal(gati.REDIRECT_HOMEPAGE_URL, 'https://www.allcargologistics.com/')
  assert.equal(gati.CAREERS_PAGE_URL, 'https://www.allcargologistics.com/about-us/careers')
  assert.equal(gati.DARWINBOX_HANDOFF_URL, 'https://allcargologistics.darwinbox.in/ms/candidatev2/main/careers/home')
  assert.equal(
    gati.LISTING_API_URL,
    'https://gatikwe.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  )

  assert.equal(gati.extractCareersPageUrl(verifiedHomepageHtml), gati.CAREERS_PAGE_URL)
  assert.equal(
    gati.hasOfficialHomepageSignal({
      status: 200,
      url: gati.REDIRECT_HOMEPAGE_URL,
      html: verifiedHomepageHtml,
    }),
    true,
  )
  assert.equal(gati.extractOfficialDarwinboxUrl(verifiedCareersHtml), gati.DARWINBOX_HANDOFF_URL)
  assert.equal(gati.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.equal(gati.hasBrokenDarwinboxTenantSignal(brokenTenantResponse), true)
})

test('Gati run returns no jobs while the verified public surface still lands on the broken Darwinbox tenant', async () => {
  const gati = await loadGatiModule()
  const requestedUrls = []
  const probedUrls = []

  const jobs = await gati.createGatiScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === gati.HOMEPAGE_URL) {
        return {
          status: 200,
          url: gati.REDIRECT_HOMEPAGE_URL,
          html: verifiedHomepageHtml,
        }
      }

      if (url === gati.CAREERS_PAGE_URL) {
        return {
          status: 200,
          url,
          html: verifiedCareersHtml,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    probeListingApi: async (url) => {
      probedUrls.push(url)
      return brokenTenantResponse
    },
  })

  assert.deepEqual(requestedUrls, [
    gati.HOMEPAGE_URL,
    gati.CAREERS_PAGE_URL,
  ])
  assert.deepEqual(probedUrls, [gati.LISTING_API_URL])
  assert.deepEqual(jobs, [])
})

test('Gati fails closed when the verified homepage, careers shell, or Darwinbox tenant drifts', async () => {
  const gati = await loadGatiModule()

  await assert.rejects(
    gati.createGatiScraper().run({
      fetchPage: async (url) => {
        if (url === gati.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: '<html><body><h1>Unexpected</h1></body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified gati homepage/i,
  )

  await assert.rejects(
    gati.createGatiScraper().run({
      fetchPage: async (url) => {
        if (url === gati.HOMEPAGE_URL) {
          return {
            status: 200,
            url: gati.REDIRECT_HOMEPAGE_URL,
            html: verifiedHomepageHtml,
          }
        }

        if (url === gati.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: verifiedCareersHtml.replace(gati.DARWINBOX_HANDOFF_URL, 'https://example.com/jobs'),
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /verified parent careers page/i,
  )

  await assert.rejects(
    gati.createGatiScraper().run({
      fetchPage: async (url) => {
        if (url === gati.HOMEPAGE_URL) {
          return {
            status: 200,
            url: gati.REDIRECT_HOMEPAGE_URL,
            html: verifiedHomepageHtml,
          }
        }

        if (url === gati.CAREERS_PAGE_URL) {
          return {
            status: 200,
            url,
            html: verifiedCareersHtml,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
      probeListingApi: async () => ({
        status: 200,
        body: '{"data":[]}',
      }),
    }),
    /broken darwinbox tenant state/i,
  )
})
