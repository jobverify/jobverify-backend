import assert from 'node:assert/strict'
import test from 'node:test'

const ABOUT_PAGE_URL = 'https://www.ironmountain.com/about-us'
const CAREERS_URL = 'https://ironmountain.jobs/'
const JOBS_SITEMAP_URL = 'https://ironmountain.jobs/sitemaps/jobs_1.xml'

const aboutPageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Discover who we are | Iron Mountain United States</title>
      <meta name="careers-board-domain" content="ironmountain.jobs" />
    </head>
    <body>
      <main>
        <h1>About Iron Mountain</h1>
        <nav>
          <a href="https://www.ironmountain.com/en-in">India</a>
          <a href="/company/about/careers">Careers</a>
        </nav>
        <p>We protect what our customers value most.</p>
      </main>
    </body>
  </html>
`

const jobsBoardHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Home | Iron Mountain</title>
    </head>
    <body>
      <main>
        <h1>Search jobs</h1>
      </main>
      <script>
        window.__NUXT__ = {};
        window.__NUXT__.config = {
          public: {
            "job-folder": "ironmountain-jobs",
            source: "solr",
            "x-origin": "ironmountain.jobs"
          }
        };
      </script>
    </body>
  </html>
`

const jobDetailShellHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Job | Iron Mountain</title>
    </head>
    <body>
      <script>
        window.__NUXT__ = {};
        window.__NUXT__.config = {
          public: {
            "job-folder": "ironmountain-jobs",
            source: "solr",
            "x-origin": "ironmountain.jobs"
          }
        };
      </script>
      <script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false" id="__NUXT_DATA__">[{"prerenderedAt":1,"serverRendered":2},1782489944046,false]</script>
    </body>
  </html>
`

const currentJobDetailShellHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title></title>
    </head>
    <body>
      <script>
        window.__NUXT__ = {};
        window.__NUXT__.config = {
          public: {
            "job-folder": "ironmountain-jobs",
            source: "solr",
            "x-origin": "ironmountain.jobs"
          }
        };
      </script>
      <script type="application/json" data-nuxt-data="nuxt-app" data-ssr="false" id="__NUXT_DATA__">[{"prerenderedAt":1,"serverRendered":2},1782489944046,false]</script>
    </body>
  </html>
`

const vercelSecurityCheckpointHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Vercel Security Checkpoint</title>
    </head>
    <body>
      <main>
        <h1>Vercel Security Checkpoint</h1>
      </main>
    </body>
  </html>
`

const sitemapXml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/</loc>
      <lastmod>2026-07-12</lastmod>
    </url>
    <url>
      <loc>https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/</loc>
      <lastmod>2026-07-12</lastmod>
    </url>
    <url>
      <loc>https://ironmountain.jobs/newark-nj/manager-labor-strategy-engagement-remote/00935A83E8214967BD9C20834DB0F820/job/</loc>
      <lastmod>2026-07-12</lastmod>
    </url>
  </urlset>
`

const loadIronMountainIndiaModule = async () => {
  try {
    return await import('../../scraper/ironmountainindia/script.js')
  } catch {
    assert.fail('Expected Iron Mountain India scraper module at ../../scraper/ironmountainindia/script.js')
  }
}

test('Iron Mountain India pins the verified first-party careers handoff and sitemap helpers', async () => {
  const ironMountainIndia = await loadIronMountainIndiaModule()

  assert.equal(ironMountainIndia.SOURCE, 'ironmountainindia')
  assert.equal(ironMountainIndia.COMPANY_NAME, 'Iron Mountain India')
  assert.equal(ironMountainIndia.OFFICIAL_BRAND_NAME, 'Iron Mountain')
  assert.equal(ironMountainIndia.HOMEPAGE_URL, 'https://www.ironmountain.com/en-in')
  assert.equal(ironMountainIndia.ABOUT_PAGE_URL, ABOUT_PAGE_URL)
  assert.equal(ironMountainIndia.CAREERS_URL, CAREERS_URL)
  assert.equal(ironMountainIndia.JOBS_SITEMAP_URL, JOBS_SITEMAP_URL)
  assert.equal(ironMountainIndia.VERIFIED_ON, '2026-08-03')
  assert.equal(ironMountainIndia.hasOfficialAboutPageCareersSignal(aboutPageHtml), true)
  assert.equal(ironMountainIndia.hasOfficialAboutPageCareersSignal('<html><title>About Another Company</title></html>'), false)
  assert.equal(ironMountainIndia.hasOfficialJobsBoardSignal(jobsBoardHtml), true)
  assert.equal(ironMountainIndia.hasOfficialJobsBoardSignal('<html><title>Jobs</title></html>'), false)
  assert.equal(ironMountainIndia.hasVercelSecurityCheckpointSignal(vercelSecurityCheckpointHtml), true)
  assert.deepEqual(ironMountainIndia.extractSitemapEntries(sitemapXml), [
    {
      url: 'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
      lastmod: '2026-07-12',
    },
    {
      url: 'https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/',
      lastmod: '2026-07-12',
    },
    {
      url: 'https://ironmountain.jobs/newark-nj/manager-labor-strategy-engagement-remote/00935A83E8214967BD9C20834DB0F820/job/',
      lastmod: '2026-07-12',
    },
  ])
  assert.equal(
    ironMountainIndia.isIndiaJobUrl('https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/'),
    true,
  )
  assert.equal(
    ironMountainIndia.isIndiaJobUrl('https://ironmountain.jobs/newark-nj/manager-labor-strategy-engagement-remote/00935A83E8214967BD9C20834DB0F820/job/'),
    false,
  )
  assert.equal(ironMountainIndia.humanizeTitleSlug('business-development-manager-psu'), 'Business Development Manager PSU')
  assert.equal(ironMountainIndia.formatIndiaLocationFromSlug('navi-mumbai-ind'), 'Navi Mumbai, India')
})

test('mapSitemapEntryToJob converts public India sitemap URLs into normalized jobs', async () => {
  const ironMountainIndia = await loadIronMountainIndiaModule()

  assert.deepEqual(
    ironMountainIndia.mapSitemapEntryToJob({
      url: 'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
      lastmod: '2026-07-12',
    }),
    {
      title: 'Business Development Manager PSU',
      company: 'Iron Mountain India',
      department: null,
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: 'CA3B2FE418DD4D93BA414E6E9A0A9EE8',
      requisitionId: 'CA3B2FE418DD4D93BA414E6E9A0A9EE8',
      sourceUrl: 'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
      applyUrl: 'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-12',
      closingDate: null,
      jobDescription: null,
    },
  )
})

test('Iron Mountain India run validates the official handoff, filters to India URLs, and decorates jobs', async () => {
  const ironMountainIndia = await loadIronMountainIndiaModule()
  const requestedUrls = []

  const jobs = await ironMountainIndia.createIronMountainIndiaScraper({
    now: () => '2026-07-16T09:30:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === ABOUT_PAGE_URL) return aboutPageHtml
      if (url === CAREERS_URL) return jobsBoardHtml
      if (url === JOBS_SITEMAP_URL) return sitemapXml
      if (/^https:\/\/ironmountain\.jobs\/.+\/job\/$/i.test(url)) return jobDetailShellHtml
      throw new Error(`Unexpected Iron Mountain India fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ABOUT_PAGE_URL,
    CAREERS_URL,
    JOBS_SITEMAP_URL,
    'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
    'https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/',
  ])
  assert.deepEqual(jobs, [
    {
      title: 'Business Development Manager PSU',
      company: 'Iron Mountain India',
      department: null,
      location: 'Mumbai, India',
      city: 'Mumbai',
      country: 'India',
      jobId: 'CA3B2FE418DD4D93BA414E6E9A0A9EE8',
      requisitionId: 'CA3B2FE418DD4D93BA414E6E9A0A9EE8',
      sourceUrl: 'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
      applyUrl: 'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-12',
      closingDate: null,
      jobDescription: null,
      publicExperienceChecked: true,
      link: 'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
      source: 'ironmountainindia',
      scrapedAt: '2026-07-16T09:30:00.000Z',
    },
    {
      title: 'Information Security Lead',
      company: 'Iron Mountain India',
      department: null,
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '20AC18A6C9E94DC496CD2CF69B073684',
      requisitionId: '20AC18A6C9E94DC496CD2CF69B073684',
      sourceUrl: 'https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/',
      applyUrl: 'https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-12',
      closingDate: null,
      jobDescription: null,
      publicExperienceChecked: true,
      link: 'https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/',
      source: 'ironmountainindia',
      scrapedAt: '2026-07-16T09:30:00.000Z',
    },
  ])
})

test('Iron Mountain India fails closed when the about page or jobs board drifts away from the verified surface', async () => {
  const ironMountainIndia = await loadIronMountainIndiaModule()

  await assert.rejects(
    ironMountainIndia.createIronMountainIndiaScraper().run({
      fetchText: async (url) => {
        if (url === ABOUT_PAGE_URL) return '<html><title>About Another Company</title></html>'
        if (url === CAREERS_URL) return jobsBoardHtml
        if (url === JOBS_SITEMAP_URL) return sitemapXml
        throw new Error(`Unexpected Iron Mountain India fixture URL: ${url}`)
      },
    }),
    /about page/i,
  )

  await assert.rejects(
    ironMountainIndia.createIronMountainIndiaScraper().run({
      fetchText: async (url) => {
        if (url === ABOUT_PAGE_URL) return aboutPageHtml
        if (url === CAREERS_URL) return '<html><title>Jobs</title></html>'
        if (url === JOBS_SITEMAP_URL) return sitemapXml
        throw new Error(`Unexpected Iron Mountain India fixture URL: ${url}`)
      },
    }),
    /jobs board/i,
  )
})

test('Iron Mountain India can recover with browser-backed first-party HTML when direct requests are rate-limited', async () => {
  const ironMountainIndia = await loadIronMountainIndiaModule()
  const attempts = []

  const jobs = await ironMountainIndia.createIronMountainIndiaScraper({
    now: () => '2026-07-16T09:30:00.000Z',
  }).run({
    fetchText: async (url) => {
      attempts.push(`http:${url}`)
      if (url === JOBS_SITEMAP_URL) return sitemapXml
      throw new Error(`HTTP 429 for ${url}`)
    },
    fetchBrowserText: async (url) => {
      attempts.push(`browser:${url}`)
      if (url === ABOUT_PAGE_URL) return aboutPageHtml
      if (url === CAREERS_URL) return jobsBoardHtml
      if (/^https:\/\/ironmountain\.jobs\/.+\/job\/$/i.test(url)) return jobDetailShellHtml
      throw new Error(`Unexpected Iron Mountain India browser URL: ${url}`)
    },
  })

  assert.deepEqual(attempts, [
    `http:${ABOUT_PAGE_URL}`,
    `browser:${ABOUT_PAGE_URL}`,
    `http:${CAREERS_URL}`,
    `browser:${CAREERS_URL}`,
    `http:${JOBS_SITEMAP_URL}`,
    `http:https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/`,
    `browser:https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/`,
    `http:https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/`,
    `browser:https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/`,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'ironmountainindia')
})

test('Iron Mountain India also runs when the first-party about page is Vercel-checkpointed but the NLX board stays public', async () => {
  const ironMountainIndia = await loadIronMountainIndiaModule()
  const requestedUrls = []

  const jobs = await ironMountainIndia.createIronMountainIndiaScraper({
    now: () => '2026-08-13T18:30:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === ABOUT_PAGE_URL) {
        return { status: 429, url, html: vercelSecurityCheckpointHtml }
      }

      if (url === CAREERS_URL) {
        return { status: 200, url, html: jobsBoardHtml }
      }

      if (url === JOBS_SITEMAP_URL) {
        return { status: 200, url, html: sitemapXml }
      }

      if (/^https:\/\/ironmountain\.jobs\/.+\/job\/$/i.test(url)) {
        return { status: 200, url, html: currentJobDetailShellHtml }
      }

      throw new Error(`Unexpected Iron Mountain India fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ABOUT_PAGE_URL,
    CAREERS_URL,
    JOBS_SITEMAP_URL,
    'https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/',
    'https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].scrapedAt, '2026-08-13T18:30:00.000Z')
})

test('Iron Mountain India also falls back to browser-backed HTML when direct requests time out', async () => {
  const ironMountainIndia = await loadIronMountainIndiaModule()
  const attempts = []

  const jobs = await ironMountainIndia.createIronMountainIndiaScraper({
    now: () => '2026-08-02T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      attempts.push(`http:${url}`)
      throw new TypeError(`fetch failed | Connect Timeout Error for ${url}`)
    },
    fetchBrowserText: async (url) => {
      attempts.push(`browser:${url}`)
      if (url === ABOUT_PAGE_URL) return aboutPageHtml
      if (url === CAREERS_URL) return jobsBoardHtml
      if (url === JOBS_SITEMAP_URL) return sitemapXml
      if (/^https:\/\/ironmountain\.jobs\/.+\/job\/$/i.test(url)) return jobDetailShellHtml
      throw new Error(`Unexpected Iron Mountain India browser URL: ${url}`)
    },
  })

  assert.deepEqual(attempts, [
    `http:${ABOUT_PAGE_URL}`,
    `browser:${ABOUT_PAGE_URL}`,
    `http:${CAREERS_URL}`,
    `browser:${CAREERS_URL}`,
    `http:${JOBS_SITEMAP_URL}`,
    `browser:${JOBS_SITEMAP_URL}`,
    `http:https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/`,
    `browser:https://ironmountain.jobs/mumbai-ind/business-development-manager-psu/CA3B2FE418DD4D93BA414E6E9A0A9EE8/job/`,
    `http:https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/`,
    `browser:https://ironmountain.jobs/bangalore-ind/information-security-lead/20AC18A6C9E94DC496CD2CF69B073684/job/`,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'ironmountainindia')
})
