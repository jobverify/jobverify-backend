import assert from 'node:assert/strict'
import test from 'node:test'

const rootShellHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="build-version" content="2026-07-14-19:36:42">
    <title>EMBIBE - The most powerful AI-powered learning platform</title>
    <meta
      name="description"
      content="Achieve your best every time with EMBIBE. For CBSE, ICSE, IB, State Boards, JEE, NEET, BITSAT, AIIMS, Banking, Insurance, Railways, SSC, Defence, UPSC & more."
    >
  </head>
  <body>
    <div id="app"></div>
    <script src="/static/js/main.a08cb8de.chunk.js"></script>
  </body>
</html>
`

const marketingHomepageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Home - EMBIBE - The most powerful AI-powered learning platform</title>
    <link rel="canonical" href="https://www.embibe.com/in-en/home/">
  </head>
  <body>
    <h1>Embibe Is A Global Innovator</h1>
    <p>AI Powered Learning Solution Provider</p>
    <a href="https://www.embibe.com/in-en/joinus/">Join Us</a>
  </body>
</html>
`

const contactPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Contact Us - EMBIBE - The most powerful AI-powered learning platform</title>
    <link rel="canonical" href="https://www.embibe.com/in-en/contactus/">
  </head>
  <body>
    <h1>We might be reaching for the stars, but we'll always be right here for you.</h1>
    <a href="mailto:support@embibe.com">support@embibe.com</a>
    <a href="tel:18002572961">18002572961 (Toll Free)</a>
    <p>Diamond District, EMBIBE (Indiavidual Learning Limited)</p>
    <a href="https://www.embibe.com/in-en/joinus/">Join Us</a>
  </body>
</html>
`

const joinUsPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <meta name="robots" content="noindex, nofollow">
    <title>Join Us - EMBIBE - The most powerful AI-powered learning platform</title>
    <meta property="og:url" content="https://www.embibe.com/in-en/joinus/">
  </head>
  <body>
    <h1>Join Us</h1>
    <p>EMBIBE is the world’s first edtech company that truly delivers learning and life outcomes.</p>
    <p>If your heart beats for education and you want to be part of a revolution, you probably have a place here.</p>
    <a href="https://embibe.darwinbox.in/ms/candidate/careers">Explore openings</a>
    <a href="https://www.embibe.com/in-en/joinus/discovery-brief/">Discovery Brief</a>
  </body>
</html>
`

const joinUsApiPayload = {
  slug: 'joinus',
  link: 'https://www.embibe.com/in-en/joinus/',
  template: 'template-joinus.php',
  content: {
    rendered: `
      <p>EMBIBE is the world’s first edtech company that truly delivers learning and life outcomes.</p>
      <p>If your heart beats for education and you want to be part of a revolution, you probably have a place here.</p>
    `,
  },
  yoast_head: `
    <title>Join Us - EMBIBE - The most powerful AI-powered learning platform</title>
    <meta name="robots" content="noindex, nofollow" />
  `,
}

const sitemapIndexXml = `
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.embibe.com/in-en/page-sitemap.xml</loc></sitemap>
  <sitemap><loc>https://www.embibe.com/in-en/help-sitemap.xml</loc></sitemap>
</sitemapindex>
`

const pageSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.embibe.com/in-en/</loc></url>
  <url><loc>https://www.embibe.com/in-en/home/</loc></url>
  <url><loc>https://www.embibe.com/in-en/contactus/</loc></url>
  <url><loc>https://www.embibe.com/in-en/vulnerability-disclosure-program/</loc></url>
</urlset>
`

const emptyDarwinboxShellHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <title>Indiavidual Learning Limited (Embibe)</title>
    <meta property="og:title" content="Indiavidual Learning Limited (Embibe) ">
    <meta
      property="og:image"
      content="https://s3.ap-south-1.amazonaws.com/darwinbox-data-prod-mum/INSTANCE4_609aaf5abf6f4_222/logo/a75101209645361b299f2a__tenant-avatar-222_674078522.png"
    >
  </head>
  <body>
    Indiavidual Learning Limited (Embibe) -
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Embibe Careers</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"JobPosting","title":"ML Engineer"}
    </script>
  </head>
  <body>
    <h1>Current Openings</h1>
    <a href="https://embibe.darwinbox.in/ms/candidatev2/main/careers/allJobs">Apply now</a>
  </body>
</html>
`

const loadEmbibeModule = async () => {
  try {
    return await import('../../scraper/embibe/script.js')
  } catch {
    assert.fail('Expected Embibe scraper module at ../../scraper/embibe/script.js')
  }
}

test('Embibe scraper helpers stay pinned to the verified first-party join-us page and empty Darwinbox shell', async () => {
  const embibe = await loadEmbibeModule()

  assert.equal(embibe.SOURCE, 'embibe')
  assert.equal(embibe.COMPANY, 'Embibe')
  assert.equal(embibe.OFFICIAL_BRAND_NAME, 'Indiavidual Learning Limited (Embibe)')
  assert.equal(embibe.VERIFIED_ON, '2026-07-15')
  assert.equal(embibe.ROOT_URL, 'https://www.embibe.com/')
  assert.equal(embibe.ROOT_CAREERS_URL, 'https://www.embibe.com/careers')
  assert.equal(embibe.HOMEPAGE_URL, 'https://www.embibe.com/in-en/home/')
  assert.equal(embibe.CONTACT_PAGE_URL, 'https://www.embibe.com/in-en/contactus/')
  assert.equal(embibe.JOIN_US_PAGE_URL, 'https://www.embibe.com/in-en/joinus/')
  assert.equal(embibe.JOIN_US_API_URL, 'https://www.embibe.com/in-en/wp-json/wp/v2/pages/483')
  assert.equal(embibe.SITEMAP_INDEX_URL, 'https://www.embibe.com/in-en/sitemap_index.xml')
  assert.equal(embibe.PAGE_SITEMAP_URL, 'https://www.embibe.com/in-en/page-sitemap.xml')
  assert.deepEqual(embibe.DARWINBOX_EMPTY_ROUTE_URLS, [
    'https://embibe.darwinbox.in/ms/candidate/careers',
    'https://embibe.darwinbox.in/ms/candidate/careers/jobs',
    'https://embibe.darwinbox.in/ms/candidate/careers/allJobs',
  ])
  assert.equal(embibe.hasRootSiteShellSignal(rootShellHtml), true)
  assert.equal(embibe.hasOfficialMarketingHomepageSignal(marketingHomepageHtml), true)
  assert.equal(embibe.hasOfficialContactPageSignal(contactPageHtml), true)
  assert.deepEqual(embibe.extractDarwinboxHandoffUrls(joinUsPageHtml), [
    'https://embibe.darwinbox.in/ms/candidate/careers',
  ])
  assert.equal(embibe.hasJoinUsPageSignal(joinUsPageHtml), true)
  assert.equal(embibe.hasJoinUsApiSignal(joinUsApiPayload), true)
  assert.equal(embibe.hasExpectedSitemapIndexSignal(sitemapIndexXml), true)
  assert.equal(embibe.hasExpectedPageSitemapSignal(pageSitemapXml), true)
  assert.deepEqual(embibe.extractCareerLikeUrlsFromPageSitemap(pageSitemapXml), [])
  assert.equal(embibe.hasEmptyDarwinboxShellSignal(emptyDarwinboxShellHtml), true)
  assert.equal(embibe.hasPublicJobsSignal(emptyDarwinboxShellHtml), false)
  assert.equal(embibe.hasPublicJobsSignal(publicJobsHtml), true)
})

test('Embibe returns [] only while the verified first-party join-us page and Darwinbox handoff remain empty shells', async () => {
  const embibe = await loadEmbibeModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await embibe.createEmbibeScraper().run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === embibe.ROOT_URL || url === embibe.ROOT_CAREERS_URL) {
        return { status: 200, url, html: rootShellHtml }
      }

      if (url === embibe.HOMEPAGE_URL) {
        return { status: 200, url, html: marketingHomepageHtml }
      }

      if (url === embibe.CONTACT_PAGE_URL) {
        return { status: 200, url, html: contactPageHtml }
      }

      if (url === embibe.JOIN_US_PAGE_URL) {
        return { status: 200, url, html: joinUsPageHtml }
      }

      if (url === embibe.SITEMAP_INDEX_URL) {
        return { status: 200, url, html: sitemapIndexXml }
      }

      if (url === embibe.PAGE_SITEMAP_URL) {
        return { status: 200, url, html: pageSitemapXml }
      }

      if (embibe.DARWINBOX_EMPTY_ROUTE_URLS.includes(url)) {
        return { status: 200, url, html: emptyDarwinboxShellHtml }
      }

      throw new Error(`Unexpected Embibe page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)

      if (url === embibe.JOIN_US_API_URL) {
        return joinUsApiPayload
      }

      throw new Error(`Unexpected Embibe JSON URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [
    embibe.ROOT_URL,
    embibe.ROOT_CAREERS_URL,
    embibe.HOMEPAGE_URL,
    embibe.CONTACT_PAGE_URL,
    embibe.JOIN_US_PAGE_URL,
    embibe.SITEMAP_INDEX_URL,
    embibe.PAGE_SITEMAP_URL,
    ...embibe.DARWINBOX_EMPTY_ROUTE_URLS,
  ])
  assert.deepEqual(requestedJson, [embibe.JOIN_US_API_URL])
  assert.deepEqual(jobs, [])
})

test('Embibe fails closed when the verified root shell, join-us page, sitemap, or Darwinbox handoff starts exposing public jobs', async () => {
  const embibe = await loadEmbibeModule()

  await assert.rejects(
    embibe.createEmbibeScraper().run({
      fetchPage: async (url) => {
        if (url === embibe.ROOT_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Embibe page URL: ${url}`)
      },
    }),
    /verified root homepage shell/i,
  )

  await assert.rejects(
    embibe.createEmbibeScraper().run({
      fetchPage: async (url) => {
        if (url === embibe.ROOT_URL || url === embibe.ROOT_CAREERS_URL) {
          return { status: 200, url, html: rootShellHtml }
        }

        if (url === embibe.HOMEPAGE_URL) {
          return { status: 200, url, html: marketingHomepageHtml }
        }

        if (url === embibe.CONTACT_PAGE_URL) {
          return { status: 200, url, html: contactPageHtml }
        }

        if (url === embibe.JOIN_US_PAGE_URL) {
          return { status: 200, url, html: publicJobsHtml }
        }

        throw new Error(`Unexpected Embibe page URL: ${url}`)
      },
      fetchJson: async () => joinUsApiPayload,
    }),
    /join us page no longer matches/i,
  )

  await assert.rejects(
    embibe.createEmbibeScraper().run({
      fetchPage: async (url) => {
        if (url === embibe.ROOT_URL || url === embibe.ROOT_CAREERS_URL) {
          return { status: 200, url, html: rootShellHtml }
        }

        if (url === embibe.HOMEPAGE_URL) {
          return { status: 200, url, html: marketingHomepageHtml }
        }

        if (url === embibe.CONTACT_PAGE_URL) {
          return { status: 200, url, html: contactPageHtml }
        }

        if (url === embibe.JOIN_US_PAGE_URL) {
          return { status: 200, url, html: joinUsPageHtml }
        }

        if (url === embibe.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === embibe.PAGE_SITEMAP_URL) {
          return {
            status: 200,
            url,
            html: `${pageSitemapXml}<url><loc>https://www.embibe.com/in-en/careers/</loc></url>`,
          }
        }

        throw new Error(`Unexpected Embibe page URL: ${url}`)
      },
      fetchJson: async () => joinUsApiPayload,
    }),
    /page sitemap career surface changed/i,
  )

  await assert.rejects(
    embibe.createEmbibeScraper().run({
      fetchPage: async (url) => {
        if (url === embibe.ROOT_URL || url === embibe.ROOT_CAREERS_URL) {
          return { status: 200, url, html: rootShellHtml }
        }

        if (url === embibe.HOMEPAGE_URL) {
          return { status: 200, url, html: marketingHomepageHtml }
        }

        if (url === embibe.CONTACT_PAGE_URL) {
          return { status: 200, url, html: contactPageHtml }
        }

        if (url === embibe.JOIN_US_PAGE_URL) {
          return { status: 200, url, html: joinUsPageHtml }
        }

        if (url === embibe.SITEMAP_INDEX_URL) {
          return { status: 200, url, html: sitemapIndexXml }
        }

        if (url === embibe.PAGE_SITEMAP_URL) {
          return { status: 200, url, html: pageSitemapXml }
        }

        if (url === embibe.DARWINBOX_EMPTY_ROUTE_URLS[0]) {
          return { status: 200, url, html: publicJobsHtml }
        }

        if (embibe.DARWINBOX_EMPTY_ROUTE_URLS.slice(1).includes(url)) {
          return { status: 200, url, html: emptyDarwinboxShellHtml }
        }

        throw new Error(`Unexpected Embibe page URL: ${url}`)
      },
      fetchJson: async () => joinUsApiPayload,
    }),
    /darwinbox shell changed/i,
  )
})
