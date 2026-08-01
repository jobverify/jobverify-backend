import assert from 'node:assert/strict'
import test from 'node:test'

const careersPageHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Careers at Kaseya | Open Positions &amp; Job Opportunities</title>
  </head>
  <body>
    <section>
      <h2>Attention</h2>
      <p>All legitimate Kaseya communications come from @kaseya.com email addresses only.</p>
      <p>If you&rsquo;re unsure about any offer, please contact talentacquisition@kaseya.com to verify.</p>
    </section>
    <section>
      <h2>OUR HUBS</h2>
      <h3>India</h3>
      <p>Exciting career opportunities await you at our Bengaluru campus.</p>
      <a href="https://www.kaseya.com/jobs-sitemap.xml">Jobs sitemap</a>
    </section>
  </body>
</html>
`

const jobsSitemapXml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.kaseya.com/careers/jobs/id/6015830004/</loc>
    <lastmod>2026-07-16T21:11:14+00:00</lastmod>
  </url>
  <url>
    <loc>https://www.kaseya.com/careers/jobs/id/6018550004/</loc>
    <lastmod>2026-07-16T21:11:14+00:00</lastmod>
  </url>
  <url>
    <loc>https://www.kaseya.com/careers/jobs/id/6014445004/</loc>
    <lastmod>2026-07-16T21:11:14+00:00</lastmod>
  </url>
  <url>
    <loc>https://www.kaseya.com/blog/</loc>
  </url>
</urlset>
`

const puneJobHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Staff Software Engineer - Pune at Kaseya - (Job ID #6015830004)</title>
    <link rel="canonical" href="https://www.kaseya.com/careers/jobs/id/6015830004/">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "identifier": {
          "@type": "PropertyValue",
          "name": "Job ID",
          "value": "6015830004"
        },
        "datePosted": "2026-06-22T08:29:48-04:00",
        "employmentType": "full-time",
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Pune",
            "addressCountry": "India"
          }
        }
      }
    </script>
  </head>
  <body>
    <main id="main">
      <section id="jobs-banner" class="py-3 py-md-7 bg-light">
        <div class="h5 text-uppercase mb-0">Pune, India</div>
        <h1 class="display-4 font-weight-bold mb-4">Staff Software Engineer</h1>
        <a href="#application-form">Apply Now</a>
      </section>
      <section class="py-5">
        <div class="content-intro">
          <p><strong>About Kaseya</strong></p>
          <p>Kaseya builds AI-powered IT management and cybersecurity software.</p>
        </div>
        <h2><u>Job Summary</u></h2>
        <p>Lead the design and delivery of secure, scalable enterprise software systems.</p>
        <h2><u>Role &amp; Responsibilities</u></h2>
        <ul>
          <li>Own architecture decisions across engineering teams.</li>
        </ul>
      </section>
      <div id="application-form">Apply form</div>
    </main>
  </body>
</html>
`

const bangaloreJobHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Technical Support Engineer - Bangalore at Kaseya - (Job ID #6018550004)</title>
    <link rel="canonical" href="https://www.kaseya.com/careers/jobs/id/6018550004/">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "identifier": {
          "@type": "PropertyValue",
          "name": "Job ID",
          "value": "6018550004"
        },
        "datePosted": "2026-07-09T08:29:48-04:00",
        "employmentType": "full-time",
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Bangalore",
            "addressCountry": "India"
          }
        }
      }
    </script>
  </head>
  <body>
    <main id="main">
      <section id="jobs-banner" class="py-3 py-md-7 bg-light">
        <div class="h5 text-uppercase mb-0">Bangalore, India</div>
        <h1 class="display-4 font-weight-bold mb-4">Technical Support Engineer</h1>
        <a href="#application-form">Apply Now</a>
      </section>
      <section class="py-5">
        <p>To enhance our global support team, we are hiring a Technical Support Engineer – L1.</p>
        <h2><u>Required Skills</u></h2>
        <ul>
          <li>Windows, macOS, and troubleshooting fundamentals.</li>
        </ul>
      </section>
      <div id="application-form">Apply form</div>
    </main>
  </body>
</html>
`

const torontoJobHtml = `
<!doctype html>
<html lang="en-US">
  <head>
    <title>Staff Software Engineer - Toronto at Kaseya - (Job ID #6014445004)</title>
    <link rel="canonical" href="https://www.kaseya.com/careers/jobs/id/6014445004/">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "identifier": {
          "@type": "PropertyValue",
          "name": "Job ID",
          "value": "6014445004"
        },
        "datePosted": "2026-07-01T08:29:48-04:00",
        "employmentType": "full-time",
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Toronto",
            "addressCountry": "Canada"
          }
        }
      }
    </script>
  </head>
  <body>
    <main id="main">
      <section id="jobs-banner" class="py-3 py-md-7 bg-light">
        <div class="h5 text-uppercase mb-0">Toronto, Canada</div>
        <h1 class="display-4 font-weight-bold mb-4">Staff Software Engineer</h1>
      </section>
      <section class="py-5">
        <p>Build and scale Kaseya&apos;s identity platform.</p>
      </section>
      <div id="application-form">Apply form</div>
    </main>
  </body>
</html>
`

const loadKaseyaIndiaModule = async () => {
  try {
    return await import('../../scraper/kaseyaindia/script.js')
  } catch {
    assert.fail('Expected Kaseya India scraper module at ../../scraper/kaseyaindia/script.js')
  }
}

test('Kaseya India scraper constants and helpers stay pinned to the verified first-party careers and sitemap surfaces', async () => {
  const kaseyaIndia = await loadKaseyaIndiaModule()

  assert.equal(kaseyaIndia.SOURCE, 'kaseyaindia')
  assert.equal(kaseyaIndia.COMPANY, 'Kaseya India')
  assert.equal(kaseyaIndia.OFFICIAL_BRAND_NAME, 'Kaseya')
  assert.equal(kaseyaIndia.HOMEPAGE_URL, 'https://www.kaseya.com/careers/')
  assert.equal(kaseyaIndia.CAREERS_URL, 'https://www.kaseya.com/careers/jobs/')
  assert.equal(kaseyaIndia.JOBS_SITEMAP_URL, 'https://www.kaseya.com/jobs-sitemap.xml')
  assert.equal(kaseyaIndia.COMPANY_DOMAIN, 'kaseya.com')
  assert.equal(kaseyaIndia.VERIFIED_ON, '2026-07-16')

  assert.equal(kaseyaIndia.hasVerifiedCareersPageSignal(careersPageHtml), true)
  assert.deepEqual(
    kaseyaIndia.extractJobDetailUrlsFromSitemap(jobsSitemapXml),
    [
      'https://www.kaseya.com/careers/jobs/id/6015830004/',
      'https://www.kaseya.com/careers/jobs/id/6018550004/',
      'https://www.kaseya.com/careers/jobs/id/6014445004/',
    ],
  )
  assert.equal(kaseyaIndia.isIndiaLocation('Pune, India'), true)
  assert.equal(kaseyaIndia.isIndiaLocation('Bangalore, India'), true)
  assert.equal(kaseyaIndia.isIndiaLocation('Toronto, Canada'), false)

  const puneJob = kaseyaIndia.mapDetailPageToJob({
    url: 'https://www.kaseya.com/careers/jobs/id/6015830004/',
    html: puneJobHtml,
    scrapedAt: '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(puneJob, {
    title: 'Staff Software Engineer',
    company: 'Kaseya India',
    department: null,
    location: 'Pune, India',
    city: 'Pune',
    country: 'India',
    jobId: '6015830004',
    requisitionId: '6015830004',
    sourceUrl: 'https://www.kaseya.com/careers/jobs/id/6015830004/',
    applyUrl: 'https://www.kaseya.com/careers/jobs/id/6015830004/',
    employmentType: 'full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-22',
    closingDate: null,
    jobDescription:
      'About Kaseya Kaseya builds AI-powered IT management and cybersecurity software. Job Summary Lead the design and delivery of secure, scalable enterprise software systems. Role & Responsibilities Own architecture decisions across engineering teams.',
    source: 'kaseyaindia',
    link: 'https://www.kaseya.com/careers/jobs/id/6015830004/',
    scrapedAt: '2026-07-16T00:00:00.000Z',
  })

  assert.equal(
    kaseyaIndia.mapDetailPageToJob({
      url: 'https://www.kaseya.com/careers/jobs/id/6014445004/',
      html: torontoJobHtml,
      scrapedAt: '2026-07-16T00:00:00.000Z',
    }),
    null,
  )
})

test('Kaseya India run validates the verified first-party careers page, walks the jobs sitemap, and keeps only India roles', async () => {
  const kaseyaIndia = await loadKaseyaIndiaModule()
  const requestedUrls = []

  const jobs = await kaseyaIndia.createKaseyaIndiaScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === kaseyaIndia.CAREERS_URL) return careersPageHtml
      if (url === kaseyaIndia.JOBS_SITEMAP_URL) return jobsSitemapXml
      if (url === 'https://www.kaseya.com/careers/jobs/id/6015830004/') return puneJobHtml
      if (url === 'https://www.kaseya.com/careers/jobs/id/6018550004/') return bangaloreJobHtml
      if (url === 'https://www.kaseya.com/careers/jobs/id/6014445004/') return torontoJobHtml

      throw new Error(`Unexpected Kaseya India URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    kaseyaIndia.CAREERS_URL,
    kaseyaIndia.JOBS_SITEMAP_URL,
    'https://www.kaseya.com/careers/jobs/id/6015830004/',
    'https://www.kaseya.com/careers/jobs/id/6018550004/',
    'https://www.kaseya.com/careers/jobs/id/6014445004/',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      postingDate: job.postingDate,
      applyUrl: job.applyUrl,
    })),
    [
      {
        title: 'Staff Software Engineer',
        location: 'Pune, India',
        postingDate: '2026-06-22',
        applyUrl: 'https://www.kaseya.com/careers/jobs/id/6015830004/',
      },
      {
        title: 'Technical Support Engineer',
        location: 'Bangalore, India',
        postingDate: '2026-07-09',
        applyUrl: 'https://www.kaseya.com/careers/jobs/id/6018550004/',
      },
    ],
  )
})

test('Kaseya India fails closed when the first-party careers page, sitemap, or job detail surface drifts', async () => {
  const kaseyaIndia = await loadKaseyaIndiaModule()

  await assert.rejects(
    kaseyaIndia.createKaseyaIndiaScraper().run({
      fetchText: async () => '<html><body>Missing verified careers surface</body></html>',
    }),
    /careers page/i,
  )

  await assert.rejects(
    kaseyaIndia.createKaseyaIndiaScraper().run({
      fetchText: async (url) => {
        if (url === kaseyaIndia.CAREERS_URL) return careersPageHtml
        if (url === kaseyaIndia.JOBS_SITEMAP_URL) return '<urlset></urlset>'
        throw new Error(`Unexpected Kaseya India URL: ${url}`)
      },
    }),
    /jobs sitemap/i,
  )

  await assert.rejects(
    kaseyaIndia.createKaseyaIndiaScraper().run({
      fetchText: async (url) => {
        if (url === kaseyaIndia.CAREERS_URL) return careersPageHtml
        if (url === kaseyaIndia.JOBS_SITEMAP_URL) return jobsSitemapXml
        if (url === 'https://www.kaseya.com/careers/jobs/id/6015830004/') {
          return '<html><body><h1>Broken page</h1></body></html>'
        }
        if (url === 'https://www.kaseya.com/careers/jobs/id/6018550004/') return bangaloreJobHtml
        if (url === 'https://www.kaseya.com/careers/jobs/id/6014445004/') return torontoJobHtml
        throw new Error(`Unexpected Kaseya India URL: ${url}`)
      },
    }),
    /job detail page/i,
  )
})
